# MCP Server Configuration Guide

This document explains how to configure and run the Ansible MCP Server from GitHub in various environments.

## 🚀 Option 1: GitHub Codespaces (Recommended)

**Easiest way to get started - runs entirely in the cloud!**

### Steps:

1. Navigate to the GitHub repository: https://github.com/w7-mgfcode/Mannos-ANSIBLE_MCP-solution

2. Click the green "Code" button → "Codespaces" tab → "Create codespace on main"

3. Wait for the environment to build (2-3 minutes first time)

4. Once ready, all services will auto-start:
   - MCP Server on port 3000
   - AI Generator on port 8000
   - Grafana on port 3001
   - Prometheus on port 9090

5. Test the MCP server:
   ```bash
   curl -X POST http://localhost:3000/execute \
     -H "Content-Type: application/json" \
     -d '{"tool": "generate_playbook", "arguments": {"prompt": "Deploy nginx"}}'
   ```

**Advantages:**
- No local setup required
- Pre-configured environment
- Works from any device with a browser
- 60 hours/month free for personal accounts

---

## 🐳 Option 2: Local Docker from GitHub

Clone and run locally with Docker:

```bash
# 1. Clone the repository
git clone https://github.com/w7-mgfcode/Mannos-ANSIBLE_MCP-solution.git
cd Mannos-ANSIBLE_MCP-solution

# 2. Start all services
docker-compose up -d

# 3. Check status
docker-compose ps

# 4. View logs
docker-compose logs -f ansible-mcp
```

**Access points:**
- MCP Server: http://localhost:3000
- Grafana: http://localhost:3001 (admin / ansible-mcp)
- Prometheus: http://localhost:9090

---

## 🤖 Option 3: Claude Desktop/Code MCP Configuration

Configure Claude Desktop or Claude Code to use this MCP server directly from GitHub.

### For Claude Desktop:

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "ansible-mcp": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "--pull=always",
        "ghcr.io/w7-mgfcode/mannos-ansible_mcp-solution-mcp-server:latest"
      ],
      "env": {
        "ANSIBLE_HOST_KEY_CHECKING": "False"
      }
    }
  }
}
```

### For Claude Code:

Create or edit `.claude/config.json` in your workspace:

```json
{
  "mcpServers": {
    "ansible-mcp": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-v",
        "${workspaceFolder}/playbooks:/workspace/playbooks",
        "-v",
        "${workspaceFolder}/inventory:/workspace/inventory",
        "ghcr.io/w7-mgfcode/mannos-ansible_mcp-solution-mcp-server:latest"
      ],
      "env": {
        "ANSIBLE_HOST_KEY_CHECKING": "False"
      }
    }
  }
}
```

**After configuration:**
1. Restart Claude Desktop/Code
2. The MCP server will appear in the available tools
3. You can now use commands like "Generate an Ansible playbook for..."

---

## 🔧 Option 4: NPX/GitHub Direct Execution (Advanced)

Run directly from GitHub without cloning:

```bash
# Using npx (requires Node.js 20+)
npx github:w7-mgfcode/Mannos-ANSIBLE_MCP-solution

# Or with Docker
docker run -it --rm \
  -v $(pwd)/playbooks:/workspace/playbooks \
  -p 3000:3000 \
  ghcr.io/w7-mgfcode/mannos-ansible_mcp-solution-mcp-server:latest
```

---

## 📦 Option 5: GitHub Container Registry

Pull pre-built Docker images directly from GitHub:

```bash
# Pull the MCP server image
docker pull ghcr.io/w7-mgfcode/mannos-ansible_mcp-solution-mcp-server:latest

# Pull the AI generator image
docker pull ghcr.io/w7-mgfcode/mannos-ansible_mcp-solution-ai-generator:latest

# Run MCP server
docker run -d \
  --name ansible-mcp \
  -p 3000:3000 \
  -v $(pwd)/playbooks:/workspace/playbooks \
  ghcr.io/w7-mgfcode/mannos-ansible_mcp-solution-mcp-server:latest

# Test it
curl http://localhost:3000/health
```

---

## 🌐 Option 6: GitHub Actions Workflow

Use MCP server in your GitHub Actions CI/CD:

```yaml
# .github/workflows/deploy.yml
name: Deploy with Ansible MCP

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Generate Ansible Playbook
        run: |
          docker run --rm \
            -v $(pwd):/workspace \
            ghcr.io/w7-mgfcode/mannos-ansible_mcp-solution-mcp-server:latest \
            generate-playbook "Deploy production web server"

      - name: Run Ansible Playbook
        run: |
          ansible-playbook generated-playbook.yml -i inventory/production
