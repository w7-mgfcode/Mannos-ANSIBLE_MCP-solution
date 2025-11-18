# Ansible MCP Server - Comprehensive Codebase Analysis

**Repository**: Mannos-ANSIBLE_MCP-solution  
**Version**: 2.0.0  
**Date**: 2025-11-18  
**MCP SDK Version**: 1.22.0

---

## 1. SOURCE CODE FILES

### 1.1 TypeScript Files

#### `/src/server.ts` (1,932 lines)
**Purpose**: Main MCP server implementation using TypeScript  
**Key Classes**:
- `AnsibleMCPServer`: Main server class with initialization, tool registration, and execution

**Key Methods**:
- `initialize()`: Sets up work directories, Redis, Vault, metrics, AI providers, templates, and handlers
- `loadTemplates()`: Loads three built-in playbook templates (kubernetes_deployment, docker_setup, system_hardening)
- `setupHandlers()`: Registers 10 MCP tools with the server
- `generatePlaybook()`: Generates playbooks from prompts (with AI or template-based fallback)
- `validatePlaybook()`: Validates YAML syntax, Ansible syntax, and detects secrets
- `runPlaybook()`: Executes playbooks with proper sandboxing and monitoring
- `refinePlaybook()`: Improves playbooks based on feedback using AI or rule-based refinement
- `lintPlaybook()`: Runs ansible-lint on playbooks
- `listPromptTemplates()`: Lists available prompt templates with filtering
- `getPromptTemplate()`: Retrieves detailed template information
- `enrichPrompt()`: Enriches prompts with few-shot examples and chain-of-thought reasoning
- `generateWithTemplate()`: Generates playbooks using optimized templates
- `updateTemplateVersion()`: Creates new versions of prompt templates with changelog
- `getTemplateHistory()`: Retrieves version history for templates

**Security Features**:
- Path validation against null bytes and traversal attempts
- Secrets detection (AWS keys, passwords, tokens, private keys, JWT, etc.)
- Rate limiting (configurable, default 100 req/min)
- Command injection prevention using safe execFile with argument arrays
- File size validation (max 1MB default)
- Secure file permissions (0o600)
- Input sanitization for tags and user inputs

**Infrastructure Integration**:
- Redis connection with retry strategy
- HashiCorp Vault integration for secrets management
- Prometheus metrics collection (7 custom metrics)
- Health check endpoints (/health, /metrics)
- Winston logging with file transport

**Metrics Tracked**:
- `ansible_mcp_playbooks_generated_total`: Counter with labels [template, status]
- `ansible_mcp_playbooks_executed_total`: Counter with labels [status, check_mode]
- `ansible_mcp_validation_errors_total`: Counter
- `ansible_mcp_execution_duration_seconds`: Histogram (buckets: 0.1-300s)
- `ansible_mcp_secrets_detected_total`: Counter
- `ansible_mcp_auth_failures_total`: Counter
- `ansible_mcp_active_connections`: Gauge

#### `/src/prompt_templates.ts` (500+ lines)
**Purpose**: Prompt template library for few-shot learning and chain-of-thought reasoning  
**Key Exports**:
- `PromptTemplateLibrary`: Main class for template management
- `PromptTemplate`: Interface defining template structure with versioning
- `EnrichedPrompt`: Interface for prompts enriched with context
- `TemplateCategory`: Enum (kubernetes, docker, security, database, monitoring, network, cicd, cloud, general)

**Key Methods**:
- `initialize()`: Async initialization to load templates from disk
- `listTemplates()`: Search and filter templates
- `getTemplate()`: Retrieve specific template
- `enrichPrompt()`: Add few-shot examples and chain-of-thought sections
- `updateTemplateVersion()`: Create template versions with changelog
- `saveTemplate()`: Persist template to disk
- `loadTemplatesFromDisk()`: Load JSON templates from directory

**Template Components**:
- System prompt for AI models
- User prompt template with variables
- Few-shot examples (input/output/explanation)
- Chain-of-thought reasoning patterns
- Context enrichment (required/optional context, environment hints, best practices)
- Metadata (tags, timestamps, author)
- Version history with changelog

#### `/src/providers/index.ts` (22 lines)
**Purpose**: Main export module for AI providers

**Exports**:
- `AIProvider` (base class)
- `OpenAIProvider`, `AnthropicProvider`, `GeminiProvider`, `OllamaProvider`
- `ProviderFactory`, `createProvider`, `createProviderFromEnv`

#### `/src/providers/base.ts` (176 lines)
**Purpose**: Abstract base class defining provider interface

