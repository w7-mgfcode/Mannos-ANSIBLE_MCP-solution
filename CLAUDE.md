# CLAUDE.md - AI Assistant Guide for Ansible MCP Server

> **Last Updated**: 2025-11-18
> **Repository**: Mannos-ANSIBLE_MCP-solution
> **Version**: 2.0.0 (MCP SDK v1.22.0)
> **Purpose**: Guide AI assistants working with this Ansible MCP Server codebase

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Codebase Structure](#codebase-structure)
4. [Development Workflows](#development-workflows)
5. [Key Conventions](#key-conventions)
6. [MCP Protocol Integration](#mcp-protocol-integration)
7. [Common Tasks](#common-tasks)
8. [Testing Strategy](#testing-strategy)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## Project Overview

### What This Project Does

This is an **Ansible MCP (Model Context Protocol) Server** that enables AI-powered Ansible playbook generation and execution. It bridges AI capabilities with DevOps automation by:

- Converting natural language prompts into production-ready Ansible playbooks
- Validating and linting generated playbooks automatically
- Executing playbooks with proper error handling
- Providing templates for common infrastructure patterns
- Integrating with monitoring, secrets management, and version control

### Technology Stack

**Core Technologies:**
- **TypeScript** (src/server.ts): MCP server implementation using `@modelcontextprotocol/sdk`
- **Python** (src/playbook_generator.py): AI-powered playbook generation logic
- **Ansible**: Infrastructure automation and configuration management
- **Docker**: Containerized deployment via Docker Compose

**Key Dependencies:**
- `@modelcontextprotocol/sdk` v1.22.0: MCP protocol implementation (McpServer high-level API)
- `js-yaml`: YAML parsing and generation
- `zod`: Schema validation with `.describe()` for self-documenting parameters
- `winston`: Logging
- `fastapi`: Python web framework (AI service)
- `openai/langchain`: AI integration for smart generation

**MCP 2025-03-26 Compliance:**
- Tool annotations (readOnlyHint, destructiveHint, idempotentHint)
- Proper `CallToolResult` with `isError` for error handling
- Server capabilities with `listChanged` support
- Server instructions for client guidance

**Infrastructure:**
- Redis: Caching and job queue
- HashiCorp Vault: Secrets management
- Prometheus + Grafana: Monitoring
- GitLab: Version control (optional)
- AWX: Ansible UI (optional)

### Project Goals

1. **Automate playbook creation**: Reduce manual YAML writing
2. **Ensure quality**: Built-in validation and best practices
3. **AI-first**: Leverage LLMs for intelligent generation
4. **Production-ready**: Security, monitoring, and reliability built-in

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AI Agent/Claude                        │
│              (Natural Language Interface)                    │
└──────────────────────┬──────────────────────────────────────┘
                       │ MCP Protocol
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Ansible MCP Server                         │
│                  (TypeScript - src/server.ts)                │
│  ┌──────────────┬──────────────┬──────────────────────┐    │
│  │ Tool Router  │ Validators   │ Execution Manager    │    │
│  └──────────────┴──────────────┴──────────────────────┘    │
└──────────────────────┬──────────────────────────────────────┘
                       │
      ┌────────────────┼────────────────┐
      ▼                ▼                ▼
┌──────────┐   ┌──────────────┐  ┌──────────────┐
│ Python   │   │   Redis      │  │   Vault      │
│ AI Gen   │   │   Cache      │  │   Secrets    │
└──────────┘   └──────────────┘  └──────────────┘
      │
      ▼
┌─────────────────────────────────────────────┐
│         Generated Ansible Playbooks          │
│         (YAML stored in /playbooks)          │
└─────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────┐
│         Target Infrastructure                │
│  (Kubernetes, Docker, VMs, Cloud Resources)  │
└─────────────────────────────────────────────┘
```

### Component Interaction

1. **AI Agent** → MCP Server: Sends tool requests via MCP protocol
2. **MCP Server** → Python AI Generator: Delegates complex generation tasks
3. **MCP Server** → Redis: Caches templates and results
4. **MCP Server** → Vault: Retrieves secrets for playbook execution
5. **MCP Server** → Target Infrastructure: Executes validated playbooks

---

## Codebase Structure

### Directory Layout

```
Mannos-ANSIBLE_MCP-solution/
├── src/                          # Source code
│   ├── server.ts                 # MCP server (TypeScript)
│   └── playbook_generator.py     # AI generator (Python)
├── playbooks/                    # Generated playbooks (git-tracked)
├── inventory/                    # Ansible inventory files
├── logs/                         # Execution logs
├── templates/                    # Playbook templates (if custom)
├── monitoring/                   # Prometheus/Grafana configs
│   ├── prometheus.yml
│   └── grafana/
├── vault/                        # HashiCorp Vault config
│   └── config/
├── docker-compose.yml            # Complete stack definition
├── Dockerfile.mcp                # MCP server container
├── Dockerfile.python             # Python AI service container
├── package.json                  # Node.js dependencies
├── requirements.txt              # Python dependencies
├── tsconfig.json                 # TypeScript config
├── ansible.cfg                   # Ansible configuration
├── README.md                     # User documentation
├── USAGE.md                      # Usage examples
├── CONTRIBUTING.md               # Contribution guidelines
└── CLAUDE.md                     # This file
```

### Key Files

#### `src/server.ts` (703 lines)

**Purpose**: Main MCP server implementation

**Key Classes/Functions**:
- `AnsibleMCPServer`: Main server class
  - `initialize()`: Sets up work directories and loads templates
  - `loadTemplates()`: Loads predefined playbook templates
  - `setupHandlers()`: Registers MCP tool handlers

**MCP Tools Exposed**:
1. `generate_playbook`: Create playbook from prompt
2. `validate_playbook`: YAML and Ansible syntax validation
3. `run_playbook`: Execute playbook with options
4. `refine_playbook`: Improve playbook based on feedback
5. `lint_playbook`: Run ansible-lint

**Important Details**:
- Working directory: `/tmp/ansible-mcp`
- Templates stored in `Map<string, string>`
- Uses `zod` schemas for parameter validation
- All tool responses return JSON via MCP content blocks

**Template Types**:
- `kubernetes_deployment`: K8s deployment with namespace, replicas, etc.
- `docker_setup`: Docker + Docker Compose installation
- `system_hardening`: Security configuration (SSH, firewall, fail2ban)

#### `src/playbook_generator.py` (898 lines)

**Purpose**: AI-powered playbook generation with context awareness

**Key Classes**:
- `PlaybookType` (Enum): kubernetes, docker, system, network, database, monitoring, security, cicd
- `PlaybookContext` (dataclass): Stores prompt analysis results
- `PlaybookGenerator`: Main generation logic
  - `analyze_prompt()`: Extracts intent from natural language
  - `generate()`: Creates playbook from context
  - `_enhance_with_requirements()`: Adds HA, security, monitoring tasks
- `PlaybookValidator`: Syntax and structure validation

**Prompt Analysis**:
- Regex patterns detect playbook type (K8s, Docker, DB, etc.)
- Extracts environment (production, staging, development)
- Identifies requirements (HA, scalability, security, monitoring, backup)
- Generates appropriate tags based on keywords

**Template Methods**:
- `_kubernetes_template()`: Full K8s deployment template
- `_docker_template()`: Docker installation and setup
- `_system_template()`: System configuration baseline
- `_database_template()`: PostgreSQL setup (extensible)
- `_monitoring_template()`: Prometheus + Grafana
- `_security_template()`: Security hardening

#### `docker-compose.yml`

**Services**:
1. `ansible-mcp`: Main MCP server (port 3000)
2. `ai-generator`: Python AI service (port 8000)
3. `redis`: Cache and job queue (port 6379)
4. `vault`: HashiCorp Vault (port 8200, dev token: `myroot`)
5. `gitlab`: Git server (port 8080, password: `ansible-mcp-2024`)
6. `prometheus`: Metrics (port 9090)
7. `grafana`: Dashboards (port 3001, password: `ansible-mcp`)
8. `awx-web` + `awx-task`: Ansible AWX UI (port 8052)
9. `postgres`: AWX database (port 5432)

**Volumes**:
- `./playbooks` → `/workspace/playbooks`: Generated playbooks
- `./inventory` → `/workspace/inventory`: Inventory files
- `./logs` → `/workspace/logs`: Execution logs

#### `ansible.cfg`

**Key Settings**:
- Inventory: `/workspace/inventory/hosts`
- Host key checking: `False` (for automation)
- Forks: `50` (high parallelism)
- Pipelining: `True` (performance)
- Strategy: `free` (non-blocking execution)
- Logging: `/workspace/logs/ansible.log`
- Vault password: `/workspace/.vault_pass`

---

## Development Workflows

### Setup for Local Development

```bash
# 1. Install dependencies
npm install                  # TypeScript dependencies
pip install -r requirements.txt  # Python dependencies

# 2. Build TypeScript
npm run build               # Compiles to dist/

# 3. Run in development mode
npm run dev                 # Uses tsx for hot-reload

# 4. Run with Docker (recommended)
docker compose up -d        # Start all services
docker compose logs -f ansible-mcp  # View logs
```

### Making Changes to the MCP Server

**When modifying `src/server.ts`:**

1. **Add a new tool**:
   - Define Zod schema (e.g., `NewToolSchema`)
   - Add tool definition in `ListToolsRequest` handler
   - Implement tool logic method (e.g., `async newTool(args: any)`)
   - Add case in `CallToolRequest` switch statement

2. **Add a new template**:
   - Add to `loadTemplates()` method
   - Use `this.playbookTemplates.set('template_name', '...')`

3. **Testing changes**:
   ```bash
   npm run lint              # ESLint checks
   npm run format            # Prettier formatting
   npm test                  # Run tests
   npm run build             # Ensure it compiles
   ```

### Making Changes to the AI Generator

**When modifying `src/playbook_generator.py`:**

1. **Add a new playbook type**:
   - Add to `PlaybookType` enum
   - Add regex pattern in `_compile_patterns()`
   - Implement template method (e.g., `_cicd_template()`)
   - Add to `self.templates` dict in `_load_templates()`

2. **Enhance prompt analysis**:
   - Modify `analyze_prompt()` method
   - Add new patterns to `_extract_requirements()`
   - Update `_generate_tags()` for new keywords

3. **Testing changes**:
   ```bash
   python -m pytest tests/     # Run Python tests
   black src/                  # Format code
   flake8 src/                 # Lint code
   python src/playbook_generator.py  # Run test prompts
   ```

### Git Workflow

**Branch Strategy**:
- `main`: Production-ready code
- `claude/*`: Feature branches for Claude Code work
- Current branch: `claude/claude-md-mhzcn3z5kp3gu9ze-01Gz9F8rXGg4G3armRcCbXS9`

**Commit Conventions** (Conventional Commits):
```
feat: add new Kubernetes template
fix: resolve YAML indentation issue
docs: update API documentation
refactor: simplify prompt analysis logic
test: add tests for validation
chore: update dependencies
```

**Workflow**:
```bash
# 1. Make changes
git status                  # Check changes

# 2. Stage changes
git add src/server.ts       # Stage specific files

# 3. Commit with message
git commit -m "feat: add refine_playbook tool"

# 4. Push to remote
git push -u origin claude/claude-md-mhzcn3z5kp3gu9ze-01Gz9F8rXGg4G3armRcCbXS9
```

---

## Key Conventions

### TypeScript Code Style

- **Strict mode enabled**: All TypeScript strict checks on
- **Modules**: ESM with NodeNext resolution
- **Async/await**: Preferred over promises
- **Error handling**: Try-catch blocks with JSON error responses
- **Return format**: All tools return `{ content: [{ type: 'text', text: JSON.stringify(...) }] }`
- **Validation**: Use Zod schemas for all input validation

**Example Pattern**:
```typescript
private async generatePlaybook(args: any) {
  const params = GeneratePlaybookSchema.parse(args);  // Validate

  try {
    // Logic here
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          playbook_path: filepath,
          // ... other data
        }, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error.message
        })
      }]
    };
  }
}
```

### Python Code Style

- **PEP 8 compliance**: Follow standard Python style
- **Type hints**: Use for function parameters and returns
- **Docstrings**: Add to all public classes and methods
- **Dataclasses**: Prefer over dictionaries for structured data
- **F-strings**: Use for string formatting
- **YAML generation**: Use `yaml.dump()` with `default_flow_style=False, sort_keys=False`

**Example Pattern**:
```python
def analyze_prompt(self, prompt: str) -> PlaybookContext:
    """Analyze the prompt to extract context"""
    context = PlaybookContext(prompt=prompt)

    # Detection logic
    for pattern_name, pattern in self.patterns.items():
        if pattern.search(prompt):
            context.playbook_type = PlaybookType(pattern_name)
            break

    return context
```

### Ansible Playbook Conventions

**Structure**:
```yaml
---
- name: Descriptive Playbook Name
  hosts: "{{ target_hosts | default('all') }}"
  become: yes
  vars:
    environment: "{{ environment | default('production') }}"
    # More vars...

  tasks:
    - name: Clear task description
      module_name:
        param: value
      tags:
        - tag1
        - tag2
      when: condition  # Optional
      register: result_var  # Optional

  handlers:  # Optional
    - name: restart service
      service:
        name: servicename
        state: restarted
```

**Best Practices**:
- Always include `name` for plays and tasks
- Use Jinja2 variables with defaults: `"{{ var | default('value') }}"`
- Add tags for selective execution
- Use `become: yes` explicitly when needed
- Include handlers for service restarts
- Add comments for complex logic

### File Naming

- **Playbooks**: `playbook_<timestamp>.yml` (auto-generated)
- **Templates**: `<type>_template.yml` (e.g., `kubernetes_template.yml`)
- **TypeScript**: `camelCase.ts`
- **Python**: `snake_case.py`

---

## MCP Protocol Integration

### How MCP Works in This Project

**MCP (Model Context Protocol)** enables AI agents to:
1. Discover available tools via `ListToolsRequest`
2. Execute tools via `CallToolRequest`
3. Receive structured responses

**Connection Flow**:
```typescript
// Server initialization
const server = new Server({
  name: 'ansible-mcp-server',
  version: '1.0.0',
}, {
  capabilities: { tools: {} }
});

// Transport (stdio)
const transport = new StdioServerTransport();
await server.connect(transport);
```

**Tool Registration Pattern**:
```typescript
this.server.setRequestHandler(ListToolsRequest, async () => ({
  tools: [
    {
      name: 'tool_name',
      description: 'What the tool does',
      inputSchema: {
        type: 'object',
        properties: { /* ... */ },
        required: ['param1']
      }
    }
  ]
}));

