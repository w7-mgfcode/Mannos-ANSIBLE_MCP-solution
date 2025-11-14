# GitHub-on keresztüli futtatás - Gyors Útmutató 🚀

Ez a dokumentum magyar nyelven elmagyarázza, hogyan futtathatod az Ansible MCP Server-t közvetlenül GitHub-ról.

## 📋 Tartalomjegyzék

1. [GitHub Codespaces (Legegyszerűbb)](#1-github-codespaces-legegyszerűbb)
2. [Lokális Docker GitHub-ról](#2-lokális-docker-github-ról)
3. [Claude Desktop/Code Integráció](#3-claude-desktopcode-integráció)
4. [GitHub Container Registry](#4-github-container-registry)
5. [GitHub Actions használata](#5-github-actions-használata)

---

## 1. GitHub Codespaces (Legegyszerűbb) ☁️

**Mit jelent?** A GitHub Codespaces egy felhő alapú fejlesztői környezet - nem kell semmit telepítened, minden a böngészőben fut!

### Lépések:

1. **Nyisd meg a repository-t GitHub-on:**
   ```
   https://github.com/w7-mgfcode/Mannos-ANSIBLE_MCP-solution
   ```

2. **Kattints a zöld "Code" gombra** → **"Codespaces" fül** → **"Create codespace on main"**

3. **Várj 2-3 percet** amíg felépül a környezet

4. **Kész!** Az MCP szerver automatikusan elindul. Tesztelheted:
   ```bash
   curl -X POST http://localhost:3000/execute \
     -H "Content-Type: application/json" \
     -d '{"tool": "generate_playbook", "arguments": {"prompt": "Telepíts nginx-et"}}'
   ```

### Előnyök:
- ✅ Nincs szükség helyi telepítésre
- ✅ Minden böngészőből elérhető
- ✅ Előre konfigurált környezet
- ✅ Havi 60 óra ingyen (személyes fiókkal)

### Portok és Szolgáltatások:
- **3000**: MCP Szerver
- **3001**: Grafana (admin / ansible-mcp)
- **8000**: AI Generátor
- **9090**: Prometheus

---

## 2. Lokális Docker GitHub-ról 🐳

**Mit jelent?** Letöltöd a kódot GitHub-ról és Docker-rel futtatod a saját gépeden.

### Előfeltételek:
- Docker Desktop telepítve
- Git telepítve

### Lépések:

```bash
# 1. Repository klónozása
git clone https://github.com/w7-mgfcode/Mannos-ANSIBLE_MCP-solution.git
cd Mannos-ANSIBLE_MCP-solution

# 2. Szolgáltatások indítása
docker-compose up -d

# 3. Státusz ellenőrzése
docker-compose ps

# 4. Logok megtekintése
docker-compose logs -f ansible-mcp
```

### Elérhető felületek:
- **MCP Server**: http://localhost:3000
- **Grafana**: http://localhost:3001
- **Prometheus**: http://localhost:9090
- **Vault**: http://localhost:8200

### Tesztelés:
```bash
# Playbook generálás
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Docker telepítése Ubuntu-ra",
      "template": "docker_setup"
    }
  }'
```

### Leállítás:
```bash
docker-compose down
```

---

## 3. Claude Desktop/Code Integráció 🤖

**Mit jelent?** A Claude Desktop vagy Claude Code közvetlenül használhatja az MCP szervert, automatikusan letöltve GitHub-ról.

### Claude Desktop Konfiguráció:

**macOS esetén:** Szerkeszd a fájlt:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows esetén:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Tartalom:**
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

### Claude Code Konfiguráció:

Hozz létre egy `.claude/config.json` fájlt a projekt gyökerében:

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
        "ghcr.io/w7-mgfcode/mannos-ansible_mcp-solution-mcp-server:latest"
      ]
    }
  }
}
```

### Használat:

1. Indítsd újra a Claude Desktop/Code-ot
2. Az MCP szerver automatikusan elérhető lesz
3. Írj Claude-nak pl.: *"Generálj egy Ansible playbook-ot nginx telepítésére"*
4. Claude használni fogja az ansible-mcp szervert!

---

## 4. GitHub Container Registry 📦

**Mit jelent?** Előre lefordított Docker image-eket használsz közvetlenül GitHub-ról, gyorsabb indítás!

### Image letöltése:

```bash
# MCP Server letöltése
docker pull ghcr.io/w7-mgfcode/mannos-ansible_mcp-solution-mcp-server:latest

# AI Generátor letöltése
docker pull ghcr.io/w7-mgfcode/mannos-ansible_mcp-solution-ai-generator:latest
```

### Futtatás:

```bash
# MCP Szerver indítása
docker run -d \
  --name ansible-mcp \
  -p 3000:3000 \
  -v $(pwd)/playbooks:/workspace/playbooks \
  -v $(pwd)/inventory:/workspace/inventory \
  -v $(pwd)/logs:/workspace/logs \
  ghcr.io/w7-mgfcode/mannos-ansible_mcp-solution-mcp-server:latest

# Működés ellenőrzése
curl http://localhost:3000/health
```

### Playbook generálás példa:

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Kubernetes klaszter telepítése 3 node-dal"
    }
  }' | jq '.'
```

### Leállítás:

```bash
docker stop ansible-mcp
docker rm ansible-mcp
```

---

## 5. GitHub Actions használata ⚙️

**Mit jelent?** Automatizált CI/CD pipeline, amely minden commit után futtatja az MCP szervert.

### Példa workflow:

Hozz létre `.github/workflows/deploy.yml` fájlt:

```yaml
name: Ansible Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Playbook Generálás
        id: generate
        run: |
          docker run --rm \
            -v $(pwd):/workspace \
            ghcr.io/w7-mgfcode/mannos-ansible_mcp-solution-mcp-server:latest \
            node -e "console.log('Playbook generation')"

      - name: Ansible Playbook Futtatás
        run: |
          ansible-playbook generated-playbook.yml -i inventory/production --check
```

### Mi történik?

1. Minden `main` branch push után
2. GitHub Actions letölti az MCP server Docker image-et
3. Generál egy playbook-ot
4. Dry-run módban lefuttatja (--check)

---

## ⚙️ Környezeti Változók

Mindegyik módszer támogatja ezeket a környezeti változókat:

```bash
# MCP Szerver
NODE_ENV=production              # production vagy development
MCP_PORT=3000                    # MCP szerver port
LOG_LEVEL=info                   # info, debug, error
ANSIBLE_HOST_KEY_CHECKING=False  # SSH host key ellenőrzés kikapcsolása

# AI Generátor (opcionális)
OPENAI_API_KEY=sk-...            # OpenAI API kulcs
MODEL_NAME=gpt-4                 # Használt LLM modell
REDIS_HOST=redis                 # Redis szerver címe
```

### Docker-rel való átadás:

```bash
docker run -d \
  -e NODE_ENV=production \
  -e LOG_LEVEL=debug \
  -e OPENAI_API_KEY=sk-xxx \
  -p 3000:3000 \
  ghcr.io/w7-mgfcode/mannos-ansible_mcp-solution-mcp-server:latest
```

---

## 🧪 Működés Tesztelése

### 1. Health Check

```bash
curl http://localhost:3000/health
```

Válasz:
```json
{"status": "ok", "version": "1.0.0"}
```

### 2. Eszközök Listázása

```bash
curl -X POST http://localhost:3000/tools | jq '.'
```

Elérhető eszközök:
- `generate_playbook`
- `validate_playbook`
- `run_playbook`
- `refine_playbook`
- `lint_playbook`

### 3. Playbook Generálás

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "PostgreSQL adatbázis telepítése replikációval",
      "context": {
        "environment": "production",
        "target_hosts": "db_servers"
      }
    }
  }' | jq '.'
