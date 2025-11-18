# Configuration Guide

> Complete configuration reference for the Ansible MCP Server

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Ansible Configuration](#ansible-configuration)
3. [Docker Compose Configuration](#docker-compose-configuration)
4. [Security Configuration](#security-configuration)
5. [Monitoring Configuration](#monitoring-configuration)

---

## Environment Variables

### MCP Server (TypeScript)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | No |
| `MCP_PORT` | Server port | `3000` | No |
| `LOG_LEVEL` | Logging level | `info` | No |
| `WORK_DIR` | Working directory | `/tmp/ansible-mcp` | No |
| `REDIS_HOST` | Redis hostname | `localhost` | No |
| `REDIS_PORT` | Redis port | `6379` | No |
| `VAULT_ADDR` | Vault address | `http://localhost:8200` | No |
| `VAULT_TOKEN` | Vault token | - | For Vault |
| `RATE_LIMIT` | Requests per minute | `100` | No |
| `MAX_FILE_SIZE` | Max file size (bytes) | `1048576` | No |

### AI Generator (Python)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AI_PROVIDER` | AI provider | `openai` | No |
| `AI_MODEL` | Model to use | `gpt-4` | No |
| `OPENAI_API_KEY` | OpenAI API key | - | For OpenAI |
| `ANTHROPIC_API_KEY` | Anthropic API key | - | For Anthropic |
| `GEMINI_API_KEY` | Google API key | - | For Gemini |
| `OLLAMA_HOST` | Ollama host | `http://localhost:11434` | For Ollama |
| `PYTHONUNBUFFERED` | Unbuffered output | `1` | No |

### Example .env File

```bash
# Server Configuration
NODE_ENV=production
MCP_PORT=3000
LOG_LEVEL=info

# AI Configuration
AI_PROVIDER=openai
AI_MODEL=gpt-4
OPENAI_API_KEY=sk-your-key-here

# Infrastructure
REDIS_HOST=redis
VAULT_ADDR=http://vault:8200
VAULT_TOKEN=myroot

# Security
RATE_LIMIT=100
MAX_FILE_SIZE=1048576

# Monitoring
GRAFANA_ADMIN_PASSWORD=secure-password
```

---

## Ansible Configuration

### ansible.cfg

```ini
[defaults]
# Inventory
inventory = /workspace/inventory/hosts
host_key_checking = False
retry_files_enabled = False

# Performance
forks = 50
pipelining = True
strategy = free
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_facts
fact_caching_timeout = 86400

# Logging
log_path = /workspace/logs/ansible.log
display_skipped_hosts = True

# Callbacks
stdout_callback = yaml
callback_whitelist = profile_tasks

[privilege_escalation]
become = True
become_method = sudo
become_user = root
become_ask_pass = False

[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=60s
pipelining = True
control_path = /tmp/ansible-ssh-%%h-%%p-%%r

[colors]
changed = yellow
ok = green
error = red
```

### Key Settings Explained

#### Performance Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| `forks` | 50 | Parallel processes |
| `pipelining` | True | Reduces SSH operations |
| `strategy` | free | Non-blocking execution |
| `gathering` | smart | Cache facts |
| `fact_caching_timeout` | 86400 | 24-hour cache |

#### SSH Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| `ControlMaster` | auto | Connection multiplexing |
| `ControlPersist` | 60s | Keep connections open |
| `pipelining` | True | Reduce operations |

### Inventory File

```ini
# inventory/hosts

[webservers]
web1.example.com ansible_host=10.0.1.10
web2.example.com ansible_host=10.0.1.11

[databases]
db1.example.com ansible_host=10.0.2.10
db2.example.com ansible_host=10.0.2.11

[kubernetes:children]
k8s_masters
k8s_workers

[k8s_masters]
k8s-master1 ansible_host=10.0.3.10

[k8s_workers]
k8s-worker1 ansible_host=10.0.3.20
k8s-worker2 ansible_host=10.0.3.21

[all:vars]
ansible_user=ansible
ansible_ssh_private_key_file=/workspace/.ssh/id_rsa
```

---

## Docker Compose Configuration

### Service Configuration

#### MCP Server

```yaml
ansible-mcp:
  build:
    context: .
    dockerfile: Dockerfile.mcp
  ports:
    - "3000:3000"
  environment:
    - NODE_ENV=production
    - REDIS_HOST=redis
    - VAULT_ADDR=http://vault:8200
  volumes:
    - ./playbooks:/workspace/playbooks
    - ./inventory:/workspace/inventory
    - ./logs:/workspace/logs
  depends_on:
    - redis
    - vault
  networks:
    - ansible-network
```

#### AI Generator

```yaml
ai-generator:
  build:
    context: .
    dockerfile: Dockerfile.python
  ports:
    - "8000:8000"
  environment:
    - PYTHONUNBUFFERED=1
    - AI_PROVIDER=${AI_PROVIDER:-openai}
    - OPENAI_API_KEY=${OPENAI_API_KEY}
  networks:
    - ansible-network
```

#### Redis

```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redis-data:/data
  command: redis-server --appendonly yes
  networks:
    - ansible-network
```

#### Vault

```yaml
vault:
  image: hashicorp/vault:1.15
  ports:
    - "8200:8200"
  environment:
    - VAULT_DEV_ROOT_TOKEN_ID=myroot
    - VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200
  cap_add:
    - IPC_LOCK
  networks:
    - ansible-network
```

### Production Overrides

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  ansible-mcp:
    restart: always
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G

  redis:
    restart: always
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}

  vault:
    restart: always
    volumes:
      - vault-data:/vault/data
      - ./vault/config:/vault/config
    command: vault server -config=/vault/config/config.hcl
```

---

## Security Configuration

### Rate Limiting

```typescript
// Configuration in server.ts
const rateLimitConfig = {
  windowMs: 60000,        // 1 minute
  maxRequests: 100,       // Per window
  toolLimits: {
    'generate_playbook': 20,
    'run_playbook': 10,
    'validate_playbook': 50
  }
};
```

### File Size Limits

```typescript
const securityConfig = {
  maxFileSize: 1048576,    // 1 MB
  allowedExtensions: ['.yml', '.yaml'],
  workDirectory: '/tmp/ansible-mcp'
};
```

### Path Validation

```typescript
// Prevent path traversal
const validatePath = (filePath: string): boolean => {
  const resolved = path.resolve(filePath);
  return resolved.startsWith(workDirectory);
};
```

### Secrets Detection Patterns

```typescript
const secretPatterns = [
  /AKIA[0-9A-Z]{16}/,           // AWS Access Key
  /password\s*[:=]\s*['"][^'"]+/i,  // Password
  /api[_-]?key\s*[:=]\s*['"][^'"]+/i, // API Key
  /token\s*[:=]\s*['"][^'"]+/i,   // Token
  /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/ // JWT
];
```

### TLS Configuration

```yaml
# For production, add TLS to services
services:
  ansible-mcp:
    environment:
      - TLS_CERT=/certs/server.crt
      - TLS_KEY=/certs/server.key
    volumes:
      - ./certs:/certs:ro
```

---

## Monitoring Configuration

### Prometheus

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'ansible-mcp'
    static_configs:
      - targets: ['ansible-mcp:3000']
    metrics_path: /metrics

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - /etc/prometheus/alerts/*.yml
```

### Grafana

```yaml
# monitoring/grafana/provisioning/datasources/prometheus.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
```

### Alert Rules

```yaml
# monitoring/prometheus/alerts/ansible.yml
groups:
  - name: ansible-mcp
    rules:
      - alert: HighErrorRate
        expr: rate(ansible_playbook_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High playbook error rate"
          description: "Error rate is {{ $value }} errors/second"

      - alert: SlowGeneration
        expr: histogram_quantile(0.95, rate(ansible_playbook_generation_seconds_bucket[5m])) > 30
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow playbook generation"
```

### Logging

```typescript
// Winston logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: '/workspace/logs/mcp-server.log',
      maxsize: 10485760,  // 10 MB
      maxFiles: 5
    })
  ]
});
```

---

## TypeScript Configuration

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Best Practices

### Environment Separation

```bash
# Development
cp .env.example .env.development
export NODE_ENV=development

# Staging
cp .env.example .env.staging
export NODE_ENV=staging

# Production
cp .env.example .env.production
export NODE_ENV=production
```

### Secret Management

1. **Never commit secrets** to version control
2. **Use Vault** for production secrets
3. **Rotate keys** regularly
4. **Audit access** to sensitive configuration

### Performance Tuning

1. **Increase forks** for more parallelism
2. **Enable pipelining** for SSH efficiency
3. **Use fact caching** for repeated runs
4. **Configure Redis** for caching

### Monitoring Setup

1. **Enable all metrics** in production
2. **Set up alerts** for critical issues
3. **Configure dashboards** for visibility
4. **Retain logs** for troubleshooting

---

**Next**: [Troubleshooting](TROUBLESHOOTING.md) | [API Reference](API_REFERENCE.md)
