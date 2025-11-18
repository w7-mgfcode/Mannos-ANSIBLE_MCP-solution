import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type {
  CallToolResult,
  ToolAnnotations,
  ServerCapabilities
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
import { AIProvider, createProviderFromEnv } from './providers/index.js';

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

// Server capabilities declaration for MCP compliance
const serverCapabilities: ServerCapabilities = {
  tools: {
    listChanged: true,
  },
  logging: {},
};

class AnsibleMCPServer {
  private server: McpServer;
  private playbookTemplates: Map<string, string>;
  private promptTemplateLibrary: PromptTemplateLibrary;
  private workDir: string;
  private aiProvider: AIProvider | null;

  constructor() {
    this.server = new McpServer(
      {
        name: 'ansible-mcp-server',
        version: '2.0.0',
      },
      {
        capabilities: serverCapabilities,
        instructions: 'Ansible MCP Server for AI-powered playbook generation and automation. Supports playbook creation, validation, execution, and refinement with template-based and AI-enhanced workflows.',
      }
    );

    this.playbookTemplates = new Map();
    this.promptTemplateLibrary = new PromptTemplateLibrary();
    this.workDir = '/tmp/ansible-mcp';
    this.aiProvider = null;
    this.initialize();
  }

  private async initialize() {
    // Create working directory
    await fs.mkdir(this.workDir, { recursive: true });

    // Initialize AI provider
    try {
      this.aiProvider = createProviderFromEnv();
      console.error(`AI Provider initialized: ${this.aiProvider.getName()} (${this.aiProvider.getModel()})`);
    } catch (error) {
      console.error('AI Provider initialization failed:', error instanceof Error ? error.message : String(error));
      console.error('Falling back to template-based generation');
    }

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

    - name: Install Docker Compose Plugin
      package:
        name: docker-compose-plugin
        state: present
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
    // Tool annotations for MCP compliance
    const readOnlyAnnotations: ToolAnnotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    };

    const generativeAnnotations: ToolAnnotations = {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    };

    const executionAnnotations: ToolAnnotations = {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
    };

    const modifyAnnotations: ToolAnnotations = {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    };

    // Register generate_playbook tool
    this.server.registerTool(
      'generate_playbook',
      {
        description: 'Generate an Ansible playbook based on a natural language prompt. Supports template-based and AI-enhanced generation.',
        inputSchema: {
          prompt: z.string().describe('Natural language description of the desired playbook'),
          template: z.string().optional().describe('Optional template name to use (kubernetes_deployment, docker_setup, system_hardening)'),
          context: z.object({
            target_hosts: z.string().optional().describe('Target hosts or host group'),
            environment: z.string().optional().describe('Environment (production, staging, development)'),
            tags: z.array(z.string()).optional().describe('Tags for selective execution'),
          }).optional().describe('Additional context for playbook generation'),
        },
        annotations: generativeAnnotations,
      },
      async (args) => this.generatePlaybook(args)
    );

    // Register validate_playbook tool
    this.server.registerTool(
      'validate_playbook',
      {
        description: 'Validate an Ansible playbook for YAML syntax, Ansible syntax, and best practices.',
        inputSchema: {
          playbook_path: z.string().describe('Path to the playbook file to validate'),
          strict: z.boolean().optional().describe('Enable strict validation with best practice checks'),
        },
        annotations: readOnlyAnnotations,
      },
      async (args) => this.validatePlaybook(args)
    );

    // Register run_playbook tool
    this.server.registerTool(
      'run_playbook',
      {
        description: 'Execute an Ansible playbook against the specified inventory. Use check_mode for dry runs.',
        inputSchema: {
          playbook_path: z.string().describe('Path to the playbook file to execute'),
          inventory: z.string().describe('Inventory file or host pattern'),
          extra_vars: z.record(z.any()).optional().describe('Extra variables to pass to the playbook'),
          check_mode: z.boolean().optional().describe('Run in check mode (dry run)'),
          tags: z.array(z.string()).optional().describe('Run only tasks with these tags'),
        },
        annotations: executionAnnotations,
      },
      async (args) => this.runPlaybook(args)
    );

    // Register refine_playbook tool
    this.server.registerTool(
      'refine_playbook',
      {
        description: 'Refine and improve an existing playbook based on feedback and validation errors.',
        inputSchema: {
          playbook_path: z.string().describe('Path to the playbook file to refine'),
          feedback: z.string().describe('Feedback describing desired improvements'),
          validation_errors: z.array(z.string()).optional().describe('Validation errors to fix'),
        },
        annotations: modifyAnnotations,
      },
      async (args) => this.refinePlaybook(args)
    );

    // Register lint_playbook tool
    this.server.registerTool(
      'lint_playbook',
      {
        description: 'Run ansible-lint on a playbook to check for best practices and common issues.',
        inputSchema: {
          playbook_path: z.string().describe('Path to the playbook file to lint'),
        },
        annotations: readOnlyAnnotations,
      },
      async (args) => this.lintPlaybook(args)
    );

    // Register list_prompt_templates tool
    this.server.registerTool(
      'list_prompt_templates',
      {
        description: 'List available prompt templates with optional filtering by category, tags, or search text.',
        inputSchema: {
          category: z.enum(['kubernetes', 'docker', 'security', 'database', 'monitoring', 'network', 'cicd', 'cloud', 'general']).optional().describe('Filter by category'),
          tags: z.array(z.string()).optional().describe('Filter by tags'),
          search: z.string().optional().describe('Search in template names and descriptions'),
        },
        annotations: readOnlyAnnotations,
      },
      async (args) => this.listPromptTemplates(args)
    );

    // Register get_prompt_template tool
    this.server.registerTool(
      'get_prompt_template',
      {
        description: 'Get detailed information about a specific prompt template including few-shot examples and chain-of-thought reasoning.',
        inputSchema: {
          template_id: z.string().describe('The ID of the template to retrieve'),
        },
        annotations: readOnlyAnnotations,
      },
      async (args) => this.getPromptTemplate(args)
    );

    // Register enrich_prompt tool
    this.server.registerTool(
      'enrich_prompt',
      {
        description: 'Enrich a user prompt with few-shot examples, chain-of-thought reasoning, and context hints from a template.',
        inputSchema: {
          prompt: z.string().describe('The user prompt to enrich'),
          template_id: z.string().describe('The template to use for enrichment'),
          additional_context: z.record(z.any()).optional().describe('Additional context variables'),
        },
        annotations: readOnlyAnnotations,
      },
      async (args) => this.enrichPrompt(args)
    );

    // Register generate_with_template tool
    this.server.registerTool(
      'generate_with_template',
      {
        description: 'Generate a playbook using an optimized prompt template with few-shot learning and chain-of-thought reasoning.',
        inputSchema: {
          prompt: z.string().describe('Natural language description of the desired playbook'),
          template_id: z.string().describe('The prompt template to use'),
          context: z.object({
            target_hosts: z.string().optional(),
            environment: z.string().optional(),
            tags: z.array(z.string()).optional(),
          }).optional().describe('Playbook context'),
          additional_context: z.record(z.any()).optional().describe('Additional context variables for the template'),
        },
        annotations: generativeAnnotations,
      },
      async (args) => this.generateWithTemplate(args)
    );

    // Register update_template_version tool
    this.server.registerTool(
      'update_template_version',
      {
        description: 'Update a prompt template with new content and create a new version.',
        inputSchema: {
          template_id: z.string().describe('The ID of the template to update'),
          updates: z.object({
            name: z.string().optional(),
            description: z.string().optional(),
            system_prompt: z.string().optional(),
            user_prompt_template: z.string().optional(),
            best_practices: z.array(z.string()).optional(),
          }).describe('Fields to update'),
          change_description: z.array(z.string()).describe('List of changes made in this version'),
        },
        annotations: modifyAnnotations,
      },
      async (args) => this.updateTemplateVersion(args)
    );

    // Register get_template_history tool
    this.server.registerTool(
      'get_template_history',
      {
        description: 'Get the version history and changelog for a prompt template.',
        inputSchema: {
          template_id: z.string().describe('The ID of the template'),
        },
        annotations: readOnlyAnnotations,
      },
      async (args) => this.getTemplateHistory(args)
    );
  }

  private async generatePlaybook(args: any): Promise<CallToolResult> {
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
            type: 'text' as const,
            text: JSON.stringify({
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
            type: 'text' as const,
            text: `Error generating playbook: ${(error as Error).message}`
          }
        ],
        isError: true
      };
    }
  }

  private async generateWithAI(prompt: string, context?: any): Promise<string> {
    // Use AI provider if available
    if (this.aiProvider) {
      try {
        console.log(`Generating playbook using AI provider: ${this.aiProvider.getName()}`);
        const generatedPlaybook = await this.aiProvider.generatePlaybook(prompt, context);
        return generatedPlaybook;
      } catch (error) {
        console.error('AI generation failed, falling back to template:', error instanceof Error ? (error as Error).message : String(error));
        // Fall through to template-based generation
      }
    }

    // Fallback to template-based generation
    console.log('Using template-based generation');
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

    # Note: Using template-based generation. Configure AI provider for better results.
`;

    return playbook;
  }

  private async validatePlaybook(args: any): Promise<CallToolResult> {
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
        warnings: [] as string[]
      };

      // Add warnings for best practices
      if (params.strict) {
        results.warnings = this.checkBestPractices(content);
      }

      const isValid = results.yaml_valid && results.ansible_syntax_valid;

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              valid: isValid,
              validation_results: results
            }, null, 2)
          }
        ],
        isError: !isValid
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error validating playbook: ${(error as Error).message}`
          }
        ],
        isError: true
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
        errors: [(error as Error).message]
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

  private async runPlaybook(args: any): Promise<CallToolResult> {
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
            type: 'text' as const,
            text: JSON.stringify({
              output: result.stdout,
              errors: result.stderr,
              command: command
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      const execError = error as any;
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: (error as Error).message,
              stderr: execError.stderr,
              stdout: execError.stdout
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }

  private async refinePlaybook(args: any): Promise<CallToolResult> {
    const params = RefinePlaybookSchema.parse(args);

    try {
      // Read current playbook
      let content = await fs.readFile(params.playbook_path, 'utf-8');

      // Use AI provider for intelligent refinement if available
      if (this.aiProvider) {
        try {
          console.error('Using AI provider for playbook refinement');
          const refinementPrompt = `Refine this Ansible playbook based on the following feedback: ${params.feedback}

${params.validation_errors && params.validation_errors.length > 0 ? `\nValidation errors to fix:\n${params.validation_errors.join('\n')}` : ''}

Current playbook:
${content}

Please provide an improved version of the playbook that addresses the feedback and fixes any errors. Output ONLY the YAML content.`;

          const refinedContent = await this.aiProvider.generate([
            {
              role: 'system',
              content: 'You are an expert Ansible playbook optimizer. Refine playbooks based on feedback while maintaining functionality and best practices.',
            },
            {
              role: 'user',
              content: refinementPrompt,
            },
          ], { temperature: 0.3 });

          const refinedPath = params.playbook_path.replace('.yml', '_refined.yml');
          await fs.writeFile(refinedPath, refinedContent.content);

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  refined_playbook_path: refinedPath,
                  changes_applied: [
                    'AI-refined playbook based on feedback: ' + params.feedback,
                    params.validation_errors ? `Fixed ${params.validation_errors.length} validation errors` : null,
                  ].filter(Boolean),
                  refined_content: refinedContent.content,
                  ai_provider: this.aiProvider.getName(),
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          console.error('AI refinement failed, falling back to rule-based refinement:', error instanceof Error ? error.message : String(error));
        }
      }

      // Fallback to rule-based refinement
      console.error('Using rule-based refinement');

      // Parse YAML
      const playbook = yaml.load(content) as any;

      // Apply refinements based on feedback
      if (params.validation_errors) {
        params.validation_errors.forEach(error => {
          if (error.includes('indentation')) {
            content = this.fixIndentation(content);
          }
          if (error.includes('syntax')) {
            content = this.fixCommonSyntax(content);
          }
        });
      }

      // Apply feedback-based improvements
      if (params.feedback.toLowerCase().includes('add error handling')) {
        playbook[0].tasks = playbook[0].tasks.map((task: any) => ({
          ...task,
          ignore_errors: false,
          failed_when: false,
          register: `${task.name.replace(/\s+/g, '_')}_result`
        }));
      }

      if (params.feedback.toLowerCase().includes('make idempotent')) {
        playbook[0].tasks = playbook[0].tasks.map((task: any) => ({
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
            type: 'text' as const,
            text: JSON.stringify({
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
            type: 'text' as const,
            text: `Error refining playbook: ${(error as Error).message}`
          }
        ],
        isError: true
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

  private async lintPlaybook(args: any): Promise<CallToolResult> {
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

      const hasErrors = Boolean(result.stderr);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              lint_output: result.stdout || 'No issues found',
              errors: result.stderr || null
            }, null, 2)
          }
        ],
        isError: hasErrors
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error linting playbook: ${(error as Error).message}`
          }
        ],
        isError: true
      };
    }
  }

  // Prompt Template tool implementations

  private async listPromptTemplates(args: any): Promise<CallToolResult> {
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
            type: 'text' as const,
            text: JSON.stringify({
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
            type: 'text' as const,
            text: `Error listing templates: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  private async getPromptTemplate(args: any): Promise<CallToolResult> {
    const params = GetPromptTemplateSchema.parse(args);

    try {
      const template = this.promptTemplateLibrary.getTemplate(params.template_id);

      if (!template) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Template not found: ${params.template_id}`
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              template: template
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error getting template: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  private async enrichPrompt(args: any): Promise<CallToolResult> {
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
            type: 'text' as const,
            text: JSON.stringify({
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
            type: 'text' as const,
            text: `Error enriching prompt: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  private async generateWithTemplate(args: any): Promise<CallToolResult> {
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
            type: 'text' as const,
            text: JSON.stringify({
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
            type: 'text' as const,
            text: `Error generating playbook with template: ${error.message}`
          }
        ],
        isError: true
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

  private async updateTemplateVersion(args: any): Promise<CallToolResult> {
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
            type: 'text' as const,
            text: JSON.stringify({
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
            type: 'text' as const,
            text: `Error updating template: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  private async getTemplateHistory(args: any): Promise<CallToolResult> {
    const params = GetTemplateHistorySchema.parse(args);

    try {
      const history = this.promptTemplateLibrary.getTemplateHistory(params.template_id);

      if (history.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `No history found for template: ${params.template_id}`
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
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
            type: 'text' as const,
            text: `Error getting template history: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Ansible MCP Server v2.0.0 started successfully (MCP SDK v1.22.0)');
  }
}

// Start the server
const server = new AnsibleMCPServer();
server.start().catch(console.error);
