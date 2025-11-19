# API Reference

> Complete documentation for all MCP tools

## Table of Contents

1. [Overview](#overview)
2. [Core Tools](#core-tools)
3. [Template Tools](#template-tools)
4. [Tool Annotations](#tool-annotations)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)

---

## Overview

### MCP Protocol

The Ansible MCP Server implements the Model Context Protocol (MCP) version 2025-03-26, providing 11 tools for Ansible automation.

### Base URL

```
http://localhost:3000/execute
```

### Request Format

```json
{
  "tool": "tool_name",
  "arguments": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

### Response Format

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\": true, \"data\": {...}}"
    }
  ]
}
```

---

## Core Tools

### 1. generate_playbook

Generate an Ansible playbook from a natural language prompt.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Natural language description of desired playbook |
| `template` | string | No | Template name to use as base |
| `context` | object | No | Additional context for generation |

#### Context Object

| Field | Type | Description |
|-------|------|-------------|
| `target_hosts` | string | Target host group (default: 'all') |
| `environment` | string | Environment: production, staging, development |
| `tags` | string[] | Tags for tasks |
| `vars` | object | Additional variables |

#### Available Templates

- `kubernetes_deployment` - Kubernetes deployment with services
- `docker_setup` - Docker and Docker Compose installation
- `system_hardening` - Security hardening configuration

#### Request Example

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Deploy nginx with SSL on Ubuntu servers",
      "template": "docker_setup",
      "context": {
        "target_hosts": "webservers",
        "environment": "production",
        "tags": ["nginx", "ssl", "web"]
      }
    }
  }'
```

#### Response Example

```json
{
  "success": true,
  "playbook_path": "/tmp/ansible-mcp/playbook_1700000000000.yml",
  "playbook_content": "---\n- name: Deploy Nginx with SSL...",
  "validation": {
    "valid": true,
    "yaml_valid": true,
    "structure_valid": true
  },
  "metadata": {
    "generated_at": "2025-11-18T10:30:00Z",
    "template_used": "docker_setup",
    "prompt_hash": "abc123"
  }
}
```

#### Annotations

- `readOnlyHint`: false
- `destructiveHint`: false
- `idempotentHint`: true

---

### 2. validate_playbook

Validate an Ansible playbook for syntax and structure.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `playbook_path` | string | Yes | Absolute path to playbook file |
| `strict` | boolean | No | Enable strict validation (default: false) |

#### Request Example

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "validate_playbook",
    "arguments": {
      "playbook_path": "/tmp/ansible-mcp/playbook_1700000000000.yml",
      "strict": true
    }
  }'
```

#### Response Example

```json
{
  "success": true,
  "validation_results": {
    "yaml_valid": true,
    "ansible_syntax_valid": true,
    "structure_valid": true,
    "secrets_detected": false,
    "warnings": [
      "Consider adding tags to tasks",
      "Variable 'app_name' should have a default value"
    ],
    "errors": []
  }
}
```

#### Validation Checks

1. **YAML Syntax**: Valid YAML format
2. **Ansible Syntax**: `ansible-playbook --syntax-check`
3. **Structure**: Required fields (name, hosts, tasks)
4. **Secrets Detection**: AWS keys, passwords, tokens
5. **Best Practices**: Tags, handlers, idempotency

#### Annotations

- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true

---

### 3. run_playbook

Execute an Ansible playbook.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `playbook_path` | string | Yes | Absolute path to playbook file |
| `inventory` | string | No | Inventory file or host pattern |
| `extra_vars` | object | No | Extra variables to pass |
| `check_mode` | boolean | No | Dry run mode (default: false) |
| `tags` | string[] | No | Run only tasks with these tags |
| `skip_tags` | string[] | No | Skip tasks with these tags |
| `limit` | string | No | Limit to specific hosts |
| `verbosity` | number | No | Verbosity level (0-4) |

#### Request Example

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "run_playbook",
    "arguments": {
      "playbook_path": "/tmp/ansible-mcp/playbook_1700000000000.yml",
      "inventory": "production",
      "extra_vars": {
        "app_name": "myapp",
        "replicas": 3
      },
      "check_mode": true,
      "tags": ["deploy"],
      "verbosity": 2
    }
  }'
```

#### Response Example

```json
{
  "success": true,
  "output": "PLAY [Deploy Application] *****\n\nTASK [Install packages] *****\nok: [server1]\n\nPLAY RECAP *****\nserver1 : ok=5 changed=2 unreachable=0 failed=0",
  "errors": "",
  "command": "ansible-playbook /tmp/ansible-mcp/playbook_xxx.yml -i inventory/production --check -e '{\"app_name\":\"myapp\",\"replicas\":3}' -t deploy -vv",
  "execution_time": 45.2,
  "stats": {
    "ok": 5,
    "changed": 2,
    "unreachable": 0,
    "failed": 0
  }
}
```

#### Annotations

- `readOnlyHint`: false
- `destructiveHint`: true (when check_mode=false)
- `idempotentHint`: false

---

### 4. refine_playbook

Improve a playbook based on feedback or validation errors.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `playbook_path` | string | Yes | Path to playbook to refine |
| `feedback` | string | No | Human feedback for improvements |
| `validation_errors` | string[] | No | Validation errors to fix |

#### Request Example

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "refine_playbook",
    "arguments": {
      "playbook_path": "/tmp/ansible-mcp/playbook_1700000000000.yml",
      "feedback": "Add error handling, make all tasks idempotent, add rollback capability",
      "validation_errors": [
        "Task 'Install packages' missing when condition",
        "Handler 'restart nginx' never notified"
      ]
    }
  }'
```

#### Response Example

```json
{
  "success": true,
  "refined_playbook_path": "/tmp/ansible-mcp/playbook_1700000000000_refined.yml",
  "changes_applied": [
    "Applied feedback: Add error handling - added block/rescue/always structure",
    "Applied feedback: make all tasks idempotent - added state checks",
    "Applied feedback: add rollback capability - added rescue tasks",
    "Fixed validation error: Added when condition to 'Install packages'",
    "Fixed validation error: Added notify to handler 'restart nginx'"
  ],
  "original_path": "/tmp/ansible-mcp/playbook_1700000000000.yml"
}
```

#### Annotations

- `readOnlyHint`: false
- `destructiveHint`: false
- `idempotentHint`: true

---

### 5. lint_playbook

Run ansible-lint on a playbook.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `playbook_path` | string | Yes | Path to playbook to lint |

#### Request Example

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "lint_playbook",
    "arguments": {
      "playbook_path": "/tmp/ansible-mcp/playbook_1700000000000.yml"
    }
  }'
