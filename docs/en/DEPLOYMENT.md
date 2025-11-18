# Deployment Guide

> Complete guide for installing and deploying the Ansible MCP Server

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Docker Compose Deployment](#docker-compose-deployment)
3. [Standalone Deployment](#standalone-deployment)
4. [Production Deployment](#production-deployment)
5. [Cloud Deployment](#cloud-deployment)
6. [Post-Deployment Verification](#post-deployment-verification)

---

## Prerequisites

### System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Disk | 20 GB | 50+ GB |
| OS | Linux (x64) | Ubuntu 22.04 LTS |

### Software Requirements

```bash
# Docker
docker --version  # 24.0+
docker compose version  # 2.20+

# For local development
node --version  # 18.0+
python --version  # 3.11+
ansible --version  # 2.15+
```

### Network Requirements

| Port | Service | Description |
|------|---------|-------------|
| 3000 | MCP Server | Main API endpoint |
| 8000 | AI Generator | Python AI service |
| 6379 | Redis | Cache |
| 8200 | Vault | Secrets |
| 9090 | Prometheus | Metrics |
| 3001 | Grafana | Dashboards |
| 8080 | GitLab | Version control |
| 8052 | AWX | Ansible UI |

---

## Docker Compose Deployment

### Basic Setup

```bash
# 1. Clone repository
git clone https://github.com/w7-mgfcode/Mannos-ANSIBLE_MCP-solution.git
cd Mannos-ANSIBLE_MCP-solution

# 2. Create environment file
cat > .env << 'EOF'
# AI Provider Configuration
AI_PROVIDER=openai
AI_MODEL=gpt-4
OPENAI_API_KEY=your-api-key-here

# Server Configuration
NODE_ENV=production
MCP_PORT=3000
LOG_LEVEL=info

# Security
RATE_LIMIT=100
MAX_FILE_SIZE=1048576
EOF

# 3. Start all services
docker compose up -d

# 4. Check status
docker compose ps
```

### Service-Specific Setup

#### Start Core Services Only

```bash
# Core services (MCP Server, AI Generator, Redis)
docker compose up -d ansible-mcp ai-generator redis
```

#### Start with Monitoring

```bash
# Core + Monitoring
docker compose up -d ansible-mcp ai-generator redis prometheus grafana
```

#### Start Full Stack

```bash
# All services including GitLab and AWX
docker compose up -d
```

### Verify Deployment

```bash
# Check all services are healthy
docker compose ps

# Check MCP server logs
docker compose logs ansible-mcp

# Test health endpoint
curl http://localhost:3000/health
```

---

## Standalone Deployment

### TypeScript MCP Server

```bash
# 1. Install Node.js dependencies
npm install

# 2. Build TypeScript
npm run build

# 3. Set environment variables
export NODE_ENV=production
export REDIS_HOST=localhost
export VAULT_ADDR=http://localhost:8200

# 4. Run server
node dist/server.js
```

### Python AI Generator

```bash
# 1. Create virtual environment
python -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set environment variables
export AI_PROVIDER=openai
export OPENAI_API_KEY=your-key

# 4. Run service
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

### Redis Setup

```bash
# Install Redis
sudo apt install redis-server

# Start Redis
sudo systemctl start redis
sudo systemctl enable redis

# Verify
redis-cli ping  # Should return PONG
```

### Vault Setup

```bash
# Install Vault
wget https://releases.hashicorp.com/vault/1.15.0/vault_1.15.0_linux_amd64.zip
unzip vault_1.15.0_linux_amd64.zip
sudo mv vault /usr/local/bin/

# Start in development mode
vault server -dev -dev-root-token-id="myroot"
```

---

## Production Deployment

### Security Hardening

#### 1. Use Production Vault

```bash
# Create Vault configuration
cat > /etc/vault/config.hcl << 'EOF'
storage "file" {
  path = "/var/lib/vault/data"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_cert_file = "/etc/vault/certs/vault.crt"
  tls_key_file  = "/etc/vault/certs/vault.key"
}

api_addr = "https://vault.example.com:8200"
EOF

# Initialize Vault
vault operator init -key-shares=5 -key-threshold=3
```

#### 2. Configure TLS

```bash
# Generate certificates
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout server.key \
  -out server.crt \
  -subj "/CN=ansible-mcp.example.com"

# Update docker-compose.yml to mount certificates
```

#### 3. Set Strong Credentials

```bash
# Update .env with strong passwords
cat > .env << 'EOF'
GITLAB_ROOT_PASSWORD=<strong-password>
GRAFANA_ADMIN_PASSWORD=<strong-password>
POSTGRES_PASSWORD=<strong-password>
VAULT_TOKEN=<production-token>
EOF
```

### High Availability Setup

#### Load Balancer Configuration (nginx)

```nginx
upstream ansible_mcp {
    least_conn;
    server mcp1:3000;
    server mcp2:3000;
    server mcp3:3000;
}

server {
    listen 443 ssl;
    server_name ansible-mcp.example.com;

    ssl_certificate /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;

    location / {
        proxy_pass http://ansible_mcp;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

#### Redis Cluster

```yaml
# docker-compose.prod.yml
services:
  redis-master:
    image: redis:7-alpine
    command: redis-server --appendonly yes

  redis-replica-1:
    image: redis:7-alpine
    command: redis-server --replicaof redis-master 6379

  redis-replica-2:
    image: redis:7-alpine
    command: redis-server --replicaof redis-master 6379
```

### Monitoring Setup

#### Prometheus Alerts

```yaml
# monitoring/prometheus/alerts.yml
groups:
  - name: ansible-mcp
    rules:
      - alert: HighErrorRate
        expr: rate(ansible_playbook_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High playbook error rate

      - alert: SlowGeneration
        expr: histogram_quantile(0.95, ansible_playbook_generation_seconds) > 30
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: Playbook generation is slow
```

#### Grafana Dashboard

Import the pre-built dashboard from `monitoring/grafana/dashboards/`.

---

## Cloud Deployment

### AWS ECS

```yaml
# task-definition.json
{
  "family": "ansible-mcp",
  "containerDefinitions": [
    {
      "name": "ansible-mcp",
      "image": "your-registry/ansible-mcp:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "REDIS_HOST", "value": "your-redis.cache.amazonaws.com"}
      ],
      "secrets": [
        {
          "name": "OPENAI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:openai-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/ansible-mcp",
          "awslogs-region": "us-east-1"
        }
      }
    }
  ]
}
```

### Kubernetes

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ansible-mcp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ansible-mcp
  template:
    metadata:
      labels:
        app: ansible-mcp
    spec:
      containers:
        - name: ansible-mcp
          image: your-registry/ansible-mcp:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: REDIS_HOST
              valueFrom:
                configMapKeyRef:
                  name: ansible-mcp-config
                  key: redis-host
          envFrom:
            - secretRef:
                name: ansible-mcp-secrets
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: ansible-mcp
spec:
  selector:
    app: ansible-mcp
  ports:
    - port: 80
      targetPort: 3000
  type: LoadBalancer
```

### Azure Container Instances

```bash
# Create resource group
az group create --name ansible-mcp-rg --location eastus

# Create container instance
az container create \
  --resource-group ansible-mcp-rg \
  --name ansible-mcp \
  --image your-registry/ansible-mcp:latest \
  --ports 3000 \
  --cpu 2 \
  --memory 4 \
  --environment-variables \
    NODE_ENV=production \
  --secure-environment-variables \
    OPENAI_API_KEY=your-key
```

---

## Post-Deployment Verification

### Health Checks

```bash
# 1. Check MCP server
curl -s http://localhost:3000/health | jq

# 2. Check AI generator
curl -s http://localhost:8000/health | jq

# 3. Check Redis connection
redis-cli -h localhost ping

# 4. Check Vault
curl -s http://localhost:8200/v1/sys/health | jq
```

### Functional Tests

```bash
# 1. Generate a test playbook
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Install nginx on Ubuntu servers"
    }
  }' | jq

# 2. Validate the playbook
PLAYBOOK_PATH=$(curl -s -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Install Docker"
    }
  }' | jq -r '.playbook_path')

curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"tool\": \"validate_playbook\",
    \"arguments\": {
      \"playbook_path\": \"$PLAYBOOK_PATH\"
    }
  }" | jq

# 3. Lint the playbook
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"tool\": \"lint_playbook\",
    \"arguments\": {
      \"playbook_path\": \"$PLAYBOOK_PATH\"
    }
  }" | jq
```

### Metrics Verification

```bash
# Check Prometheus targets
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[].health'

# Verify metrics are being collected
curl -s http://localhost:9090/api/v1/query?query=ansible_playbooks_generated_total | jq
```

### Logging Verification

```bash
# Check MCP server logs
docker compose logs --tail=100 ansible-mcp

# Check for errors
docker compose logs ansible-mcp 2>&1 | grep -i error

# Check Ansible execution logs
cat logs/ansible.log | tail -50
```

---

## Maintenance

### Backup

```bash
# Backup playbooks
tar -czf playbooks-backup-$(date +%Y%m%d).tar.gz playbooks/

# Backup configurations
tar -czf config-backup-$(date +%Y%m%d).tar.gz \
  ansible.cfg \
  docker-compose.yml \
  .env \
  inventory/
```

### Updates

```bash
# Pull latest images
docker compose pull

# Rebuild and restart
docker compose up -d --build

# Check logs for issues
docker compose logs -f ansible-mcp
```

### Scaling

```bash
# Scale MCP server instances
docker compose up -d --scale ansible-mcp=3
```

---

**Next**: [Use Cases](USE_CASES.md) | [API Reference](API_REFERENCE.md) | [Configuration](CONFIGURATION.md)