**Key Interfaces**:
- `AIMessage`: {role, content}
- `AIGenerationOptions`: {temperature, maxTokens, topP, stopSequences, stream}
- `AIGenerationResult`: {content, tokensUsed, finishReason, model}
- `AIProviderConfig`: {apiKey, model, baseURL, timeout, maxRetries}

**Abstract Methods**:
- `generate()`: Generate completion from AI model
- `generatePlaybook()`: Generate playbook from prompt and context
- `getSystemPrompt()`: Get system prompt for playbook generation
- `formatPlaybookPrompt()`: Format user prompt with context
- `test()`: Test provider connection

#### `/src/providers/openai.ts` (150+ lines)
**Purpose**: OpenAI API implementation (GPT-4, GPT-3.5-turbo)

**Default Model**: gpt-4.1  
**Features**:
- Supports custom base URL
- Configurable temperature, max_tokens, top_p
- Token usage tracking
- Request retries with configurable max attempts
- Streaming (prepared for future use)

#### `/src/providers/anthropic.ts` (180+ lines)
**Purpose**: Anthropic Claude API implementation

**Default Model**: claude-sonnet-4-5-20250929  
**Features**:
- Supports Claude 3 family (Opus, Sonnet, Haiku)
- System message separated from conversation messages
- Custom base URL support
- API version: 2023-06-01
- Token usage tracking

#### `/src/providers/gemini.ts`
**Purpose**: Google Gemini API implementation

#### `/src/providers/ollama.ts`
**Purpose**: Ollama local LLM implementation

#### `/src/providers/factory.ts`
**Purpose**: Provider factory for environment-based initialization

**ProviderType Enum**: 'openai' | 'anthropic' | 'gemini' | 'ollama'

### 1.2 Python Files

#### `/src/playbook_generator.py` (900+ lines)
**Purpose**: AI-powered Ansible playbook generation with context awareness

**Key Classes**:
- `PlaybookType` (Enum): kubernetes, docker, system, network, database, monitoring, security, cicd
- `PlaybookContext` (dataclass): Stores prompt analysis results
- `PlaybookGenerator`: Main generation logic

**Core Methods**:
- `analyze_prompt()`: Extract intent, environment, requirements, and tags from prompt
- `generate()`: Create playbook from context using templates or generic generation
- `_extract_requirements()`: Detect HA, scalability, security, monitoring, backup, performance requirements
- `_generate_tags()`: Create appropriate Ansible tags based on keywords
- `_enhance_with_requirements()`: Add tasks for detected requirements

**Enhancement Methods**:
- `_add_ha_tasks()`: keepalived, health checks
- `_add_security_tasks()`: firewall, fail2ban, SSH hardening
- `_add_monitoring_tasks()`: node_exporter, Prometheus integration
- `_add_backup_tasks()`: backup directory, cron jobs
- `_add_installation_tasks()`: Installation-specific tasks
- `_add_configuration_tasks()`: Configuration-specific tasks
- `_add_deployment_tasks()`: Deployment-specific tasks

**Template Methods**:
- `_kubernetes_template()`: K8s deployment with namespace, replicas, image
- `_docker_template()`: Docker installation and Docker Compose
- `_system_template()`: System configuration baseline
- `_database_template()`: PostgreSQL setup
- `_monitoring_template()`: Prometheus + Grafana
- `_security_template()`: Security hardening

### 1.3 Test Files

#### `/src/server.test.ts` (Jest)
**Purpose**: Unit tests for security features and core functionality

**Test Categories**:
- Path Validation tests (traversal prevention)
- Rate limiting tests
- Secrets detection tests
- Playbook generation tests
- Infrastructure integration tests (Redis, Vault mocks)

#### `/tests/test_playbook_generator.py` (pytest)
**Purpose**: Python playbook generator unit tests

#### `/tests/conftest.py`
**Purpose**: pytest configuration and fixtures

---

## 2. MCP TOOLS

### Complete Tool List (10 Tools)

#### 1. `generate_playbook` (Generative)
**Description**: Generate an Ansible playbook based on natural language prompt

**Parameters**:
```typescript
{
  prompt: string;                    // Required: Natural language description
  template?: string;                 // Optional: kubernetes_deployment, docker_setup, system_hardening
  context?: {
    target_hosts?: string;           // Target hosts or group
    environment?: string;            // production, staging, development
    tags?: string[];                 // Tags for selective execution
  }
}
```

