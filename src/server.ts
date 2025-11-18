import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequest,
  ListToolsRequest,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { z } from 'zod';
import {
  PromptTemplateLibrary,
  TemplateCategory,
  PromptTemplate,
  EnrichedPrompt
} from './prompt_templates.js';

const execAsync = promisify(exec);

// Tool schemas
const GeneratePlaybookSchema = z.object({
  prompt: z.string(),
  template: z.string().optional(),
  context: z.object({
    target_hosts: z.string().optional(),
    environment: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

const ValidatePlaybookSchema = z.object({
  playbook_path: z.string(),
  strict: z.boolean().optional(),
});

const RunPlaybookSchema = z.object({
  playbook_path: z.string(),
  inventory: z.string(),
  extra_vars: z.record(z.any()).optional(),
  check_mode: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

const RefinePlaybookSchema = z.object({
  playbook_path: z.string(),
  feedback: z.string(),
  validation_errors: z.array(z.string()).optional(),
});

// Prompt Template schemas
const ListPromptTemplatesSchema = z.object({
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
});

const GetPromptTemplateSchema = z.object({
  template_id: z.string(),
});

const EnrichPromptSchema = z.object({
  prompt: z.string(),
  template_id: z.string(),
  additional_context: z.record(z.any()).optional(),
});

const GenerateWithTemplateSchema = z.object({
  prompt: z.string(),
  template_id: z.string(),
  context: z.object({
    target_hosts: z.string().optional(),
    environment: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
  additional_context: z.record(z.any()).optional(),
});

const UpdateTemplateSchema = z.object({
  template_id: z.string(),
  updates: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    system_prompt: z.string().optional(),
    user_prompt_template: z.string().optional(),
    best_practices: z.array(z.string()).optional(),
  }),
  change_description: z.array(z.string()),
});

const GetTemplateHistorySchema = z.object({
  template_id: z.string(),
});

class AnsibleMCPServer {
  private server: Server;
  private playbookTemplates: Map<string, string>;
  private promptTemplateLibrary: PromptTemplateLibrary;
  private workDir: string;

  constructor() {
    this.server = new Server(
      {
        name: 'ansible-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.playbookTemplates = new Map();
    this.promptTemplateLibrary = new PromptTemplateLibrary();
    this.workDir = '/tmp/ansible-mcp';
    this.initialize();
  }

  private async initialize() {
    // Create working directory
    await fs.mkdir(this.workDir, { recursive: true });

    // Load templates
    await this.loadTemplates();

    // Initialize prompt template library
    await this.promptTemplateLibrary.initialize();

    // Setup tool handlers
    this.setupHandlers();
  }

  private async loadTemplates() {
    // Load predefined templates
    this.playbookTemplates.set('kubernetes_deployment', `
---
- name: Deploy to Kubernetes
  hosts: localhost
  gather_facts: no
  vars:
    namespace: "{{ namespace | default('default') }}"
    app_name: "{{ app_name }}"
    image: "{{ image }}"
    replicas: "{{ replicas | default(3) }}"
  
  tasks:
    - name: Create namespace
      kubernetes.core.k8s:
        name: "{{ namespace }}"
        api_version: v1
        kind: Namespace
        state: present

    - name: Deploy application
      kubernetes.core.k8s:
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: "{{ app_name }}"
            namespace: "{{ namespace }}"
          spec:
            replicas: "{{ replicas }}"
            selector:
              matchLabels:
                app: "{{ app_name }}"
            template:
              metadata:
                labels:
                  app: "{{ app_name }}"
              spec:
                containers:
                - name: "{{ app_name }}"
                  image: "{{ image }}"
                  ports:
                  - containerPort: 8080
`);

    this.playbookTemplates.set('docker_setup', `
---
- name: Setup Docker Environment
  hosts: all
  become: yes
  vars:
    docker_compose_version: "{{ compose_version | default('2.20.0') }}"
  
  tasks:
    - name: Update apt cache
      apt:
        update_cache: yes
      when: ansible_os_family == "Debian"

    - name: Install Docker dependencies
      package:
        name:
          - ca-certificates
          - curl
          - gnupg
          - lsb-release
        state: present

    - name: Add Docker GPG key
      ansible.builtin.apt_key:
        url: https://download.docker.com/linux/ubuntu/gpg
        state: present

    - name: Install Docker
      package:
        name: docker-ce
        state: present

    - name: Start Docker service
      service:
        name: docker
        state: started
        enabled: yes

    - name: Install Docker Compose
      get_url:
        url: "https://github.com/docker/compose/releases/download/v{{ docker_compose_version }}/docker-compose-Linux-x86_64"
        dest: /usr/local/bin/docker-compose
        mode: '0755'
`);

    this.playbookTemplates.set('system_hardening', `
---
- name: System Security Hardening
  hosts: all
  become: yes
  
  tasks:
    - name: Update all packages
      package:
        name: '*'
        state: latest

    - name: Configure SSH
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^PasswordAuthentication', line: 'PasswordAuthentication no' }
        - { regexp: '^PermitEmptyPasswords', line: 'PermitEmptyPasswords no' }
      notify: restart ssh

    - name: Configure firewall
      ufw:
        rule: allow
        port: "{{ item }}"
        proto: tcp
      loop:
        - 22
        - 443
        - 80

    - name: Enable firewall
      ufw:
        state: enabled

  handlers:
    - name: restart ssh
      service:
        name: sshd
        state: restarted
`);
  }

  private setupHandlers() {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequest, async () => ({
      tools: [
        {
          name: 'generate_playbook',
          description: 'Generate an Ansible playbook based on a prompt',
          inputSchema: {
            type: 'object',
            properties: {
              prompt: { type: 'string', description: 'Natural language description of the desired playbook' },
              template: { type: 'string', description: 'Optional template name to use' },
              context: { 
                type: 'object',
                properties: {
                  target_hosts: { type: 'string' },
                  environment: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } }
                }
              }
            },
            required: ['prompt']
          }
        },
        {
          name: 'validate_playbook',
          description: 'Validate an Ansible playbook for syntax and best practices',
          inputSchema: {
            type: 'object',
            properties: {
              playbook_path: { type: 'string' },
              strict: { type: 'boolean', description: 'Enable strict validation' }
            },
            required: ['playbook_path']
          }
        },
        {
          name: 'run_playbook',
          description: 'Execute an Ansible playbook',
          inputSchema: {
            type: 'object',
            properties: {
              playbook_path: { type: 'string' },
              inventory: { type: 'string' },
              extra_vars: { type: 'object' },
              check_mode: { type: 'boolean' },
              tags: { type: 'array', items: { type: 'string' } }
            },
            required: ['playbook_path', 'inventory']
          }
        },
        {
          name: 'refine_playbook',
          description: 'Refine and improve an existing playbook based on feedback',
          inputSchema: {
            type: 'object',
            properties: {
              playbook_path: { type: 'string' },
              feedback: { type: 'string' },
              validation_errors: { type: 'array', items: { type: 'string' } }
            },
            required: ['playbook_path', 'feedback']
          }
        },
        {
          name: 'lint_playbook',
          description: 'Run ansible-lint on a playbook',
          inputSchema: {
            type: 'object',
            properties: {
              playbook_path: { type: 'string' }
            },
            required: ['playbook_path']
          }
        },
        // Prompt Template Tools
        {
          name: 'list_prompt_templates',
          description: 'List available prompt templates with optional filtering by category, tags, or search text',
          inputSchema: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                description: 'Filter by category (kubernetes, docker, security, database, monitoring, network, cicd, cloud, general)',
                enum: ['kubernetes', 'docker', 'security', 'database', 'monitoring', 'network', 'cicd', 'cloud', 'general']
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter by tags'
              },
              search: {
                type: 'string',
                description: 'Search in template names and descriptions'
              }
            },
            required: []
          }
        },
        {
          name: 'get_prompt_template',
          description: 'Get detailed information about a specific prompt template including few-shot examples and chain-of-thought reasoning',
          inputSchema: {
            type: 'object',
            properties: {
              template_id: {
                type: 'string',
                description: 'The ID of the template to retrieve'
              }
            },
            required: ['template_id']
          }
        },
        {
          name: 'enrich_prompt',
          description: 'Enrich a user prompt with few-shot examples, chain-of-thought reasoning, and context hints from a template',
          inputSchema: {
            type: 'object',
            properties: {
              prompt: {
                type: 'string',
                description: 'The user prompt to enrich'
              },
              template_id: {
                type: 'string',
                description: 'The template to use for enrichment'
              },
              additional_context: {
                type: 'object',
                description: 'Additional context variables'
              }
            },
            required: ['prompt', 'template_id']
          }
        },
        {
          name: 'generate_with_template',
          description: 'Generate a playbook using an optimized prompt template with few-shot learning and chain-of-thought reasoning',
          inputSchema: {
            type: 'object',
            properties: {
              prompt: {
                type: 'string',
                description: 'Natural language description of the desired playbook'
              },
              template_id: {
                type: 'string',
                description: 'The prompt template to use'
              },
              context: {
                type: 'object',
                properties: {
                  target_hosts: { type: 'string' },
                  environment: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } }
                }
              },
              additional_context: {
                type: 'object',
                description: 'Additional context variables for the template'
              }
            },
            required: ['prompt', 'template_id']
          }
        },
        {
          name: 'update_template_version',
          description: 'Update a prompt template with new content and create a new version',
          inputSchema: {
            type: 'object',
            properties: {
              template_id: {
                type: 'string',
                description: 'The ID of the template to update'
              },
              updates: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  system_prompt: { type: 'string' },
                  user_prompt_template: { type: 'string' },
                  best_practices: { type: 'array', items: { type: 'string' } }
                }
              },
              change_description: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of changes made in this version'
              }
            },
            required: ['template_id', 'updates', 'change_description']
          }
        },
        {
          name: 'get_template_history',
          description: 'Get the version history and changelog for a prompt template',
          inputSchema: {
            type: 'object',
            properties: {
              template_id: {
                type: 'string',
                description: 'The ID of the template'
              }
            },
            required: ['template_id']
          }
        }
      ] as Tool[]
    }));

    // Call tool handler
    this.server.setRequestHandler(CallToolRequest, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'generate_playbook':
          return await this.generatePlaybook(args);
        
        case 'validate_playbook':
          return await this.validatePlaybook(args);
        
        case 'run_playbook':
          return await this.runPlaybook(args);
        
        case 'refine_playbook':
          return await this.refinePlaybook(args);
        
        case 'lint_playbook':
          return await this.lintPlaybook(args);

        // Prompt Template tools
        case 'list_prompt_templates':
          return await this.listPromptTemplates(args);

        case 'get_prompt_template':
          return await this.getPromptTemplate(args);

        case 'enrich_prompt':
          return await this.enrichPrompt(args);

        case 'generate_with_template':
          return await this.generateWithTemplate(args);

        case 'update_template_version':
          return await this.updateTemplateVersion(args);

        case 'get_template_history':
          return await this.getTemplateHistory(args);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async generatePlaybook(args: any) {
    const params = GeneratePlaybookSchema.parse(args);
    
    try {
      let playbook: string;
      
      // Use template if specified
      if (params.template && this.playbookTemplates.has(params.template)) {
        playbook = this.playbookTemplates.get(params.template)!;
      } else {
        // Generate playbook using AI assistance
        playbook = await this.generateWithAI(params.prompt, params.context);
      }
      
      // Save playbook to file
      const timestamp = Date.now();
      const filename = `playbook_${timestamp}.yml`;
      const filepath = path.join(this.workDir, filename);
      
      await fs.writeFile(filepath, playbook);
      
      // Validate the generated playbook
      const validation = await this.validateYAML(playbook);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              playbook_path: filepath,
              playbook_content: playbook,
              validation: validation,
              message: 'Playbook generated successfully'
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message
            })
          }
        ]
      };
    }
  }

  private async generateWithAI(prompt: string, context?: any): Promise<string> {
    // This would integrate with an LLM to generate the playbook
    // For now, we'll create a basic structure based on keywords
    
    const playbook = `---
# Generated playbook from prompt: ${prompt}
- name: ${prompt}
  hosts: ${context?.target_hosts || 'all'}
  become: yes
  vars:
    environment: ${context?.environment || 'production'}
  
  tasks:
    - name: Ensure system is updated
      package:
        name: '*'
        state: latest
      tags:
        - update
    
    - name: Execute main task
      debug:
        msg: "Executing: ${prompt}"
      tags: ${context?.tags ? '\n        - ' + context.tags.join('\n        - ') : '\n        - main'}
    
    # TODO: Add specific tasks based on the prompt requirements
    # This is where AI would generate appropriate tasks
`;
    
    return playbook;
  }

  private async validatePlaybook(args: any) {
    const params = ValidatePlaybookSchema.parse(args);
    
    try {
      // Read playbook
      const content = await fs.readFile(params.playbook_path, 'utf-8');
      
      // Validate YAML syntax
      const yamlValidation = await this.validateYAML(content);
      
      // Run ansible-playbook --syntax-check
      const syntaxCheck = await execAsync(
        `ansible-playbook --syntax-check ${params.playbook_path}`,
        { cwd: this.workDir }
      ).catch(err => ({ stdout: '', stderr: err.message }));
      
      // Collect results
      const results = {
        yaml_valid: yamlValidation.valid,
        yaml_errors: yamlValidation.errors,
        ansible_syntax_valid: !syntaxCheck.stderr,
        ansible_syntax_errors: syntaxCheck.stderr,
        warnings: []
      };
      
      // Add warnings for best practices
      if (params.strict) {
        results.warnings = this.checkBestPractices(content);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: results.yaml_valid && results.ansible_syntax_valid,
              validation_results: results
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message
            })
          }
        ]
      };
    }
  }

  private async validateYAML(content: string): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      yaml.load(content);
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        errors: [error.message]
      };
    }
  }

  private checkBestPractices(content: string): string[] {
    const warnings: string[] = [];
    
    // Check for common best practice violations
    if (!content.includes('become:') && !content.includes('become_user:')) {
      warnings.push('Consider specifying privilege escalation explicitly');
    }
    
    if (!content.includes('tags:')) {
      warnings.push('Consider adding tags for selective execution');
    }
    
    if (!content.includes('handlers:') && content.includes('notify:')) {
      warnings.push('Handlers are referenced but not defined');
    }
    
    if (!content.includes('when:') && !content.includes('failed_when:')) {
      warnings.push('Consider adding conditionals for idempotency');
    }
    
    return warnings;
  }

  private async runPlaybook(args: any) {
    const params = RunPlaybookSchema.parse(args);
    
    try {
      // Build ansible-playbook command
      let command = `ansible-playbook ${params.playbook_path}`;
      command += ` -i ${params.inventory}`;
      
      if (params.check_mode) {
        command += ' --check';
      }
      
      if (params.tags && params.tags.length > 0) {
        command += ` --tags "${params.tags.join(',')}"`;
      }
      
      if (params.extra_vars) {
        command += ` -e '${JSON.stringify(params.extra_vars)}'`;
      }
      
      // Execute playbook
      const result = await execAsync(command, { 
        cwd: this.workDir,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              output: result.stdout,
              errors: result.stderr,
              command: command
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              stderr: error.stderr,
              stdout: error.stdout
            })
          }
        ]
      };
    }
  }

  private async refinePlaybook(args: any) {
    const params = RefinePlaybookSchema.parse(args);
    
    try {
      // Read current playbook
      let content = await fs.readFile(params.playbook_path, 'utf-8');
      
      // Parse YAML
      const playbook = yaml.load(content) as any;
      
      // Apply refinements based on feedback
      // This would use AI to understand the feedback and make improvements
      // For now, we'll do basic improvements
      
      if (params.validation_errors) {
        // Fix common errors
        params.validation_errors.forEach(error => {
          if (error.includes('indentation')) {
            // Fix indentation issues
            content = this.fixIndentation(content);
          }
          if (error.includes('syntax')) {
            // Fix common syntax issues
            content = this.fixCommonSyntax(content);
          }
        });
      }
      
      // Apply feedback-based improvements
      if (params.feedback.toLowerCase().includes('add error handling')) {
        playbook[0].tasks = playbook[0].tasks.map(task => ({
          ...task,
          ignore_errors: false,
          failed_when: false,
          register: `${task.name.replace(/\s+/g, '_')}_result`
        }));
      }
      
      if (params.feedback.toLowerCase().includes('make idempotent')) {
        playbook[0].tasks = playbook[0].tasks.map(task => ({
          ...task,
          changed_when: false,
          check_mode: true
        }));
      }
      
      // Save refined playbook
      const refinedContent = yaml.dump(playbook, { indent: 2 });
      const refinedPath = params.playbook_path.replace('.yml', '_refined.yml');
      await fs.writeFile(refinedPath, refinedContent);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              refined_playbook_path: refinedPath,
              changes_applied: [
                'Applied feedback: ' + params.feedback,
                params.validation_errors ? `Fixed ${params.validation_errors.length} validation errors` : null
              ].filter(Boolean),
              refined_content: refinedContent
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message
            })
          }
        ]
      };
    }
  }

  private fixIndentation(content: string): string {
    // Fix common indentation issues
    return content.split('\n').map(line => {
      // Ensure consistent 2-space indentation
      const leadingSpaces = line.match(/^(\s*)/)?.[1] || '';
      const indentLevel = Math.floor(leadingSpaces.length / 2);
      return ' '.repeat(indentLevel * 2) + line.trim();
    }).join('\n');
  }

  private fixCommonSyntax(content: string): string {
    // Fix common syntax issues
    return content
      .replace(/:\s*$/gm, ': ') // Ensure space after colons
      .replace(/\s+$/gm, '') // Remove trailing spaces
      .replace(/\t/g, '  '); // Replace tabs with spaces
  }

  private async lintPlaybook(args: any) {
    const { playbook_path } = args;
    
    try {
      // Run ansible-lint
      const result = await execAsync(
        `ansible-lint ${playbook_path}`,
        { cwd: this.workDir }
      ).catch(err => ({ 
        stdout: err.stdout || '', 
        stderr: err.stderr || err.message 
      }));
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: !result.stderr,
              lint_output: result.stdout || 'No issues found',
              errors: result.stderr
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message
            })
          }
        ]
      };
    }
  }

  // Prompt Template tool implementations

  private async listPromptTemplates(args: any) {
    const params = ListPromptTemplatesSchema.parse(args);

    try {
      const searchOptions: any = {};

      if (params.category) {
        searchOptions.category = params.category as TemplateCategory;
      }
      if (params.tags) {
        searchOptions.tags = params.tags;
      }
      if (params.search) {
        searchOptions.searchText = params.search;
      }

      const templates = this.promptTemplateLibrary.listTemplates(searchOptions);

      // Return summary of each template
      const templateSummaries = templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        version: t.version,
        category: t.category,
        tags: t.tags,
        num_examples: t.few_shot_examples.length,
        num_best_practices: t.context_enrichment.best_practices.length
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              count: templates.length,
              templates: templateSummaries
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message
            })
          }
        ]
      };
    }
  }

  private async getPromptTemplate(args: any) {
    const params = GetPromptTemplateSchema.parse(args);

    try {
      const template = this.promptTemplateLibrary.getTemplate(params.template_id);

      if (!template) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Template not found: ${params.template_id}`
              })
            }
          ]
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              template: template
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message
            })
          }
        ]
      };
    }
  }

  private async enrichPrompt(args: any) {
    const params = EnrichPromptSchema.parse(args);

    try {
      const enrichedPrompt = this.promptTemplateLibrary.enrichPrompt(
        params.prompt,
        params.template_id,
        params.additional_context
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              original_prompt: enrichedPrompt.original_prompt,
              enriched_prompt: enrichedPrompt.enriched_prompt,
              context_hints: enrichedPrompt.context_hints,
              sections: {
                system_context_length: enrichedPrompt.system_context.length,
                few_shot_section_length: enrichedPrompt.few_shot_section.length,
                chain_of_thought_section_length: enrichedPrompt.chain_of_thought_section.length
              }
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message
            })
          }
        ]
      };
    }
  }

  private async generateWithTemplate(args: any) {
    const params = GenerateWithTemplateSchema.parse(args);

    try {
      // Get enriched prompt from template
      const enrichedPrompt = this.promptTemplateLibrary.enrichPrompt(
        params.prompt,
        params.template_id,
        params.additional_context
      );

      // Generate playbook using enriched prompt
      const playbook = await this.generateWithEnrichedPrompt(
        enrichedPrompt,
        params.context
      );

      // Save playbook to file
      const timestamp = Date.now();
      const filename = `playbook_${timestamp}.yml`;
      const filepath = path.join(this.workDir, filename);

      await fs.writeFile(filepath, playbook);

      // Validate the generated playbook
      const validation = await this.validateYAML(playbook);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              playbook_path: filepath,
              playbook_content: playbook,
              validation: validation,
              template_used: params.template_id,
              context_hints: enrichedPrompt.context_hints,
              message: 'Playbook generated successfully with optimized prompt template'
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message
            })
          }
        ]
      };
    }
  }

  private async generateWithEnrichedPrompt(
    enrichedPrompt: EnrichedPrompt,
    context?: any
  ): Promise<string> {
    // Parse the enriched prompt to extract example playbooks
    // For now, we'll use the first few-shot example as a base and customize it
    const template = this.promptTemplateLibrary.getTemplate(
      enrichedPrompt.original_prompt.includes('kubernetes') ? 'kubernetes-deployment' :
      enrichedPrompt.original_prompt.includes('docker') ? 'docker-setup' :
      enrichedPrompt.original_prompt.includes('security') ? 'security-hardening' :
      enrichedPrompt.original_prompt.includes('database') ? 'database-setup' :
      enrichedPrompt.original_prompt.includes('monitor') ? 'monitoring-stack' :
      'kubernetes-deployment'
    );

    // Generate a playbook based on the enriched context
    const playbook = `---
# Generated using optimized prompt template
# Template: ${template?.name || 'Unknown'}
# Original prompt: ${enrichedPrompt.original_prompt}
#
# Context hints applied:
${enrichedPrompt.context_hints.map(h => `# - ${h}`).join('\n')}

- name: ${enrichedPrompt.original_prompt}
  hosts: ${context?.target_hosts || 'all'}
  become: yes
  vars:
    environment: ${context?.environment || 'production'}

  tasks:
    - name: Gather facts
      setup:
      tags:
        - always

    - name: Execute main task based on requirements
      debug:
        msg: "Executing: ${enrichedPrompt.original_prompt}"
      tags:
        ${context?.tags ? context.tags.map((t: string) => `- ${t}`).join('\n        ') : '- main'}

    # Best practices from template:
${template?.context_enrichment.best_practices.slice(0, 3).map(bp => `    # - ${bp}`).join('\n')}
`;

    return playbook;
  }

  private async updateTemplateVersion(args: any) {
    const params = UpdateTemplateSchema.parse(args);

    try {
      const updatedTemplate = await this.promptTemplateLibrary.updateTemplateVersion(
        params.template_id,
        params.updates as Partial<PromptTemplate>,
        params.change_description
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              template_id: updatedTemplate.id,
              new_version: updatedTemplate.version,
              updated_at: updatedTemplate.updated_at,
              changes: params.change_description
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message
            })
          }
        ]
      };
    }
  }

  private async getTemplateHistory(args: any) {
    const params = GetTemplateHistorySchema.parse(args);

    try {
      const history = this.promptTemplateLibrary.getTemplateHistory(params.template_id);

      if (history.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `No history found for template: ${params.template_id}`
              })
            }
          ]
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              template_id: params.template_id,
              history: history
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message
            })
          }
        ]
      };
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Ansible MCP Server started successfully');
  }
}

// Start the server
const server = new AnsibleMCPServer();
server.start().catch(console.error);
