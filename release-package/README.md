# Ansible MCP Server

> AI-powered infrastructure automation with natural language

**Version**: 2.0.0 | **MCP SDK**: 1.22.0

---

## Overview / Áttekintés

The Ansible MCP Server enables AI-powered Ansible playbook generation and execution through natural language prompts.

Az Ansible MCP Szerver mesterséges intelligenciával támogatott Ansible playbook generálást és végrehajtást tesz lehetővé természetes nyelvi promptok segítségével.

## Quick Start / Gyors kezdés

### 1. Prerequisites / Előfeltételek

- Docker & Docker Compose
- AI API key (OpenAI, Anthropic, or Gemini)

### 2. Configure / Konfiguráció

```bash
# Copy environment example
cp .env.example .env

# Edit with your API key
# Szerkessze az API kulcsával
nano .env
```

### 3. Start Services / Szolgáltatások indítása

```bash
docker compose up -d
```

### 4. Generate First Playbook / Első Playbook generálása

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Install nginx on Ubuntu servers"
    }
  }'
```

## Documentation / Dokumentáció

| Language | Documents |
|----------|-----------|
| **English** | [README](docs/en/README.md) · [Deployment](docs/en/DEPLOYMENT.md) · [Use Cases](docs/en/USE_CASES.md) · [API](docs/en/API_REFERENCE.md) · [Config](docs/en/CONFIGURATION.md) · [Troubleshooting](docs/en/TROUBLESHOOTING.md) |
| **Magyar** | [README](docs/hu/README.md) · [Telepítés](docs/hu/DEPLOYMENT.md) · [Használat](docs/hu/USE_CASES.md) · [API](docs/hu/API_REFERENCE.md) · [Konfig](docs/hu/CONFIGURATION.md) · [Hibaelhárítás](docs/hu/TROUBLESHOOTING.md) |

## Features / Funkciók

### MCP Tools / MCP Eszközök

| Tool | Description / Leírás |
|------|----------------------|
| `generate_playbook` | Generate playbook from natural language / Playbook generálás természetes nyelvből |
| `validate_playbook` | Validate YAML and Ansible syntax / YAML és Ansible szintaxis validálás |
| `run_playbook` | Execute playbook / Playbook végrehajtás |
| `refine_playbook` | Improve based on feedback / Javítás visszajelzés alapján |
| `lint_playbook` | Run ansible-lint / Ansible-lint futtatás |

### Built-in Templates / Beépített sablonok

- **kubernetes_deployment** - Kubernetes with services
- **docker_setup** - Docker & Docker Compose
- **system_hardening** - Security configuration

### Security / Biztonság

- Secrets detection (AWS keys, passwords, tokens)
- Path traversal prevention
- Rate limiting (100 req/min)
- Command injection prevention

## Service URLs / Szolgáltatás URL-ek

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| MCP Server | http://localhost:3000 | - |
| Grafana | http://localhost:3001 | admin / ansible-mcp |
| Prometheus | http://localhost:9090 | - |
| GitLab | http://localhost:8080 | root / ansible-mcp-2024 |
| Vault | http://localhost:8200 | Token: myroot |
| AWX | http://localhost:8052 | - |

## Directory Structure / Könyvtárstruktúra

```
├── src/                 # Source code / Forráskód
├── docs/                # Documentation / Dokumentáció
│   ├── en/              # English
│   └── hu/              # Magyar
├── monitoring/          # Prometheus & Grafana
├── inventory/           # Ansible inventory examples
├── playbooks/           # Generated playbooks
└── logs/                # Execution logs
```

## AI Providers / AI szolgáltatók

| Provider | Configuration |
|----------|---------------|
| OpenAI | `AI_PROVIDER=openai` + `OPENAI_API_KEY` |
| Anthropic | `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` |
| Google Gemini | `AI_PROVIDER=gemini` + `GEMINI_API_KEY` |
| Ollama (local) | `AI_PROVIDER=ollama` + `OLLAMA_HOST` |

## Support / Támogatás

- [English Documentation](docs/en/README.md)
- [Magyar Dokumentáció](docs/hu/README.md)
- [Troubleshooting / Hibaelhárítás](docs/en/TROUBLESHOOTING.md)

## License / Licenc

MIT License - see [LICENSE](LICENSE)

---

**Full documentation / Teljes dokumentáció**: [docs/INDEX.md](docs/INDEX.md)