**Returns**:
```json
{
  "playbook_path": "string",
  "playbook_content": "string (YAML)",
  "validation": { "valid": boolean, "errors?": string[] },
  "secrets_warning?": { "message": string, "count": number, "details": array },
  "message": "string"
}
```

**Annotations**: Non-destructive, generative

---

#### 2. `validate_playbook` (Read-only)
**Description**: Validate Ansible playbook for YAML syntax, Ansible syntax, and best practices

**Parameters**:
```typescript
{
  playbook_path: string;             // Required: Path to playbook file
  strict?: boolean;                  // Optional: Enable strict validation
}
```

**Returns**:
```json
{
  "valid": boolean,
  "validation_results": {
    "yaml_valid": boolean,
    "yaml_errors?": string[],
    "ansible_syntax_valid": boolean,
    "ansible_syntax_errors?": string,
    "secrets_detected?": array,
    "warnings": string[]
  }
}
```

**Annotations**: Read-only, non-destructive, idempotent

---

#### 3. `run_playbook` (Execution)
**Description**: Execute an Ansible playbook against specified inventory with optional dry-run

**Parameters**:
```typescript
{
  playbook_path: string;             // Required: Path to playbook
  inventory: string;                 // Required: Inventory file or host pattern
  extra_vars?: Record<string, any>;  // Optional: Extra variables
  check_mode?: boolean;              // Optional: Dry run mode
  tags?: string[];                   // Optional: Tags to execute
}
```

**Returns**:
```json
{
  "success": boolean,
  "output": "string (Ansible output)",
  "errors": "string (stderr) or null",
  "duration_seconds": number,
  "command": "string"
}
```

**Annotations**: Destructive (when check_mode=false), non-idempotent

---

#### 4. `refine_playbook` (Modify)
**Description**: Refine and improve existing playbook based on feedback and validation errors

**Parameters**:
```typescript
{
  playbook_path: string;             // Required: Path to playbook
  feedback: string;                  // Required: Improvement feedback
  validation_errors?: string[];      // Optional: Validation errors to fix
}
```

**Returns**:
```json
{
  "refined_playbook_path": "string",
  "changes_applied": string[],
  "refined_content": "string (YAML)",
  "ai_provider?": "string"
}
```

**Annotations**: Non-destructive, modifying

---

#### 5. `lint_playbook` (Read-only)
**Description**: Run ansible-lint on playbook to check for best practices and common issues

**Parameters**:
```typescript
{
  playbook_path: string;             // Required: Path to playbook
}
```

**Returns**:
```json
{
  "lint_output": "string",
  "errors": "string or null"
}
```

**Annotations**: Read-only, non-destructive, idempotent

---

#### 6. `list_prompt_templates` (Read-only)
**Description**: List available prompt templates with optional filtering

**Parameters**:
```typescript
{
  category?: enum;                   // kubernetes, docker, security, database, monitoring, network, cicd, cloud, general
  tags?: string[];                   // Filter by tags
  search?: string;                   // Search in names/descriptions
}
```

**Returns**:
```json
{
  "count": number,
  "templates": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "version": "string",
      "category": "string",
      "tags": string[],
      "num_examples": number,
      "num_best_practices": number
    }
  ]
}
```

**Annotations**: Read-only, non-destructive, idempotent

---

#### 7. `get_prompt_template` (Read-only)
**Description**: Get detailed information about a specific prompt template

**Parameters**:
```typescript
{
  template_id: string;               // Required: Template ID
}
```

**Returns**:
```json
{
  "template": {
    "id": "string",
    "name": "string",
    "description": "string",
    "version": "string",
    "category": "string",
    "system_prompt": "string",
    "user_prompt_template": "string",
    "few_shot_examples": [
      { "input": "string", "output": "string", "explanation?": "string" }
    ],
    "chain_of_thought": {
      "steps": string[],
      "reasoning_pattern": "string"
    },
    "context_enrichment": {
      "required_context": string[],
      "optional_context": string[],
      "environment_hints": { key: string[] },
      "best_practices": string[]
    },
    "tags": string[],
    "created_at": "ISO8601",
    "updated_at": "ISO8601",
    "author": "string",
    "changelog": [
      { "version": "string", "date": "ISO8601", "changes": string[] }
    ]
  }
}
```

**Annotations**: Read-only, non-destructive, idempotent

---

#### 8. `enrich_prompt` (Read-only)
**Description**: Enrich user prompt with few-shot examples, chain-of-thought reasoning, and context hints

**Parameters**:
```typescript
{
  prompt: string;                    // Required: User prompt to enrich
  template_id: string;               // Required: Template to use
  additional_context?: Record<string, any>; // Optional: Context variables
}
```