this.server.setRequestHandler(CallToolRequest, async (request) => {
  const { name, arguments: args } = request.params;
  // Route to appropriate handler
});
```

### Available MCP Tools

#### 1. `generate_playbook`

**Input**:
```json
{
  "prompt": "Deploy scalable web app to Kubernetes",
  "template": "kubernetes_deployment",  // optional
  "context": {
    "target_hosts": "k8s_cluster",
    "environment": "production",
    "tags": ["deploy", "web"]
  }
}
```

**Output**:
```json
{
  "success": true,
  "playbook_path": "/tmp/ansible-mcp/playbook_1234567890.yml",
  "playbook_content": "--- yaml content ---",
  "validation": {
    "valid": true
  }
}
```

#### 2. `validate_playbook`

**Input**:
```json
{
  "playbook_path": "/tmp/ansible-mcp/playbook_1234567890.yml",
  "strict": true
}
```

**Output**:
```json
{
  "success": true,
  "validation_results": {
    "yaml_valid": true,
    "ansible_syntax_valid": true,
    "warnings": ["Consider adding tags"]
  }
}
```

#### 3. `run_playbook`

**Input**:
```json
{
  "playbook_path": "/tmp/ansible-mcp/playbook_1234567890.yml",
  "inventory": "production",
  "extra_vars": {
    "app_name": "myapp",
    "replicas": 5
  },
  "check_mode": true,
  "tags": ["deploy"]
}
```

**Output**:
```json
{
  "success": true,
  "output": "PLAY RECAP ...",
  "errors": "",
  "command": "ansible-playbook ..."
}
```

#### 4. `refine_playbook`

**Input**:
```json
{
  "playbook_path": "/tmp/ansible-mcp/playbook_1234567890.yml",
  "feedback": "Add error handling and make idempotent",
  "validation_errors": ["Task missing 'when' condition"]
}
```

**Output**:
```json
{
  "success": true,
  "refined_playbook_path": "/tmp/ansible-mcp/playbook_1234567890_refined.yml",
  "changes_applied": [
    "Applied feedback: Add error handling...",
    "Fixed 1 validation errors"
  ]
}
```

#### 5. `lint_playbook`

**Input**:
```json
{
  "playbook_path": "/tmp/ansible-mcp/playbook_1234567890.yml"
}
```

**Output**:
```json
{
  "success": true,
  "lint_output": "No issues found",
  "errors": ""
}
```

---

## Common Tasks

### Task 1: Add a New Playbook Template

**Goal**: Add a CI/CD pipeline template

**Steps**:

1. **Edit `src/server.ts`**:
   ```typescript
   // In loadTemplates() method
   this.playbookTemplates.set('cicd_pipeline', `
   ---
   - name: CI/CD Pipeline Setup
     hosts: "{{ target_hosts | default('cicd_servers') }}"
     become: yes
     vars:
       jenkins_version: "{{ jenkins_version | default('2.400') }}"

     tasks:
       - name: Install Jenkins
         package:
           name: jenkins
           state: present

       - name: Configure Jenkins
         template:
           src: jenkins.xml.j2
           dest: /etc/jenkins/config.xml
   `);
   ```

2. **Edit `src/playbook_generator.py`**:
   ```python
   # Add to PlaybookType enum
   class PlaybookType(Enum):
       # ... existing types
       CICD = "cicd"

   # Add pattern
   def _compile_patterns(self):
       return {
           # ... existing patterns
           'cicd': re.compile(r'\b(jenkins|gitlab.?ci|github.?actions|pipeline)\b', re.I),
       }

   # Add template method
   def _cicd_template(self) -> str:
       return """
   - name: CI/CD Pipeline Setup
     hosts: "{{ target_hosts | default('cicd_servers') }}"
     # ... template content
   """
   ```

3. **Test**:
   ```bash
   # Test generation
   curl -X POST http://localhost:3000/execute \
     -H "Content-Type: application/json" \
     -d '{"tool": "generate_playbook", "arguments": {"prompt": "Setup Jenkins CI/CD pipeline"}}'
   ```

### Task 2: Enhance Validation Logic

**Goal**: Add check for deprecated Ansible modules

**Steps**:

1. **Edit `src/server.ts`**:
   ```typescript
   private checkBestPractices(content: string): string[] {
     const warnings: string[] = [];

     // ... existing checks

     // New check for deprecated modules
     const deprecatedModules = ['apt_key', 'apt_repository'];
     deprecatedModules.forEach(module => {
       if (content.includes(`${module}:`)) {
         warnings.push(`Module '${module}' is deprecated. Use 'deb822_repository' instead.`);
       }
     });

     return warnings;
   }
   ```

2. **Test**:
   ```bash
   npm run build
   docker compose restart ansible-mcp
   # Test validation with playbook containing apt_key
   ```

### Task 3: Add Monitoring Metrics

**Goal**: Expose custom Prometheus metrics

**Steps**:

1. **Install dependency**:
   ```bash
   npm install prom-client
   ```

2. **Add to `src/server.ts`**:
   ```typescript
   import { Registry, Counter, Histogram } from 'prom-client';

   // In AnsibleMCPServer constructor
   private metrics: {
     register: Registry;
     playbookGenerated: Counter;
     executionTime: Histogram;
   };

   constructor() {
     this.metrics = {
       register: new Registry(),
       playbookGenerated: new Counter({
         name: 'ansible_playbooks_generated_total',
         help: 'Total playbooks generated'
       }),
       executionTime: new Histogram({
         name: 'ansible_playbook_execution_seconds',
         help: 'Playbook execution time'
       })
     };

     this.metrics.register.registerMetric(this.metrics.playbookGenerated);
     this.metrics.register.registerMetric(this.metrics.executionTime);
   }

   // In generatePlaybook method
   this.metrics.playbookGenerated.inc();
   ```

3. **Expose metrics endpoint** (if needed separately from MCP)

### Task 4: Debug a Playbook Generation Issue

**Scenario**: Generated playbook has incorrect indentation

**Steps**:

1. **Enable verbose logging**:
   ```typescript
   // Add to src/server.ts
   import winston from 'winston';

   const logger = winston.createLogger({
     level: 'debug',
     format: winston.format.json(),
     transports: [new winston.transports.Console()]
   });

   // Add logging before YAML generation
   logger.debug('Generating playbook with context:', context);
   ```

2. **Test with known prompt**:
   ```bash
   docker compose logs -f ansible-mcp
   # In another terminal
   curl -X POST http://localhost:3000/execute \
     -H "Content-Type: application/json" \
     -d '{"tool": "generate_playbook", "arguments": {"prompt": "Deploy nginx"}}'
   ```

3. **Validate YAML manually**:
   ```bash
   # Copy output to file
   cat > test.yml << 'EOF'
   # paste YAML here
   EOF

   # Validate
   python -c "import yaml; yaml.safe_load(open('test.yml'))"
   ansible-playbook --syntax-check test.yml
   ```

4. **Fix indentation issue**:
   ```typescript
   // In generateWithAI or template methods
   // Ensure consistent indentation (2 spaces)
   const playbook = yaml.dump(data, {
     indent: 2,
     lineWidth: -1,  // No wrapping
     noRefs: true
   });
   ```

---

## Testing Strategy

### Unit Tests

**TypeScript (Jest)**:
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

**Example test** (create `src/server.test.ts`):
```typescript
import { AnsibleMCPServer } from './server';