```

### 4. Playbook Validálás

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "validate_playbook",
    "arguments": {
      "playbook_path": "/workspace/playbooks/playbook_123456.yml",
      "strict": true
    }
  }' | jq '.'
```

---

## 🔒 Hitelesítés és Biztonság

### GitHub Container Registry Hitelesítés

Privát repository esetén:

```bash
# Bejelentkezés GitHub Container Registry-be
echo $GITHUB_TOKEN | docker login ghcr.io -u FELHASZNÁLÓNÉV --password-stdin

# Privát image letöltése
docker pull ghcr.io/w7-mgfcode/mannos-ansible_mcp-solution-mcp-server:latest
```

### GitHub Token generálása:

1. GitHub → Settings → Developer settings
2. Personal access tokens → Tokens (classic)
3. Generate new token
4. Jogok: `read:packages`, `write:packages`

---

## 📊 Monitoring és Naplózás

### Grafana Dashboard

```
URL: http://localhost:3001
Felhasználó: admin
Jelszó: ansible-mcp
```

Dashboardok:
- Ansible Playbook végrehajtások
- Generált playbook-ok száma
- Hibák és figyelmeztetések
- Rendszer metrikák

### Prometheus Metrikák

```
URL: http://localhost:9090
```

Elérhető metrikák:
- `ansible_playbooks_generated_total`
- `ansible_playbook_execution_seconds`
- `ansible_validation_errors_total`

