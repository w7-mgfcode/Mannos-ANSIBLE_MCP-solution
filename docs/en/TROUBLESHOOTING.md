# Troubleshooting Guide

> Solutions for common issues with the Ansible MCP Server

## Table of Contents

1. [Startup Issues](#startup-issues)
2. [Generation Issues](#generation-issues)
3. [Validation Issues](#validation-issues)
4. [Execution Issues](#execution-issues)
5. [Connection Issues](#connection-issues)
6. [Performance Issues](#performance-issues)
7. [Security Issues](#security-issues)

---

## Startup Issues

### MCP Server Won't Start

#### Symptom
Docker container exits immediately or fails to start.

#### Diagnosis
```bash
# Check container logs
docker compose logs ansible-mcp

# Check if container is running
docker compose ps
```

#### Common Causes & Solutions

**1. Port Conflict**
```bash
# Check if port is in use
lsof -i :3000

# Solution: Change port or kill conflicting process
# In docker-compose.yml:
ports:
  - "3001:3000"
```

**2. Build Error**
```bash
# Check TypeScript compilation
npm run build

# Common fix: Clear and reinstall
rm -rf node_modules dist
npm install
npm run build
```

**3. Missing Dependencies**
```bash
# Reinstall dependencies
npm install

# Rebuild container
docker compose build --no-cache ansible-mcp
```

**4. Permission Issues**
```bash
# Fix volume permissions
chmod -R 755 playbooks inventory logs
chown -R 1000:1000 playbooks inventory logs
```

---

### AI Generator Won't Start

#### Symptom
Python service fails to start or crashes.

#### Diagnosis
```bash
docker compose logs ai-generator
```

#### Solutions

**1. Missing API Key**
```bash
# Check environment variable
docker compose exec ai-generator env | grep API_KEY

# Solution: Add to .env
echo "OPENAI_API_KEY=sk-your-key" >> .env
docker compose up -d ai-generator
```

**2. Python Dependencies**
```bash
# Rebuild with fresh dependencies
docker compose build --no-cache ai-generator
```

---

## Generation Issues

### Playbook Generation Fails

#### Symptom
`generate_playbook` returns `success: false`

#### Diagnosis
```bash
# Check both services
docker compose logs ansible-mcp
docker compose logs ai-generator
```

#### Common Causes & Solutions

**1. Vague Prompt**
```json
// Bad
{"prompt": "setup server"}

// Good
{"prompt": "Install and configure nginx as a reverse proxy with SSL on Ubuntu 22.04 servers"}
```

**2. Template Not Found**
```json
// Check available templates first
{"tool": "list_prompt_templates", "arguments": {}}

// Use valid template
{"prompt": "Deploy app", "template": "kubernetes_deployment"}
```

**3. AI Provider Error**
```bash
# Check AI service logs
docker compose logs ai-generator

# Verify API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**4. Rate Limit Exceeded**
```json
{
  "success": false,
  "error_code": "RATE_LIMIT_EXCEEDED"
}

// Wait and retry, or increase limit in config
```

---

### Generated Playbook Has Wrong Content

#### Symptom
Playbook doesn't match the prompt requirements.

#### Solutions

**1. Provide More Context**
```json
{
  "tool": "generate_playbook",
  "arguments": {
    "prompt": "Deploy Redis cluster",
    "context": {
      "target_hosts": "redis_servers",
      "environment": "production",
      "tags": ["redis", "cluster", "ha"]
    }
  }
}
```

**2. Use Refinement**
```json
{
  "tool": "refine_playbook",
  "arguments": {
    "playbook_path": "/tmp/ansible-mcp/playbook_xxx.yml",
    "feedback": "Add Sentinel for HA, configure persistence, add monitoring"
  }
}
```

**3. Use Specific Template**
```json
{
  "tool": "generate_with_template",
  "arguments": {
    "template_id": "database-cluster",
    "variables": {"db_type": "redis", "nodes": 3}
  }
}
```

---

## Validation Issues

### YAML Validation Fails

#### Symptom
```json
{
  "yaml_valid": false,
  "errors": ["YAML parse error at line X"]
}
```

#### Common Causes & Solutions

**1. Indentation Error**
```yaml
# Wrong
tasks:
  - name: Install package
  apt:
    name: nginx

# Correct (2-space indent)
tasks:
  - name: Install package
    apt:
      name: nginx
```

**2. Special Characters**
```yaml
# Wrong
message: This contains: a colon

# Correct
message: "This contains: a colon"
```

**3. Tab Characters**
```bash
# Find and replace tabs
sed -i 's/\t/  /g' playbook.yml
```

---

### Ansible Syntax Check Fails

#### Symptom
```json
{
  "ansible_syntax_valid": false,
  "errors": ["ERROR! ..."]
}
```

#### Common Causes & Solutions

**1. Invalid Module Parameters**
```yaml
# Wrong
- name: Install nginx
  apt:
    pkg: nginx  # Wrong parameter

# Correct
- name: Install nginx
  apt:
    name: nginx  # Correct parameter
```

**2. Missing Required Fields**
```yaml
# Wrong
- hosts: all
  tasks:
    - apt: name=nginx

# Correct
- name: Install Nginx
  hosts: all
  tasks:
    - name: Install nginx package
      apt:
        name: nginx
```

**3. Undefined Variables**
```yaml
# Add defaults
vars:
  app_name: "{{ app_name | default('myapp') }}"
```

---

### Secrets Detected

#### Symptom
```json
{
  "secrets_detected": true,
  "secrets_found": [{"type": "AWS Access Key", "line": 15}]
}
```

#### Solutions

**1. Use Ansible Vault**
```bash
# Encrypt sensitive file
ansible-vault encrypt vars/secrets.yml

# Reference in playbook
vars_files:
  - vars/secrets.yml
```

**2. Use Environment Variables**
```yaml
tasks:
  - name: Configure app
    template:
      src: config.j2
      dest: /etc/app/config.yml
    environment:
      API_KEY: "{{ lookup('env', 'API_KEY') }}"
```

**3. Use HashiCorp Vault**
```yaml
vars:
  db_password: "{{ lookup('hashi_vault', 'secret/data/db:password') }}"
```

---

## Execution Issues

### Playbook Execution Fails

#### Symptom
`run_playbook` returns errors.

#### Diagnosis
```bash
# Run manually with verbose
ansible-playbook playbook.yml -i inventory/hosts -vvv
```

#### Common Causes & Solutions

**1. SSH Connection Failed**
```bash
# Test SSH
ssh -i /path/to/key user@host

# Check inventory
ansible -i inventory/hosts all -m ping
```

**2. Permission Denied**
```yaml
# Add become
- name: Install package
  become: yes
  apt:
    name: nginx
```

**3. Module Not Found**
```bash
# Install collection
ansible-galaxy collection install community.general

# Use FQCN
- community.general.docker_container:
    name: myapp
```

**4. Timeout**
```bash
# Increase timeout in ansible.cfg
[defaults]
timeout = 60

# Or per task
- name: Long running task
  async: 300
  poll: 10
```

---

### Check Mode Shows Unexpected Changes

#### Symptom
Dry run shows changes that shouldn't occur.

#### Solutions

**1. Ensure Idempotency**
```yaml
# Bad - always changes
- name: Add line
  shell: echo "config=value" >> /etc/app.conf

# Good - idempotent
- name: Add line
  lineinfile:
    path: /etc/app.conf
    line: "config=value"
```

**2. Use State Parameters**
```yaml
- name: Ensure package present
  apt:
    name: nginx
    state: present  # Won't reinstall
```

---

## Connection Issues

### Cannot Connect to Redis

#### Symptom
```
Error: Redis connection refused
```

#### Solutions

**1. Check Service Status**
```bash
docker compose ps redis
docker compose logs redis
```

**2. Verify Network**
```bash
docker compose exec ansible-mcp ping redis
```

**3. Check Configuration**
```bash
# Verify host in environment
docker compose exec ansible-mcp env | grep REDIS

# Test connection
docker compose exec redis redis-cli ping
```

---

### Cannot Connect to Vault

#### Symptom
```
Error: Vault connection failed
```

#### Solutions

**1. Check Service**
```bash
docker compose ps vault
curl http://localhost:8200/v1/sys/health
```

**2. Verify Token**
```bash
# Dev mode token
export VAULT_TOKEN=myroot

# Test access
curl -H "X-Vault-Token: $VAULT_TOKEN" \
  http://localhost:8200/v1/sys/health
```

**3. Check Seal Status**
```bash
# In production, unseal vault
vault operator unseal <unseal-key>
```

---

## Performance Issues

### Slow Playbook Generation

#### Symptom
Generation takes more than 30 seconds.

#### Solutions

**1. Use Caching**
```bash
# Ensure Redis is running
docker compose ps redis

# Check cache hits
docker compose exec redis redis-cli info stats | grep hits
```

**2. Optimize Prompts**
```json
// Be specific to avoid multiple AI calls
{
  "prompt": "Install nginx 1.25 on Ubuntu 22.04 with SSL using Let's Encrypt",
  "template": "docker_setup"  // Use template
}
```

**3. Use Faster AI Model**
```bash
# In .env
AI_MODEL=gpt-3.5-turbo  # Faster than gpt-4
```

---

### Slow Playbook Execution

#### Symptom
Execution takes longer than expected.

#### Solutions

**1. Increase Parallelism**
```ini
# ansible.cfg
[defaults]
forks = 100  # Increase from 50
```

**2. Enable Pipelining**
```ini
[ssh_connection]
pipelining = True
```

**3. Use Fact Caching**
```ini
[defaults]
gathering = smart
fact_caching = redis
fact_caching_connection = redis:6379:0
fact_caching_timeout = 86400
```

**4. Limit Scope**
```bash
# Run on specific hosts
ansible-playbook playbook.yml --limit web1

# Run specific tags
ansible-playbook playbook.yml --tags deploy
```

---

## Security Issues

### Rate Limit Exceeded

#### Symptom
```json
{"error_code": "RATE_LIMIT_EXCEEDED"}
```

#### Solutions

**1. Wait for Reset**
```bash
# Check reset time in headers
X-RateLimit-Reset: 1700000060
```

**2. Increase Limit (if needed)**
```bash
# In .env
RATE_LIMIT=200
```

---

### Path Traversal Detected

#### Symptom
```json
{"error_code": "PATH_TRAVERSAL"}
```

#### Solution
```bash
# Use absolute paths within work directory
/tmp/ansible-mcp/playbook.yml  # OK
../../../etc/passwd            # Blocked
```

---

## Diagnostic Commands

### Quick Health Check

```bash
#!/bin/bash
# health-check.sh

echo "=== Service Status ==="
docker compose ps

echo -e "\n=== MCP Server Health ==="
curl -s http://localhost:3000/health | jq

echo -e "\n=== AI Generator Health ==="
curl -s http://localhost:8000/health | jq

echo -e "\n=== Redis Status ==="
docker compose exec redis redis-cli ping

echo -e "\n=== Vault Status ==="
curl -s http://localhost:8200/v1/sys/health | jq
```

### Log Analysis

```bash
# Recent errors
docker compose logs --since 1h | grep -i error

# MCP server errors
docker compose logs ansible-mcp 2>&1 | grep -i error | tail -20

# Ansible execution errors
grep -i "fatal\|failed" logs/ansible.log | tail -20
```

### Performance Metrics

```bash
# Check Prometheus metrics
curl -s http://localhost:9090/api/v1/query?query=ansible_playbooks_generated_total | jq

# Check generation latency
curl -s http://localhost:9090/api/v1/query?query=histogram_quantile\(0.95,ansible_playbook_generation_seconds_bucket\) | jq
```

---

## Getting Help

### Collect Debug Information

```bash
# Create debug bundle
tar -czf debug-bundle-$(date +%Y%m%d).tar.gz \
  logs/ \
  .env \
  docker-compose.yml \
  ansible.cfg
```

### Report Issues

1. Check existing issues on GitHub
2. Include:
   - Error message and logs
   - Steps to reproduce
   - Environment details
   - Configuration (without secrets)

---

**Next**: [README](README.md) | [Deployment](DEPLOYMENT.md) | [Configuration](CONFIGURATION.md)
