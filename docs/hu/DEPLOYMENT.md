# Telepítési Útmutató

> Teljes útmutató az Ansible MCP Szerver telepítéséhez és üzembe helyezéséhez

## Tartalomjegyzék

1. [Előfeltételek](#előfeltételek)
2. [Docker Compose telepítés](#docker-compose-telepítés)
3. [Önálló telepítés](#önálló-telepítés)
4. [Produkciós telepítés](#produkciós-telepítés)
5. [Felhő telepítés](#felhő-telepítés)
6. [Telepítés utáni ellenőrzés](#telepítés-utáni-ellenőrzés)

---

## Előfeltételek

### Rendszerkövetelmények

| Követelmény | Minimum | Ajánlott |
|-------------|---------|----------|
| CPU | 2 mag | 4+ mag |
| RAM | 4 GB | 8+ GB |
| Lemez | 20 GB | 50+ GB |
| OS | Linux (x64) | Ubuntu 22.04 LTS |

### Szoftverkövetelmények

```bash
# Docker
docker --version  # 24.0+
docker compose version  # 2.20+

# Helyi fejlesztéshez
node --version  # 18.0+
python --version  # 3.11+
ansible --version  # 2.15+
```

### Hálózati követelmények

| Port | Szolgáltatás | Leírás |
|------|--------------|--------|
| 3000 | MCP Szerver | Fő API végpont |
| 8000 | AI Generátor | Python AI szolgáltatás |
| 6379 | Redis | Gyorsítótár |
| 8200 | Vault | Titkok |
| 9090 | Prometheus | Metrikák |
| 3001 | Grafana | Dashboardok |
| 8080 | GitLab | Verziókezelés |
| 8052 | AWX | Ansible UI |

---

## Docker Compose telepítés

### Alap beállítás

```bash
# 1. Repository klónozása
git clone https://github.com/w7-mgfcode/Mannos-ANSIBLE_MCP-solution.git
cd Mannos-ANSIBLE_MCP-solution

# 2. Környezeti fájl létrehozása
cat > .env << 'EOF'
# AI szolgáltató konfiguráció
AI_PROVIDER=openai
AI_MODEL=gpt-4
OPENAI_API_KEY=az-ön-api-kulcsa

# Szerver konfiguráció
NODE_ENV=production
MCP_PORT=3000
LOG_LEVEL=info

# Biztonság
RATE_LIMIT=100
MAX_FILE_SIZE=1048576
EOF

# 3. Összes szolgáltatás indítása
docker compose up -d

# 4. Állapot ellenőrzése
docker compose ps
```

### Szolgáltatás-specifikus beállítás

#### Csak alapszolgáltatások indítása

```bash
# Alap szolgáltatások (MCP Szerver, AI Generátor, Redis)
docker compose up -d ansible-mcp ai-generator redis
```

#### Indítás monitorozással

```bash
# Alap + Monitorozás
docker compose up -d ansible-mcp ai-generator redis prometheus grafana
```

#### Teljes stack indítása

```bash
# Minden szolgáltatás, beleértve GitLab és AWX
docker compose up -d
```

### Telepítés ellenőrzése

```bash
# Ellenőrizze, hogy minden szolgáltatás egészséges
docker compose ps

# MCP szerver naplók ellenőrzése
docker compose logs ansible-mcp

# Egészségügyi végpont tesztelése
curl http://localhost:3000/health
```

---

## Önálló telepítés

### TypeScript MCP Szerver

```bash
# 1. Node.js függőségek telepítése
npm install

# 2. TypeScript fordítás
npm run build

# 3. Környezeti változók beállítása
export NODE_ENV=production
export REDIS_HOST=localhost
export VAULT_ADDR=http://localhost:8200

# 4. Szerver futtatása
node dist/server.js
```

### Python AI Generátor

```bash
# 1. Virtuális környezet létrehozása
python -m venv venv
source venv/bin/activate

# 2. Függőségek telepítése
pip install -r requirements.txt

# 3. Környezeti változók beállítása
export AI_PROVIDER=openai
export OPENAI_API_KEY=az-ön-kulcsa

# 4. Szolgáltatás futtatása
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

### Redis beállítás

```bash
# Redis telepítése
sudo apt install redis-server

# Redis indítása
sudo systemctl start redis
sudo systemctl enable redis

# Ellenőrzés
redis-cli ping  # PONG-ot kell visszaadnia
```

### Vault beállítás

```bash
# Vault telepítése
wget https://releases.hashicorp.com/vault/1.15.0/vault_1.15.0_linux_amd64.zip
unzip vault_1.15.0_linux_amd64.zip
sudo mv vault /usr/local/bin/

# Indítás fejlesztői módban
vault server -dev -dev-root-token-id="myroot"
```

---

## Produkciós telepítés

### Biztonsági megerősítés

#### 1. Produkciós Vault használata

```bash
# Vault konfiguráció létrehozása
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

# Vault inicializálása
vault operator init -key-shares=5 -key-threshold=3
```

#### 2. TLS konfigurálása

```bash
# Tanúsítványok generálása
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout server.key \
  -out server.crt \
  -subj "/CN=ansible-mcp.example.com"

# Frissítse a docker-compose.yml-t a tanúsítványok csatolásához
```

#### 3. Erős hitelesítő adatok beállítása

```bash
# Frissítse a .env-et erős jelszavakkal
cat > .env << 'EOF'
GITLAB_ROOT_PASSWORD=<erős-jelszó>
GRAFANA_ADMIN_PASSWORD=<erős-jelszó>
POSTGRES_PASSWORD=<erős-jelszó>
VAULT_TOKEN=<produkciós-token>
EOF
```

### Magas rendelkezésre állású beállítás

#### Load Balancer konfiguráció (nginx)

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

### Monitorozás beállítás

#### Prometheus riasztások

```yaml
# monitoring/prometheus/alerts.yml
groups:
  - name: ansible-mcp
    rules:
      - alert: MagasHibaarány
        expr: rate(ansible_playbook_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: Magas playbook hibaarány

      - alert: LassúGenerálás
        expr: histogram_quantile(0.95, ansible_playbook_generation_seconds) > 30
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: A playbook generálás lassú
```

---

## Felhő telepítés

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

---

## Telepítés utáni ellenőrzés

### Egészségügyi ellenőrzések

```bash
# 1. MCP szerver ellenőrzése
curl -s http://localhost:3000/health | jq

# 2. AI generátor ellenőrzése
curl -s http://localhost:8000/health | jq

# 3. Redis kapcsolat ellenőrzése
redis-cli -h localhost ping

# 4. Vault ellenőrzése
curl -s http://localhost:8200/v1/sys/health | jq
```

### Funkcionális tesztek

```bash
# 1. Teszt playbook generálása
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Telepíts nginx-et Ubuntu szervereken"
    }
  }' | jq

# 2. Playbook validálása
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "validate_playbook",
    "arguments": {
      "playbook_path": "/tmp/ansible-mcp/playbook_xxx.yml"
    }
  }' | jq
```

### Metrikák ellenőrzése

```bash
# Prometheus célpontok ellenőrzése
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[].health'

# Metrikák gyűjtésének ellenőrzése
curl -s http://localhost:9090/api/v1/query?query=ansible_playbooks_generated_total | jq
```

---

## Karbantartás

### Biztonsági mentés

```bash
# Playbook-ok mentése
tar -czf playbooks-backup-$(date +%Y%m%d).tar.gz playbooks/

# Konfigurációk mentése
tar -czf config-backup-$(date +%Y%m%d).tar.gz \
  ansible.cfg \
  docker-compose.yml \
  .env \
  inventory/
```

### Frissítések

```bash
# Legújabb képek letöltése
docker compose pull

# Újraépítés és újraindítás
docker compose up -d --build

# Naplók ellenőrzése problémák után
docker compose logs -f ansible-mcp
```

### Skálázás

```bash
# MCP szerver példányok skálázása
docker compose up -d --scale ansible-mcp=3
```

---

**Következő**: [Használati esetek](USE_CASES.md) | [API Referencia](API_REFERENCE.md) | [Konfiguráció](CONFIGURATION.md)
