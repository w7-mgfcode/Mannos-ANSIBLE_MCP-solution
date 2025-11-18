# Konfigurációs Útmutató

> Teljes konfigurációs referencia az Ansible MCP Szerverhez

## Tartalomjegyzék

1. [Környezeti változók](#környezeti-változók)
2. [Ansible konfiguráció](#ansible-konfiguráció)
3. [Docker Compose konfiguráció](#docker-compose-konfiguráció)
4. [Biztonsági konfiguráció](#biztonsági-konfiguráció)
5. [Monitorozás konfiguráció](#monitorozás-konfiguráció)

---

## Környezeti változók

### MCP Szerver (TypeScript)

| Változó | Leírás | Alapértelmezett | Kötelező |
|---------|--------|-----------------|----------|
| `NODE_ENV` | Környezeti mód | `development` | Nem |
| `MCP_PORT` | Szerver port | `3000` | Nem |
| `LOG_LEVEL` | Naplózási szint | `info` | Nem |
| `WORK_DIR` | Munkakönyvtár | `/tmp/ansible-mcp` | Nem |
| `REDIS_HOST` | Redis hostnév | `localhost` | Nem |
| `REDIS_PORT` | Redis port | `6379` | Nem |
| `VAULT_ADDR` | Vault cím | `http://localhost:8200` | Nem |
| `VAULT_TOKEN` | Vault token | - | Vault-hoz |
| `RATE_LIMIT` | Kérések percenként | `100` | Nem |
| `MAX_FILE_SIZE` | Max fájlméret (bájt) | `1048576` | Nem |

### AI Generátor (Python)

| Változó | Leírás | Alapértelmezett | Kötelező |
|---------|--------|-----------------|----------|
| `AI_PROVIDER` | AI szolgáltató | `openai` | Nem |
| `AI_MODEL` | Használt modell | `gpt-4` | Nem |
| `OPENAI_API_KEY` | OpenAI API kulcs | - | OpenAI-hoz |
| `ANTHROPIC_API_KEY` | Anthropic API kulcs | - | Anthropic-hoz |
| `GEMINI_API_KEY` | Google API kulcs | - | Gemini-hez |
| `OLLAMA_HOST` | Ollama host | `http://localhost:11434` | Ollama-hoz |
| `PYTHONUNBUFFERED` | Puffereletlen kimenet | `1` | Nem |

### Példa .env fájl

```bash
# Szerver konfiguráció
NODE_ENV=production
MCP_PORT=3000
LOG_LEVEL=info

# AI konfiguráció
AI_PROVIDER=openai
AI_MODEL=gpt-4
OPENAI_API_KEY=sk-az-ön-kulcsa

# Infrastruktúra
REDIS_HOST=redis
VAULT_ADDR=http://vault:8200
VAULT_TOKEN=myroot

# Biztonság
RATE_LIMIT=100
MAX_FILE_SIZE=1048576

# Monitorozás
GRAFANA_ADMIN_PASSWORD=biztonsagos-jelszo
```

---

## Ansible konfiguráció

### ansible.cfg

```ini
[defaults]
# Inventory
inventory = /workspace/inventory/hosts
host_key_checking = False
retry_files_enabled = False

# Teljesítmény
forks = 50
pipelining = True
strategy = free
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_facts
fact_caching_timeout = 86400

# Naplózás
log_path = /workspace/logs/ansible.log
display_skipped_hosts = True

# Callback-ek
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

### Kulcs beállítások magyarázata

#### Teljesítmény beállítások

| Beállítás | Érték | Cél |
|-----------|-------|-----|
| `forks` | 50 | Párhuzamos folyamatok |
| `pipelining` | True | Kevesebb SSH művelet |
| `strategy` | free | Nem blokkoló végrehajtás |
| `gathering` | smart | Fact-ok gyorsítótárazása |
| `fact_caching_timeout` | 86400 | 24 órás gyorsítótár |

#### SSH beállítások

| Beállítás | Érték | Cél |
|-----------|-------|-----|
| `ControlMaster` | auto | Kapcsolat multiplexelés |
| `ControlPersist` | 60s | Kapcsolatok nyitva tartása |
| `pipelining` | True | Műveletek csökkentése |

### Inventory fájl

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

## Docker Compose konfiguráció

### Szolgáltatás konfiguráció

#### MCP Szerver

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

#### AI Generátor

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

### Produkciós felülírások

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

## Biztonsági konfiguráció

### Sebességkorlátozás

```typescript
// Konfiguráció a server.ts-ben
const rateLimitConfig = {
  windowMs: 60000,        // 1 perc
  maxRequests: 100,       // Ablakonként
  toolLimits: {
    'generate_playbook': 20,
    'run_playbook': 10,
    'validate_playbook': 50
  }
};
```

### Fájlméret limitek

```typescript
const securityConfig = {
  maxFileSize: 1048576,    // 1 MB
  allowedExtensions: ['.yml', '.yaml'],
  workDirectory: '/tmp/ansible-mcp'
};
```

### Útvonal validálás

```typescript
// Útvonal-bejárás megelőzése
const validatePath = (filePath: string): boolean => {
  const resolved = path.resolve(filePath);
  return resolved.startsWith(workDirectory);
};
```

### Titokkód-észlelés minták

```typescript
const secretPatterns = [
  /AKIA[0-9A-Z]{16}/,           // AWS Access Key
  /password\s*[:=]\s*['"][^'"]+/i,  // Jelszó
  /api[_-]?key\s*[:=]\s*['"][^'"]+/i, // API kulcs
  /token\s*[:=]\s*['"][^'"]+/i,   // Token
  /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/ // JWT
];
```

### TLS konfiguráció

```yaml
# Produkcióhoz TLS hozzáadása a szolgáltatásokhoz
services:
  ansible-mcp:
    environment:
      - TLS_CERT=/certs/server.crt
      - TLS_KEY=/certs/server.key
    volumes:
      - ./certs:/certs:ro
```

---

## Monitorozás konfiguráció

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

### Riasztási szabályok

```yaml
# monitoring/prometheus/alerts/ansible.yml
groups:
  - name: ansible-mcp
    rules:
      - alert: MagasHibaarány
        expr: rate(ansible_playbook_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Magas playbook hibaarány"
          description: "A hibaarány {{ $value }} hiba/másodperc"

      - alert: LassúGenerálás
        expr: histogram_quantile(0.95, rate(ansible_playbook_generation_seconds_bucket[5m])) > 30
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Lassú playbook generálás"
```

### Naplózás

```typescript
// Winston logger konfiguráció
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

## TypeScript konfiguráció

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

## Legjobb gyakorlatok

### Környezet szétválasztás

```bash
# Fejlesztés
cp .env.example .env.development
export NODE_ENV=development

# Staging
cp .env.example .env.staging
export NODE_ENV=staging

# Produkció
cp .env.example .env.production
export NODE_ENV=production
```

### Titokkezelés

1. **Soha ne commit-oljon titkokat** verziókezelésbe
2. **Használjon Vault-ot** produkciós titkokhoz
3. **Rendszeresen rotálja a kulcsokat**
4. **Auditálja a hozzáférést** érzékeny konfigurációhoz

### Teljesítmény hangolás

1. **Növelje a forks értéket** több párhuzamossághoz
2. **Engedélyezze a pipelining-et** SSH hatékonysághoz
3. **Használjon fact gyorsítótárazást** ismételt futtatásokhoz
4. **Konfigurálja a Redis-t** gyorsítótárazáshoz

### Monitorozás beállítás

1. **Engedélyezze az összes metrikát** produkcióban
2. **Állítson be riasztásokat** kritikus problémákhoz
3. **Konfigurálja a dashboardokat** láthatósághoz
4. **Őrizze meg a naplókat** hibaelhárításhoz

---

**Következő**: [Hibaelhárítás](TROUBLESHOOTING.md) | [API Referencia](API_REFERENCE.md)
