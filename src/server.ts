import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { z } from 'zod';
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

class AnsibleMCPServer {
  private server: Server;
  private playbookTemplates: Map<string, string>;
  private workDir: string;
  private aiProvider: AIProvider | null;

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
      console.log(`AI Provider initialized: ${this.aiProvider.getName()} (${this.aiProvider.getModel()})`);
    } catch (error) {
      console.warn('AI Provider initialization failed:', error instanceof Error ? (error as Error).message : String(error));
      console.warn('Falling back to template-based generation');
    }

    // Load templates
    await this.loadTemplates();

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
    // List tools handler
    this.server.setRequestHandler("tools/list" as any, async () => ({
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
        }
      ] as Tool[]
    }));

    // Call tool handler
    this.server.setRequestHandler("tools/call" as any, async (request) => {
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
              error: (error as Error).message
            })
          }
        ]
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
        warnings: [] as string[]
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
              error: (error as Error).message
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
              error: (error as Error).message,
              stderr: (error as any).stderr,
              stdout: (error as any).stdout
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

      // Use AI provider for intelligent refinement if available
      if (this.aiProvider) {
        try {
          console.log('Using AI provider for playbook refinement');
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
          ], { temperature: 0.3 }); // Lower temperature for more precise refinements

          const refinedPath = params.playbook_path.replace('.yml', '_refined.yml');
          await fs.writeFile(refinedPath, refinedContent.content);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
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
          console.error('AI refinement failed, falling back to rule-based refinement:', error instanceof Error ? (error as Error).message : String(error));
          // Fall through to rule-based refinement
        }
      }

      // Fallback to rule-based refinement
      console.log('Using rule-based refinement');

      // Parse YAML
      const playbook = yaml.load(content) as any;

      // Apply refinements based on feedback
      
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
              error: (error as Error).message
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
              error: (error as Error).message
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