### Logok Megtekintése

```bash
# Docker Compose
docker-compose logs -f ansible-mcp

# Standalone Docker
docker logs -f ansible-mcp

# GitHub Codespaces
# VS Code Terminal vagy Ports panel
```

---

## 🆘 Hibaelhárítás

### Hiba: Port már használatban van

```bash
# Ellenőrizd mi használja a portot
lsof -i :3000

# Használj más portot
docker run -p 3001:3000 ...
```

### Hiba: Permission denied

```bash
# Docker csoport hozzáadása
sudo usermod -aG docker $USER
newgrp docker

# Fájl jogosultságok
sudo chown -R $USER:$USER playbooks/ inventory/ logs/
```

### Hiba: Image nem található

```bash
# Bejelentkezés
echo $GITHUB_TOKEN | docker login ghcr.io -u FELHASZNÁLÓNÉV --password-stdin

# Vagy build-eld lokálisan
docker-compose build
```

### Hiba: Codespace nem indul

1. Ellenőrizd a GitHub Codespaces kvótát (Settings → Billing)
2. Törölj régi codespace-eket
3. Próbálj más branch-ről indítani

---

## 🎯 Melyik módszert válaszd?

| Használati Eset | Ajánlott Módszer | Miért |
|-----------------|------------------|-------|
| **Gyors kipróbálás** | GitHub Codespaces | Nincs telepítés |
| **Fejlesztés** | Lokális Docker | Teljes kontroll |
| **Production** | Docker Compose + GitHub Actions | Automatizált + monitorozott |
| **CI/CD** | GitHub Container Registry | Előre build-elt image-ek |
| **Claude használat** | MCP Config | Natív integráció |

---

## 📚 További Dokumentációk

- **MCP_CONFIG.md**: Részletes konfiguráció angol nyelven
- **CLAUDE.md**: AI asszisztens útmutató
- **README.md**: Általános dokumentáció
- **USAGE.md**: Használati példák

---

## 💡 Tippek

### 1. Gyors Start Script

Hozz létre egy `start.sh` fájlt:

```bash
#!/bin/bash
echo "🚀 Ansible MCP Server indítása..."

# Image letöltése
docker pull ghcr.io/w7-mgfcode/mannos-ansible_mcp-solution-mcp-server:latest

# Indítás
docker run -d \
  --name ansible-mcp \
  -p 3000:3000 \
  -v $(pwd)/playbooks:/workspace/playbooks \
  ghcr.io/w7-mgfcode/mannos-ansible_mcp-solution-mcp-server:latest

echo "✅ MCP Server fut a http://localhost:3000 címen"
echo "📊 Grafana: http://localhost:3001 (admin/ansible-mcp)"
```

Használat:
```bash
chmod +x start.sh
./start.sh
```

### 2. Alias Parancsok

Add hozzá a `~/.bashrc` vagy `~/.zshrc` fájlhoz:

```bash
alias ansible-mcp-start='docker-compose up -d'
alias ansible-mcp-stop='docker-compose down'
alias ansible-mcp-logs='docker-compose logs -f ansible-mcp'
alias ansible-mcp-generate='curl -X POST http://localhost:3000/execute -H "Content-Type: application/json" -d'
```

Használat:
```bash
ansible-mcp-start
ansible-mcp-logs
ansible-mcp-generate '{"tool":"generate_playbook","arguments":{"prompt":"Install nginx"}}'
```

### 3. VS Code Integráció

Telepítsd a Docker és Remote - Containers extension-öket, majd:

1. Open in Container
2. Válaszd a projektet
3. Automatikusan elindul a dev környezet

---

**Válaszd ki a neked legmegfelelőbb módszert és kezdj neki! 🎉**

Ha bármilyen kérdésed van, nyiss egy Issue-t a GitHub repository-ban.