**Returns**:
```json
{
  "original_prompt": "string",
  "enriched_prompt": "string",
  "context_hints": string[],
  "sections": {
    "system_context_length": number,
    "few_shot_section_length": number,
    "chain_of_thought_section_length": number
  }
}
```

**Annotations**: Read-only, non-destructive, idempotent

---

#### 9. `generate_with_template` (Generative)
**Description**: Generate playbook using optimized prompt template with few-shot learning and chain-of-thought

**Parameters**:
```typescript
{
  prompt: string;                    // Required: Natural language prompt
  template_id: string;               // Required: Template to use
  context?: {
    target_hosts?: string;
    environment?: string;
    tags?: string[];
  },
  additional_context?: Record<string, any>; // Optional: Context variables
}
```

**Returns**:
```json
{
  "playbook_path": "string",
  "playbook_content": "string (YAML)",
  "validation": { "valid": boolean, "errors?": string[] },
  "template_used": "string",
  "context_hints": string[],
  "message": "string"
}
```

**Annotations**: Non-destructive, generative

---

#### 10. `update_template_version` (Modify)
**Description**: Update prompt template with new content and create new version

**Parameters**:
```typescript
{
  template_id: string;               // Required: Template ID
  updates: {
    name?: string;
    description?: string;
    system_prompt?: string;
    user_prompt_template?: string;
    best_practices?: string[];
  },
  change_description: string[];      // Required: List of changes
}
```

**Returns**:
```json
{
  "template_id": "string",
  "new_version": "string",
  "updated_at": "ISO8601",
  "changes": string[]
}
```

**Annotations**: Non-destructive, modifying

---

#### 11. `get_template_history` (Read-only)
**Description**: Get version history and changelog for a prompt template

**Parameters**:
```typescript
{
  template_id: string;               // Required: Template ID
}
```

**Returns**:
```json
{
  "template_id": "string",
  "history": [
    {
      "version": "string",
      "date": "ISO8601",
      "changes": string[]
    }
  ]
}
```

**Annotations**: Read-only, non-destructive, idempotent

---

## 3. DOCKER SERVICES

### docker-compose.yml Configuration

#### Service 1: `ansible-mcp`
**Image**: Built from Dockerfile.mcp  
**Container Name**: ansible-mcp-server  
**Port**: 3000:3000  
**Restart Policy**: unless-stopped

**Volumes**:
- `./playbooks` → `/workspace/playbooks`
- `./inventory` → `/workspace/inventory`
- `./logs` → `/workspace/logs`
- `/var/run/docker.sock` → `/var/run/docker.sock:ro` (Docker access)