describe('AnsibleMCPServer', () => {
  let server: AnsibleMCPServer;

  beforeEach(() => {
    server = new AnsibleMCPServer();
  });

  test('loadTemplates loads kubernetes template', async () => {
    await server['loadTemplates']();
    expect(server['playbookTemplates'].has('kubernetes_deployment')).toBe(true);
  });
});
```

**Python (pytest)**:
```bash
# Run all tests
pytest tests/

# Run with coverage
pytest --cov=src tests/

# Verbose
pytest -v tests/
```

**Example test** (create `tests/test_playbook_generator.py`):
```python
from src.playbook_generator import PlaybookGenerator, PlaybookType

def test_analyze_kubernetes_prompt():
    generator = PlaybookGenerator()
    context = generator.analyze_prompt("Deploy to Kubernetes with 5 replicas")

    assert context.playbook_type == PlaybookType.KUBERNETES
    assert 'scalability' in context.requirements
```

### Integration Tests

**Test full workflow**:
```bash
# Start services
docker compose up -d

# Wait for startup
sleep 10

# Test generate + validate + run (check mode)
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Setup Docker on Ubuntu servers",
      "template": "docker_setup"
    }
  }' | jq -r '.playbook_path' > /tmp/playbook.txt

PLAYBOOK_PATH=$(cat /tmp/playbook.txt)

curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"tool\": \"validate_playbook\",
    \"arguments\": {
      \"playbook_path\": \"$PLAYBOOK_PATH\",
      \"strict\": true
    }
  }"
```

### Ansible Playbook Testing

**Syntax check**:
```bash
ansible-playbook --syntax-check playbooks/playbook_123.yml
```

**Lint check**:
```bash
ansible-lint playbooks/playbook_123.yml
```

**Dry run**:
```bash
ansible-playbook playbooks/playbook_123.yml -i inventory/hosts --check
```

---

## Deployment

### Docker Compose (Recommended)

**Start all services**:
```bash
docker compose up -d
```

**View logs**:
```bash
docker compose logs -f ansible-mcp
docker compose logs -f ai-generator
```

**Restart single service**:
```bash
docker compose restart ansible-mcp
```

**Stop all services**:
```bash
docker compose down
```

**Rebuild after code changes**:
```bash
docker compose up -d --build ansible-mcp
```

### Standalone Deployment

**MCP Server (TypeScript)**:
```bash
# Build
npm run build

# Run
node dist/server.js
```

**AI Generator (Python)**:
```bash
# Install dependencies
pip install -r requirements.txt

# Run (if it has a web server)
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

### Environment Variables

**MCP Server**:
- `NODE_ENV`: `production` or `development`
- `MCP_PORT`: Port for MCP server (default: 3000)
- `ANSIBLE_HOST_KEY_CHECKING`: `False` for automation
- `LOG_LEVEL`: `info`, `debug`, `error`