```

#### Response Example

```json
{
  "success": true,
  "lint_output": "Passed with 0 violations",
  "errors": "",
  "violations": [],
  "warnings": [
    {
      "rule": "yaml[line-length]",
      "message": "Line too long (120 > 80 characters)",
      "line": 45
    }
  ]
}
```

#### Annotations

- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true

---

## Template Tools

### 6. list_prompt_templates

List available prompt templates.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter by category |

#### Categories

- `kubernetes` - Kubernetes deployments
- `docker` - Docker configurations
- `security` - Security hardening
- `database` - Database setups
- `monitoring` - Monitoring stacks
- `network` - Network configurations
- `cicd` - CI/CD pipelines
- `cloud` - Cloud infrastructure
- `general` - General templates

#### Request Example

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "list_prompt_templates",
    "arguments": {
      "category": "kubernetes"
    }
  }'
```

#### Response Example

```json
{
  "success": true,
  "templates": [
    {
      "id": "k8s-deployment",
      "name": "Kubernetes Deployment",
      "category": "kubernetes",
      "description": "Deploy application to Kubernetes cluster",
      "version": "2.0.0",
      "tags": ["kubernetes", "deployment", "production"]
    },
    {
      "id": "k8s-statefulset",
      "name": "Kubernetes StatefulSet",
      "category": "kubernetes",
      "description": "Deploy stateful application with persistent storage",
      "version": "1.5.0",
      "tags": ["kubernetes", "stateful", "database"]
    }
  ],
  "total": 2
}
```

---

### 7. get_prompt_template

Get details of a specific prompt template.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `template_id` | string | Yes | Template identifier |

#### Request Example

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "get_prompt_template",
    "arguments": {
      "template_id": "k8s-deployment"
    }
  }'
```

#### Response Example

```json
{
  "success": true,
  "template": {
    "id": "k8s-deployment",
    "name": "Kubernetes Deployment",
    "category": "kubernetes",
    "version": "2.0.0",
    "description": "Deploy application to Kubernetes cluster",
    "system_prompt": "You are an expert in Kubernetes deployments...",
    "few_shot_examples": [
      {
        "input": "Deploy nginx with 3 replicas",
        "output": "# Kubernetes deployment YAML..."
      }
    ],
    "variables": [
      {
        "name": "app_name",
        "type": "string",
        "required": true,
        "description": "Application name"
      },
      {
        "name": "replicas",
        "type": "number",
        "default": 1,
        "description": "Number of replicas"
      }
    ],
    "tags": ["kubernetes", "deployment"]
  }
}
```

---

### 8. enrich_prompt

Enrich a prompt with few-shot examples and reasoning.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | User prompt to enrich |
| `template_id` | string | No | Template for context |
| `include_reasoning` | boolean | No | Add chain-of-thought (default: true) |

#### Request Example

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "enrich_prompt",
    "arguments": {
      "prompt": "Deploy Redis cluster",
      "template_id": "database-cluster",
      "include_reasoning": true
    }
  }'
```

#### Response Example