**Environment Variables**:
- `NODE_ENV`: production
- `MCP_PORT`: 3000
- `ANSIBLE_HOST_KEY_CHECKING`: False
- `ANSIBLE_INVENTORY`: /workspace/inventory
- `LOG_LEVEL`: info
- `AI_PROVIDER`: ${AI_PROVIDER:-openai}
- `AI_MODEL`: ${AI_MODEL:-gpt-4}
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_API_KEY`: API keys
- `AI_BASE_URL`: Custom AI endpoint (optional)

**Dependencies**: redis, vault  
**Health Check**: HTTP GET /health on port 3000

---

#### Service 2: `ai-generator`
**Image**: Built from Dockerfile.python  
**Container Name**: ansible-ai-generator  
**Port**: 8000:8000  
**Restart Policy**: unless-stopped

**Volumes**:
- `./src` → `/app/src`
- `./templates` → `/app/templates`
- `./playbooks` → `/app/playbooks`

**Environment Variables**:
- `PYTHONUNBUFFERED`: 1
- `REDIS_HOST`: redis
- `VAULT_ADDR`: http://vault:8200
- `API_KEY`: ${OPENAI_API_KEY:-}
- `MODEL_NAME`: gpt-4

**Dependencies**: redis  
**Health Check**: HTTP GET /health on port 8000

---

#### Service 3: `redis`
**Image**: redis:7-alpine  
**Container Name**: ansible-redis  
**Port**: 6379:6379  
**Restart Policy**: unless-stopped

**Volumes**: redis-data:/data  
**Command**: redis-server --appendonly yes  
**Purpose**: Caching and job queue

---

#### Service 4: `vault`
**Image**: hashicorp/vault:latest  
**Container Name**: ansible-vault  
**Port**: 8200:8200  
**Restart Policy**: unless-stopped

**Environment Variables**:
- `VAULT_DEV_ROOT_TOKEN_ID`: myroot
- `VAULT_DEV_LISTEN_ADDRESS`: 0.0.0.0:8200

**Volumes**: 
- vault-data:/vault/data
- ./vault/config:/vault/config

**Command**: server -dev  
**Purpose**: Secrets management

---

#### Service 5: `gitlab`
**Image**: gitlab/gitlab-ce:latest  
**Container Name**: ansible-gitlab  
**Ports**: 
- 8080:80
- 8443:443
- 8022:22

**Hostname**: gitlab.local  
**Purpose**: Version control (optional)

**Configuration**:
- Root password: ansible-mcp-2024
- SSH port: 8022

---

#### Service 6: `prometheus`
**Image**: prom/prometheus:latest  
**Container Name**: ansible-prometheus  
**Port**: 9090:9090  
**Restart Policy**: unless-stopped

**Volumes**:
- ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
- prometheus-data:/prometheus

**Command**:
- --config.file=/etc/prometheus/prometheus.yml
- --storage.tsdb.path=/prometheus

**Purpose**: Metrics collection

---

#### Service 7: `grafana`
**Image**: grafana/grafana:latest  
**Container Name**: ansible-grafana  
**Port**: 3001:3000  
**Restart Policy**: unless-stopped

**Volumes**:
- grafana-data:/var/lib/grafana
- ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
- ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources

**Environment Variables**:
- `GF_SECURITY_ADMIN_PASSWORD`: ansible-mcp
- `GF_INSTALL_PLUGINS`: redis-datasource,redis-app

**Credentials**: admin / ansible-mcp  
**Purpose**: Metrics visualization

---

#### Service 8: `awx-web`
**Image**: ansible/awx:latest  
**Container Name**: ansible-awx-web  
**Port**: 8052:8052  
**Restart Policy**: unless-stopped

**Environment Variables**:
- `SECRET_KEY`: ${AWX_SECRET_KEY:-awxsecret}
- `DATABASE_NAME`: awx
- `DATABASE_USER`: awx
- `DATABASE_PASSWORD`: awxpass
- `DATABASE_HOST`: postgres
- `DATABASE_PORT`: 5432
- `REDIS_HOST`: redis

**Purpose**: Ansible UI (optional)

---

#### Service 9: `awx-task`
**Image**: ansible/awx:latest  
**Container Name**: ansible-awx-task  
**Command**: /usr/bin/launch_awx_task.sh  
**Purpose**: AWX task execution

---

#### Service 10: `postgres`
**Image**: postgres:15-alpine  
**Container Name**: ansible-postgres  
**Port**: 5432:5432  
**Restart Policy**: unless-stopped

**Environment Variables**:
- `POSTGRES_USER`: awx
- `POSTGRES_PASSWORD`: awxpass
- `POSTGRES_DB`: awx

**Purpose**: AWX database

---

### Network Configuration
- **Driver**: bridge
- **Name**: ansible-network
- **Subnet**: 172.25.0.0/16

### Persistent Volumes
- redis-data
- vault-data
- gitlab-config, gitlab-logs, gitlab-data
- prometheus-data
- grafana-data
- postgres-data
- awx-projects

---

## 4. CONFIGURATION FILES

### 4.1 Application Configuration Files

#### `package.json` (Node.js)
**Version**: 2.0.0  
**Type**: ES Module (ESM)  
**Main Entry**: dist/server.js

**Scripts**:
- `build`: tsc (TypeScript compilation)
- `start`: node dist/server.js
- `dev`: tsx src/server.ts (hot reload)
- `test`: jest
- `lint`: eslint
- `format`: prettier

**Dependencies**:
- @modelcontextprotocol/sdk: ^1.22.0
- axios: ^1.6.0
- ioredis: ^5.8.2
- js-yaml: ^4.1.0
- node-vault: ^0.10.9
- prom-client: ^15.1.3
- uuid: ^9.0.1
- winston: ^3.18.3
- zod: ^3.22.0

**DevDependencies**:
- jest: ^29.7.0
- ts-jest: ^29.4.5
- tsx: ^4.5.0
- typescript: ^5.3.0
- @typescript-eslint/*: ^6.14.0
- eslint: ^8.55.0
- prettier: ^3.1.0

---

#### `requirements.txt` (Python)
**Core**:
- ansible>=2.15.0
- ansible-lint>=6.17.0
- pyyaml>=6.0
- jinja2>=3.1.0

**AI/ML**:
- openai>=1.54.0
- langchain>=0.3.7
- langchain-openai>=0.2.9
- langchain-anthropic>=0.3.0
- langchain-google-genai>=2.0.0
- tiktoken>=0.8.0
- anthropic>=0.39.0
- google-generativeai>=0.8.3

**Web Framework**:
- fastapi>=0.104.0
- uvicorn>=0.24.0
- pydantic>=2.5.0

**Database**:
- redis>=5.0.0
- sqlalchemy>=2.0.0
- alembic>=1.12.0

**Utilities**:
- python-dotenv>=1.0.0
- click>=8.1.0
- rich>=13.0.0
- requests>=2.31.0
- httpx>=0.25.0

**Testing**:
- pytest>=7.4.0
- pytest-cov>=4.1.0
- pytest-asyncio>=0.21.0
- pytest-mock>=3.12.0

**Development**:
- black>=23.0.0
- flake8>=6.1.0
- mypy>=1.7.0

**Cloud & Infrastructure**:
- boto3>=1.29.0 (AWS)
- azure-mgmt-compute>=30.0.0 (Azure)
- google-cloud-compute>=1.14.0 (GCP)
- kubernetes>=28.1.0

---

#### `ansible.cfg`
**Inventory**: /workspace/inventory/hosts  
**Remote User**: ansible  
**Host Key Checking**: False  
**Retry Files**: Disabled

**Performance Tuning**:
- Forks: 50 (parallelism)
- Pipelining: True
- Strategy: free (non-blocking)
- Transport: smart

**Paths**:
- roles_path: /workspace/roles:/etc/ansible/roles
- library: /workspace/library
- module_utils: /workspace/module_utils
- lookup_plugins: /workspace/lookup_plugins
- filter_plugins: /workspace/filter_plugins
- action_plugins: /workspace/action_plugins
- callback_plugins: /workspace/callback_plugins

**Privilege Escalation**:
- become: True
- become_method: sudo
- become_user: root

**Logging**: /workspace/logs/ansible.log

---

#### `tsconfig.json`
**Target**: ES2020  
**Module**: ESNext  
**Declaration**: true  
**Strict**: true  
**Skiplib**: true  
**Module Resolution**: NodeNext

---

#### `jest.config.cjs`
**Preset**: ts-jest  
**Test Environment**: node  
**Coverage Threshold**: 80%  
**Test Match**: src/**/*.test.ts

---

#### `.eslintrc.json`
**Parser**: @typescript-eslint/parser  
**Extends**: eslint:recommended  
**Rules**: TypeScript-specific configurations

---

#### `pytest.ini`
**Test Paths**: tests/  
**Python Files**: test_*.py

---

#### `.env.example`
**Configuration Template**:
- AI_PROVIDER: openai | anthropic | gemini | ollama
- AI_MODEL: Model name
- OPENAI_API_KEY: API key
- ANTHROPIC_API_KEY: API key
- GEMINI_API_KEY: API key
- REDIS_HOST: localhost
- VAULT_ADDR: http://localhost:8200
- VAULT_TOKEN: token
- LOG_LEVEL: debug | info | warn | error

---

### 4.2 Dockerfile Configurations

#### `Dockerfile.mcp` (TypeScript MCP Server)
**Builder Stage**: Node 20-alpine with Python build tools  
**Production Stage**: Node 20-alpine with Ansible

**Installed Tools**:
- ansible, ansible-lint
- python3, pip3
- git, openssh-client
- curl, jq
- Python packages: kubernetes, openshift, pyvmomi, boto3, azure-cli

**Working Directory**: /workspace  
**Exposed Port**: 3000  
**Health Check**: HTTP GET http://localhost:3000/health

---

#### `Dockerfile.python` (AI Generator Service)
**Builder Stage**: Python 3.10-slim with build tools  
**Production Stage**: Python 3.10-slim with Ansible

**Working Directory**: /app  
**Exposed Port**: 8000  
**Health Check**: HTTP GET http://localhost:8000/health  
**Startup**: uvicorn src.api:app

---

### 4.3 Monitoring Configuration

#### `monitoring/prometheus.yml`
**Scrape Interval**: 15s  
**Evaluation Interval**: 15s

**Targets**:
- ansible-mcp:3000/metrics
- prometheus:9090/metrics (self)
- redis:6379 (via exporter)
- node:9100 (via exporter)

---

#### `monitoring/grafana/dashboards/ansible-mcp-server.json`
**Purpose**: Pre-built Grafana dashboard for visualizing metrics

**Visualizations**:
- Playbooks generated (counter)
- Playbooks executed (counter)
- Execution duration (histogram)
- Secrets detected (counter)
- Validation errors (counter)
- Active connections (gauge)
- Redis connection status
- Vault connection status

---

## 5. TEMPLATES

### 5.1 Built-in Playbook Templates (in server.ts)

#### 1. `kubernetes_deployment`
**Target**: Kubernetes clusters  
**Includes**:
- Namespace creation
- Deployment with replicas
- Container port configuration
- Configurable image and app name
- Default 3 replicas

---

#### 2. `docker_setup`
**Target**: Docker hosts  
**Includes**:
- Docker installation and GPG key setup
- Docker Compose plugin
- Service startup and enablement
- APT cache updates (Debian/Ubuntu)

---

#### 3. `system_hardening`
**Target**: All hosts  
**Includes**:
- System package updates
- SSH hardening (disable root login, password auth)
- UFW firewall configuration (ports 22, 80, 443)
- Handlers for SSH restart

---

### 5.2 Prompt Template Categories

From `PromptTemplateLibrary` class:
1. **kubernetes**: K8s deployment, scaling, ingress
2. **docker**: Container setup, registry, compose
3. **security**: Firewall, SSH, TLS, vault
4. **database**: Database installation and config
5. **monitoring**: Prometheus, Grafana, alerting
6. **network**: Load balancing, DNS, routing
7. **cicd**: Jenkins, GitLab CI, pipelines
8. **cloud**: AWS, Azure, GCP deployment
9. **general**: Generic Ansible operations

---

### 5.3 Python Template Methods (playbook_generator.py)

#### `_kubernetes_template()`
- kubectl installation
- Namespace creation
- Deployment with labels and selectors
- Configurable replicas and image

#### `_docker_template()`
- Docker installation
- GPG key setup
- Docker Compose
- Service enablement

#### `_system_template()`
- Package updates
- System configuration
- Base role setup

#### `_database_template()`
- PostgreSQL installation
- User and database creation
- Configuration

#### `_monitoring_template()`
- Prometheus installation
- Grafana setup
- node_exporter configuration

#### `_security_template()`
- Firewall configuration
- SSH hardening
- fail2ban setup

---

## 6. DEPENDENCIES SUMMARY

### NPM Dependencies (Node.js)
**Count**: 9 production + 9 dev

**Key Packages**:
- MCP SDK: @modelcontextprotocol/sdk v1.22.0
- API Clients: axios, openai (implicit), anthropic (implicit)
- Database: ioredis, node-vault
- Data Processing: js-yaml, zod, uuid
- Logging: winston
- Metrics: prom-client
- Development: TypeScript, Jest, ESLint, Prettier

---

### Python Dependencies
**Count**: 60+ packages

**Categories**:
- Infrastructure: ansible (2.15+), ansible-lint
- AI: openai, anthropic, google-generativeai, langchain (multiple)
- Web: fastapi, uvicorn, pydantic
- Database: redis, sqlalchemy, alembic
- Cloud: boto3, azure-mgmt-compute, google-cloud-compute
- Kubernetes: kubernetes client library
- Development: pytest, black, flake8, mypy

---

## 7. DOCUMENTATION FILES

### Existing Documentation

1. **README.md** (14,528 bytes)
   - Overview, features, architecture
   - Installation and quick start
   - Configuration guide
   - Use cases with examples
   - MCP tools reference

2. **USAGE.md** (12,910 bytes)
   - Quick start guide
   - Step-by-step examples
   - Common use cases
   - Prompt templates
   - Troubleshooting

3. **CLAUDE.md** (34,995 bytes) - AI Assistant Guide
   - Project overview
   - Architecture and components
   - Codebase structure (detailed)
   - Development workflows
   - Key conventions
   - MCP protocol integration
   - Common tasks
   - Testing strategy
   - Deployment
   - Troubleshooting
   - Best practices for AI assistants

4. **CONTRIBUTING.md** (3,115 bytes)
   - Contribution guidelines
   - Development setup
   - Testing requirements
   - Code style
   - PR process

5. **AI_PROVIDERS.md** (11,852 bytes)
   - AI provider configuration
   - OpenAI setup
   - Anthropic setup
   - Gemini setup
   - Ollama setup
   - Environment variables

6. **MCP_CONFIG.md** (8,890 bytes)
   - MCP configuration
   - Tool definitions
   - Protocol compliance

7. **MCP_ARCHITECTURE.md** (19,461 bytes)
   - Detailed architecture
   - Component interaction
   - Data flow
   - Protocol implementation

8. **MCP_COMPLIANCE_ANALYSIS.md** (19,440 bytes)
   - MCP 2025-03-26 compliance
   - Tool annotations
   - Error handling
   - Server capabilities

9. **MCP_IMPLEMENTATION_SUMMARY.md** (6,783 bytes)
   - Implementation overview
   - Feature summary
   - Quick reference

10. **MCP_ANALYSIS_INDEX.md** (10,256 bytes)
    - Index of all MCP components
    - Tools, schemas, implementations

11. **MCP_QUICK_REFERENCE.md** (9,055 bytes)
    - Quick reference guide
    - Common operations

12. **GITHUB_READY.md** (5,440 bytes)
    - GitHub repository setup
    - License and legal

13. **GITHUB_DEPLOY_HU.md** (12,131 bytes)
    - Hungarian deployment guide

---

## 8. ADDITIONAL FILES & DIRECTORIES

### Source Code Structure
```
src/
├── server.ts                    # Main MCP server
├── server.test.ts              # Unit tests
├── playbook_generator.py       # Python AI generator
├── prompt_templates.ts         # Template library
└── providers/
    ├── index.ts                # Export module
    ├── base.ts                 # Base provider class
    ├── openai.ts               # OpenAI provider
    ├── anthropic.ts            # Anthropic provider
    ├── gemini.ts               # Google Gemini provider
    └── ollama.ts               # Ollama provider