**AI Generator**:
- `PYTHONUNBUFFERED`: `1` (for real-time logs)
- `REDIS_HOST`: Redis hostname (default: `redis`)
- `VAULT_ADDR`: Vault address (default: `http://vault:8200`)
- `AI_PROVIDER`: Provider type (`openai`, `anthropic`, `gemini`, `ollama`)
- `AI_MODEL`: LLM model (default: `gpt-4.1`)
- `OPENAI_API_KEY`: OpenAI API key
- `ANTHROPIC_API_KEY`: Anthropic API key
- `GEMINI_API_KEY`: Google Gemini API key

### Monitoring Access

After deployment:
- **Grafana**: http://localhost:3001 (admin / ansible-mcp)
- **Prometheus**: http://localhost:9090
- **AWX**: http://localhost:8052
- **GitLab**: http://localhost:8080 (root / ansible-mcp-2024)
- **Vault**: http://localhost:8200 (token: myroot)

---

## Troubleshooting

### Issue: MCP Server won't start

**Symptoms**: `docker compose up` fails for ansible-mcp

**Diagnosis**:
```bash
docker compose logs ansible-mcp
```

**Common Causes**:
1. **Port conflict**: Port 3000 already in use
   - **Fix**: Change port in docker-compose.yml or kill conflicting process