```json
{
  "success": true,
  "enriched_prompt": "## Context\nYou are creating a high-availability database cluster...\n\n## Examples\n### Example 1\nInput: Deploy PostgreSQL cluster\nOutput: ...\n\n## Reasoning\nThink step by step:\n1. Identify components needed\n2. Plan network topology\n3. Configure replication\n4. Set up monitoring\n\n## Task\nDeploy Redis cluster",
  "original_prompt": "Deploy Redis cluster",
  "enhancements": [
    "Added system context",
    "Added 2 few-shot examples",
    "Added chain-of-thought reasoning"
  ]
}
```

---

### 9. generate_with_template

Generate playbook using a specific template.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `template_id` | string | Yes | Template to use |
| `variables` | object | Yes | Template variables |
| `prompt` | string | No | Additional instructions |

#### Request Example

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_with_template",
    "arguments": {
      "template_id": "k8s-deployment",
      "variables": {
        "app_name": "webapp",
        "replicas": 3,
        "image": "nginx:1.25",
        "port": 80
      },
      "prompt": "Add health checks and resource limits"
    }
  }'
```

#### Response Example

```json
{
  "success": true,
  "playbook_path": "/tmp/ansible-mcp/playbook_1700000000000.yml",
  "playbook_content": "---\n- name: Deploy webapp to Kubernetes...",
  "template_used": "k8s-deployment",
  "variables_applied": {
    "app_name": "webapp",
    "replicas": 3,
    "image": "nginx:1.25",
    "port": 80
  }
}
```

---

### 10. update_template_version

Update a template's version.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `template_id` | string | Yes | Template to update |
| `version` | string | Yes | New version (semver) |
| `changelog` | string | Yes | Description of changes |

#### Request Example

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "update_template_version",
    "arguments": {
      "template_id": "k8s-deployment",
      "version": "2.1.0",
      "changelog": "Added support for init containers and sidecars"
    }
  }'
```

---

### 11. get_template_history

Get version history of a template.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `template_id` | string | Yes | Template identifier |

#### Response Example

```json
{
  "success": true,
  "template_id": "k8s-deployment",
  "history": [
    {
      "version": "2.1.0",
      "date": "2025-11-18T10:00:00Z",
      "changelog": "Added support for init containers and sidecars"
    },
    {
      "version": "2.0.0",
      "date": "2025-11-01T08:00:00Z",
      "changelog": "Major rewrite with improved resource management"
    },
    {
      "version": "1.0.0",
      "date": "2025-10-01T12:00:00Z",
      "changelog": "Initial release"
    }
  ]
}
```

---

## Tool Annotations

All tools include MCP 2025-03-26 annotations:

| Annotation | Description | Example Values |
|------------|-------------|----------------|
| `readOnlyHint` | Tool doesn't modify state | `true` for validate, lint |
| `destructiveHint` | Tool can cause data loss | `true` for run (non-check mode) |
| `idempotentHint` | Safe to call multiple times | `true` for generate, validate |

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "error_code": "ERROR_CODE",
  "details": {
    "field": "specific information"
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed |
| `FILE_NOT_FOUND` | Playbook file not found |
| `YAML_PARSE_ERROR` | Invalid YAML syntax |
| `ANSIBLE_SYNTAX_ERROR` | Ansible syntax check failed |
| `EXECUTION_ERROR` | Playbook execution failed |
| `SECRETS_DETECTED` | Secrets found in playbook |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `TEMPLATE_NOT_FOUND` | Template doesn't exist |
| `PATH_TRAVERSAL` | Invalid file path detected |

### Example Error Response

```json
{
  "success": false,
  "error": "Secrets detected in playbook",
  "error_code": "SECRETS_DETECTED",
  "details": {
    "secrets_found": [
      {
        "type": "AWS Access Key",
        "line": 15
      },
      {
        "type": "Password",
        "line": 23
      }
    ],
    "recommendation": "Use Ansible Vault or environment variables for secrets"
  }
}
```

---

## Rate Limiting

### Default Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| All tools | 100 requests | 1 minute |
| generate_playbook | 20 requests | 1 minute |
| run_playbook | 10 requests | 1 minute |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1700000060
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "error_code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 100,
    "remaining": 0,
    "reset_at": "2025-11-18T10:31:00Z"
  }
}
```

---

## Metrics

### Available Prometheus Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `ansible_playbooks_generated_total` | Counter | Total playbooks generated |
| `ansible_playbook_generation_seconds` | Histogram | Generation time |
| `ansible_playbook_executions_total` | Counter | Total executions |
| `ansible_playbook_execution_seconds` | Histogram | Execution time |
| `ansible_validation_total` | Counter | Total validations |
| `ansible_secrets_detected_total` | Counter | Secrets detection events |
| `ansible_rate_limit_exceeded_total` | Counter | Rate limit events |

### Metrics Endpoint

```
http://localhost:3000/metrics
```

---

**Next**: [Configuration](CONFIGURATION.md) | [Troubleshooting](TROUBLESHOOTING.md)
