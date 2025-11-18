# Ansible MCP Server - Documentation

> **Version**: 2.0.0
> **MCP SDK**: 1.22.0
> **Last Updated**: 2025-11-18

## Overview

The Ansible MCP Server is an AI-powered infrastructure automation solution that bridges natural language processing with Ansible playbook generation and execution. It implements the Model Context Protocol (MCP) to enable AI agents to create, validate, and execute production-ready Ansible playbooks.

## Key Features

### AI-Powered Generation
- Natural language to Ansible playbook conversion
- Context-aware prompt analysis
- Multiple AI provider support (OpenAI, Anthropic, Gemini, Ollama)
- Few-shot learning and chain-of-thought reasoning

### Enterprise-Ready
- Built-in security features (secrets detection, path traversal prevention)
- Prometheus metrics and Grafana dashboards
- HashiCorp Vault integration for secrets management
- Redis caching for performance optimization

### Comprehensive Tooling
- 11 MCP tools for complete automation workflow
- Built-in playbook templates for common patterns
- Automatic YAML validation and linting
- Version control with GitLab integration

## Architecture

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
```

## Documentation Index

| Document | Description |
|----------|-------------|
| [Deployment Guide](DEPLOYMENT.md) | Installation and deployment instructions |
| [Use Cases](USE_CASES.md) | Real-world examples and scenarios |
| [API Reference](API_REFERENCE.md) | Complete MCP tools documentation |
| [Configuration](CONFIGURATION.md) | Environment variables and settings |
| [Troubleshooting](TROUBLESHOOTING.md) | Common issues and solutions |

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)
- Ansible 2.15+

### Installation

```bash
# Clone the repository
git clone https://github.com/w7-mgfcode/Mannos-ANSIBLE_MCP-solution.git
cd Mannos-ANSIBLE_MCP-solution

# Start all services
docker compose up -d

# Verify services are running
docker compose ps
```

### First Playbook

```bash
# Generate a simple playbook
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Install and configure nginx web server on Ubuntu"
    }
  }'
```

## Technology Stack

### Core Components

| Component | Technology | Version |
|-----------|------------|---------|
| MCP Server | TypeScript | ES2022 |
| AI Generator | Python | 3.11+ |
| Protocol | MCP SDK | 1.22.0 |
| Automation | Ansible | 2.15+ |
| Container | Docker | 24.0+ |

### Infrastructure Services

| Service | Purpose | Port |
|---------|---------|------|
| Redis | Caching & Job Queue | 6379 |
| HashiCorp Vault | Secrets Management | 8200 |
| Prometheus | Metrics Collection | 9090 |
| Grafana | Metrics Visualization | 3001 |
| GitLab | Version Control | 8080 |
| AWX | Ansible UI | 8052 |

### AI Providers

| Provider | Model Support | Configuration |
|----------|--------------|---------------|
| OpenAI | GPT-4, GPT-4 Turbo | `OPENAI_API_KEY` |
| Anthropic | Claude 3 | `ANTHROPIC_API_KEY` |
| Google | Gemini Pro | `GEMINI_API_KEY` |
| Ollama | Local models | `OLLAMA_HOST` |

## Security Features

### Built-in Protections

- **Path Traversal Prevention**: Validates all file paths
- **Command Injection Prevention**: Uses safe execFile instead of shell
- **Secrets Detection**: Scans for AWS keys, passwords, tokens, JWT
- **Rate Limiting**: Default 100 requests/minute
- **File Size Validation**: Maximum 1MB default
- **Secure File Permissions**: 0o600 for sensitive files

### Compliance

- OWASP Top 10 protection
- No hardcoded credentials
- Encrypted secrets storage via Vault
- Audit logging enabled

## Support

### Getting Help

1. Check the [Troubleshooting Guide](TROUBLESHOOTING.md)
2. Review existing documentation
3. Open an issue on GitHub

### Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

## License

This project is licensed under the MIT License. See [LICENSE](../../LICENSE) for details.

---

**Next Steps**: [Deployment Guide](DEPLOYMENT.md) | [Use Cases](USE_CASES.md) | [API Reference](API_REFERENCE.md)