2. **Build error**: TypeScript compilation failed
   - **Fix**: `npm run build` locally to see errors

3. **Missing dependencies**: node_modules not installed
   - **Fix**: `npm install` then rebuild

### Issue: Playbook generation fails

**Symptoms**: `generate_playbook` returns success: false

**Diagnosis**:
```bash
# Check MCP server logs
docker compose logs ansible-mcp

# Check Python generator logs
docker compose logs ai-generator
```

**Common Causes**:
1. **Invalid prompt**: Prompt too vague or ambiguous
   - **Fix**: Provide more specific prompt with keywords

2. **Template not found**: Specified template doesn't exist
   - **Fix**: Check available templates in `loadTemplates()` or omit template parameter

3. **YAML generation error**: Python code produced invalid YAML
   - **Fix**: Check playbook_generator.py logs, validate YAML manually

### Issue: Playbook validation fails

**Symptoms**: `validate_playbook` shows errors

**Diagnosis**:
```bash
# Read the validation error message
# Common issues:
# - YAML syntax error (indentation, colons)
# - Missing required fields (name, hosts, tasks)
# - Invalid module parameters
```

**Fixes**:
1. **Indentation errors**: Use `fixIndentation()` method or manual fix
2. **Syntax errors**: Use `fixCommonSyntax()` or manual YAML validation
3. **Ansible errors**: Check Ansible module documentation