```

---

## ⚙️ Configuration Options

### Environment Variables

All deployment methods support these environment variables:

```bash
# MCP Server
NODE_ENV=production                # production or development
MCP_PORT=3000                      # MCP server port
LOG_LEVEL=info                     # info, debug, error
ANSIBLE_HOST_KEY_CHECKING=False    # For automation

# AI Generator (optional)
OPENAI_API_KEY=sk-...              # For enhanced AI generation
MODEL_NAME=gpt-4                   # LLM model to use
REDIS_HOST=redis                   # Redis hostname
VAULT_ADDR=http://vault:8200       # Vault address
```

### Volume Mounts

Mount these directories for persistence:

```bash
-v ./playbooks:/workspace/playbooks      # Generated playbooks
-v ./inventory:/workspace/inventory      # Ansible inventory
-v ./logs:/workspace/logs                # Execution logs
```

---

## 🔒 Authentication & Security

### GitHub Container Registry Authentication

For private repositories:

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull private images
docker pull ghcr.io/w7-mgfcode/mannos-ansible_mcp-solution-mcp-server:latest
```

### Secrets Management

1. **For GitHub Actions**: Use GitHub Secrets
   - Settings → Secrets and variables → Actions
   - Add: `ANSIBLE_VAULT_PASSWORD`, `SSH_PRIVATE_KEY`, etc.

2. **For Local/Codespaces**: Use `.env` file
   ```bash
   cp .env.example .env
   # Edit .env with your secrets
   ```

3. **For Production**: Use HashiCorp Vault (included in docker-compose)

---

## 🧪 Testing Your Setup

After setup, test the MCP server:

```bash
# 1. Health check
curl http://localhost:3000/health

# 2. List available tools
curl -X POST http://localhost:3000/tools

# 3. Generate a playbook
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Setup Docker on Ubuntu 22.04",
      "template": "docker_setup"
    }
  }'

# 4. Validate generated playbook
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "validate_playbook",
    "arguments": {
      "playbook_path": "/workspace/playbooks/playbook_123456.yml"
    }
  }'
```

---

## 📊 Monitoring & Observability

All deployment methods include monitoring:

- **Prometheus**: http://localhost:9090
  - Metrics collection
  - Query language

- **Grafana**: http://localhost:3001
  - Username: `admin`
  - Password: `ansible-mcp`
  - Pre-configured dashboards

- **Logs**:
  ```bash
  # Docker Compose
  docker-compose logs -f ansible-mcp

  # Kubernetes
  kubectl logs -f deployment/ansible-mcp

  # GitHub Codespaces
  View in VS Code terminal or ports panel
  ```

---

## 🆘 Troubleshooting

### Issue: Port already in use

```bash
# Check what's using the port
lsof -i :3000

# Change port in docker-compose.yml or use different port
docker run -p 3001:3000 ...
```

### Issue: Permission denied

```bash
# For Docker socket access
sudo usermod -aG docker $USER
newgrp docker

# For file permissions
sudo chown -R $USER:$USER playbooks/ inventory/ logs/
```

### Issue: Image not found

```bash
# Make sure you're authenticated
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# Or build locally
docker-compose build
```

### Issue: Codespace won't start

1. Check GitHub Codespaces quota (Settings → Billing)
2. Delete old codespaces to free up space
3. Try creating from a different branch

---

## 📚 Additional Resources

- **Repository**: https://github.com/w7-mgfcode/Mannos-ANSIBLE_MCP-solution
- **CLAUDE.md**: Detailed AI assistant guide
- **README.md**: General documentation
- **USAGE.md**: Usage examples
- **MCP Protocol**: https://modelcontextprotocol.io

---

## 🎯 Recommended Setup by Use Case

| Use Case | Best Option | Why |
|----------|-------------|-----|
| Quick testing | GitHub Codespaces | No setup required |
| Development | Local Docker | Full control |
| Production | Docker Compose + GitHub Actions | Automated + monitored |
| CI/CD Integration | GitHub Container Registry | Pre-built images |
| Claude Desktop | MCP Config with Docker | Native integration |

---

**Choose the method that best fits your needs!** All options are fully supported and tested.