```

### Test Structure
```
tests/
├── __init__.py
├── test_playbook_generator.py  # Python tests
└── conftest.py                 # pytest configuration
```

### Monitoring Structure
```
monitoring/
└── grafana/
    └── dashboards/
        └── ansible-mcp-server.json  # Grafana dashboard
```

### Scripts
- `push_to_github.sh`: Git automation script

### Configuration Files
- `.env.example`: Environment template
- `.eslintrc.json`: ESLint configuration
- `.gitignore`: Git ignore rules
- `setup.cfg`: Python setup configuration
- `jest.config.cjs`: Jest configuration

---

## 9. PROJECT STATISTICS

- **Total Files**: 50+
- **TypeScript Lines**: 2,000+ (server.ts alone: 1,932)
- **Python Lines**: 900+ (playbook_generator.py)
- **Tests**: 2 (Jest, pytest)
- **Docker Services**: 10
- **MCP Tools**: 11
- **Playbook Templates**: 3 built-in + prompt templates
- **Documentation Files**: 13
- **Dependencies**: 9 NPM (prod) + 9 (dev) + 60+ Python

---

## 10. KEY METRICS & MONITORING

### Prometheus Metrics Collected
1. **Counters**:
   - ansible_mcp_playbooks_generated_total [template, status]
   - ansible_mcp_playbooks_executed_total [status, check_mode]
   - ansible_mcp_validation_errors_total
   - ansible_mcp_secrets_detected_total
   - ansible_mcp_auth_failures_total

2. **Histogram**:
   - ansible_mcp_execution_duration_seconds [buckets: 0.1, 0.5, 1, 5, 10, 30, 60, 120, 300]

3. **Gauge**:
   - ansible_mcp_active_connections

### Health Check Endpoints
- **MCP Server**: http://localhost:3000/health
- **Python Generator**: http://localhost:8000/health
- **Metrics**: http://localhost:3000/metrics

### Access Credentials (Default)
| Service | URL | User | Password |
|---------|-----|------|----------|
| Grafana | localhost:3001 | admin | ansible-mcp |
| Prometheus | localhost:9090 | - | - |
| Vault | localhost:8200 | - | myroot (dev token) |
| GitLab | localhost:8080 | root | ansible-mcp-2024 |
| AWX | localhost:8052 | admin | (set in env) |
| Redis | localhost:6379 | - | - |
| PostgreSQL | localhost:5432 | awx | awxpass |

---

## SUMMARY

This is a comprehensive, production-ready **Ansible MCP Server** that:

✅ Provides 11 MCP tools for playbook generation, validation, execution, and refinement  
✅ Integrates 4 AI providers (OpenAI, Anthropic, Gemini, Ollama)  
✅ Includes security hardening (secrets detection, path validation, command injection prevention)  
✅ Features full observability (Prometheus, Grafana, logging)  
✅ Supports infrastructure integration (Redis, Vault, Kubernetes)  
✅ Implements MCP 2025-03-26 compliance  
✅ Includes comprehensive testing and documentation  
✅ Deploys via Docker Compose with 10 services  
✅ Supports prompt templates with few-shot learning and chain-of-thought reasoning  
✅ Follows best practices for DevOps automation