### Issue: Playbook execution fails

**Symptoms**: `run_playbook` returns errors

**Diagnosis**:
```bash
# Check stdout/stderr in response
# Check Ansible logs
cat logs/ansible.log

# Test manually
ansible-playbook -i inventory/hosts playbooks/playbook_123.yml -vvv
```

**Common Causes**:
1. **SSH connection failure**: Can't reach target hosts
   - **Fix**: Check inventory, SSH keys, network connectivity

2. **Permission denied**: Task needs privilege escalation
   - **Fix**: Add `become: yes` to play or task

3. **Module not found**: Ansible collection not installed
   - **Fix**: `ansible-galaxy collection install <collection>`

### Issue: Can't connect to Redis/Vault

**Symptoms**: Connection errors in logs

**Diagnosis**:
```bash
# Check service status
docker compose ps

# Check network
docker network inspect mannos-ansible_mcp-solution_ansible-network

# Test connectivity
docker compose exec ansible-mcp ping redis
docker compose exec ansible-mcp curl http://vault:8200/v1/sys/health
```

**Fixes**:
1. **Service not running**: `docker compose up -d redis vault`
2. **Network issues**: `docker compose down && docker compose up -d`
3. **Vault sealed**: Unseal Vault (dev mode shouldn't seal)

### Issue: TypeScript compilation errors

**Symptoms**: `npm run build` fails

**Common Errors**:
1. **Type mismatch**: `error TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'`
   - **Fix**: Add proper type assertions or fix types

2. **Import errors**: `error TS2307: Cannot find module 'X'`
   - **Fix**: `npm install @types/X` or check import path

3. **Strict mode violations**: `error TS2722: Cannot invoke an object which is possibly 'undefined'`
   - **Fix**: Add null checks or use optional chaining (`?.`)

---

## Best Practices for AI Assistants

### When Generating Playbooks

1. **Analyze prompt thoroughly**: Extract all requirements before generating
2. **Use templates when applicable**: Don't reinvent common patterns
3. **Validate immediately**: Always validate after generation
4. **Add best practices**: Tags, error handling, idempotency
5. **Include documentation**: Comments in playbook for complex logic

### When Modifying Code

1. **Read existing code first**: Understand patterns before adding new code
2. **Follow conventions**: Match existing style and structure
3. **Test thoroughly**: Unit tests + integration tests
4. **Update documentation**: Keep CLAUDE.md and README.md in sync
5. **Use proper git workflow**: Meaningful commits, correct branch

### When Debugging

1. **Check logs first**: Most issues show up in logs
2. **Reproduce locally**: Use docker compose for consistent environment
3. **Validate assumptions**: Test each component separately
4. **Use verbose flags**: `-vvv` for Ansible, `DEBUG` for logs
5. **Ask for clarification**: If unsure, ask the user for more context

### Communication with User

1. **Be explicit**: State what you're doing and why
2. **Show progress**: Use TodoWrite to track tasks
3. **Explain errors**: Don't just show error, explain what it means
4. **Offer alternatives**: Multiple solutions when applicable
5. **Verify changes**: Confirm with user before major modifications

---

## Appendix

### Useful Commands Reference

```bash
# Docker
docker compose up -d                    # Start all services
docker compose down                      # Stop all services
docker compose restart ansible-mcp       # Restart MCP server
docker compose logs -f ansible-mcp       # Tail logs
docker compose exec ansible-mcp bash     # Shell into container

# TypeScript
npm install                              # Install dependencies
npm run build                            # Compile TypeScript
npm run dev                              # Development mode
npm test                                 # Run tests
npm run lint                             # Lint code
npm run format                           # Format code

# Python
pip install -r requirements.txt          # Install dependencies
python src/playbook_generator.py         # Test generator
pytest tests/                            # Run tests
black src/                               # Format code
flake8 src/                              # Lint code

# Ansible
ansible-playbook playbook.yml -i inventory/hosts     # Run playbook
ansible-playbook playbook.yml --syntax-check         # Check syntax
ansible-playbook playbook.yml --check                # Dry run
ansible-lint playbook.yml                            # Lint playbook
ansible-galaxy collection install community.general # Install collection

# Git
git status                               # Check status
git add .                                # Stage all changes
git commit -m "message"                  # Commit
git push -u origin branch-name           # Push to branch
git log --oneline -10                    # View recent commits
```

### Key File Locations

- **Playbooks**: `/workspace/playbooks` (in container) or `./playbooks` (host)
- **Inventory**: `/workspace/inventory` (in container) or `./inventory` (host)
- **Logs**: `/workspace/logs` (in container) or `./logs` (host)
- **Ansible config**: `./ansible.cfg`
- **Vault password**: `/workspace/.vault_pass` (in container)

### External Resources

- **MCP Protocol**: https://modelcontextprotocol.io
- **Ansible Docs**: https://docs.ansible.com
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Zod Documentation**: https://zod.dev
- **Docker Compose**: https://docs.docker.com/compose/

---

**End of CLAUDE.md**

This file should be updated whenever significant architectural changes, new conventions, or important patterns are introduced to the codebase.
