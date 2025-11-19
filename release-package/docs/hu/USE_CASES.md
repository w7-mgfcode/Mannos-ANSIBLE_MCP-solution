# Használati Esetek

> Valós példák és forgatókönyvek az Ansible MCP Szerverhez

## Tartalomjegyzék

1. [Alapvető használati esetek](#alapvető-használati-esetek)
2. [Kubernetes telepítések](#kubernetes-telepítések)
3. [Docker infrastruktúra](#docker-infrastruktúra)
4. [Biztonság és megerősítés](#biztonság-és-megerősítés)
5. [Adatbázis kezelés](#adatbázis-kezelés)
6. [Monitorozás beállítása](#monitorozás-beállítása)
7. [CI/CD integráció](#cicd-integráció)
8. [Multi-Cloud telepítések](#multi-cloud-telepítések)

---

## Alapvető használati esetek

### 1. Gyors Nginx beállítás

**Prompt**:
```
Telepíts és konfigurálj nginx-et reverse proxy-ként Ubuntu szervereken
```

**Generált Playbook**:
```yaml
---
- name: Nginx Reverse Proxy telepítése és konfigurálása
  hosts: "{{ target_hosts | default('webservers') }}"
  become: yes
  vars:
    nginx_upstream_servers:
      - "127.0.0.1:8080"
    nginx_server_name: "{{ server_name | default('example.com') }}"

  tasks:
    - name: Nginx telepítése
      apt:
        name: nginx
        state: present
        update_cache: yes
      tags: [install]

    - name: Nginx reverse proxy konfigurálása
      template:
        src: reverse_proxy.conf.j2
        dest: /etc/nginx/sites-available/reverse_proxy
        mode: '0644'
      notify: nginx újratöltése
      tags: [configure]

    - name: Site konfiguráció engedélyezése
      file:
        src: /etc/nginx/sites-available/reverse_proxy
        dest: /etc/nginx/sites-enabled/reverse_proxy
        state: link
      notify: nginx újratöltése
      tags: [configure]

    - name: Nginx futásának biztosítása
      service:
        name: nginx
        state: started
        enabled: yes
      tags: [service]

  handlers:
    - name: nginx újratöltése
      service:
        name: nginx
        state: reloaded
```

**Végrehajtás**:
```bash
# Generálás
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{"tool": "generate_playbook", "arguments": {"prompt": "Telepíts nginx-et reverse proxy-ként Ubuntu-n"}}'

# Futtatás check módban
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{"tool": "run_playbook", "arguments": {"playbook_path": "/tmp/ansible-mcp/playbook_xxx.yml", "check_mode": true}}'
```

---

### 2. Felhasználó kezelés

**Prompt**:
```
Hozz létre rendszerfelhasználókat SSH kulcsokkal és sudo hozzáféréssel a fejlesztői csapat számára
```

**API hívás**:
```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Hozz létre rendszerfelhasználókat SSH kulcsokkal és sudo hozzáféréssel a fejlesztői csapat számára",
      "context": {
        "target_hosts": "all",
        "environment": "development",
        "tags": ["users", "security", "ssh"]
      }
    }
  }'
```

**Használati eset részletek**:
- Szabványos felhasználói fiókok létrehozása
- SSH publikus kulcs hitelesítés konfigurálása
- Sudo jogosultságok beállítása megfelelő korlátozásokkal
- Egységes jelszóházirendek alkalmazása

---

### 3. Csomagfrissítések

**Prompt**:
```
Frissíts minden csomagot és indítsd újra a szervert, ha a kernel frissült a produkciós szervereken
```

**Generált funkciók**:
- Elérhető frissítések ellenőrzése
- Biztonsági javítások elsőként történő alkalmazása
- Kernel frissítések kezelése feltételes újraindítással
- Várakozás a szerverek visszatérésére
- Szolgáltatások validálása újraindítás után

---

## Kubernetes telepítések

### 1. Produkciós webalkalmazás

**Prompt**:
```
Telepíts egy skálázható webalkalmazást Kubernetes-re 3 replikával,
egészségügyi ellenőrzésekkel, erőforrás-korlátokkal és Ingress konfigurációval produkció számára
```

**API hívás**:
```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Telepíts skálázható web appot Kubernetes-re 3 replikával, health check-ekkel, resource limitekkel, Ingress-szel produkcióra",
      "template": "kubernetes_deployment",
      "context": {
        "target_hosts": "k8s_master",
        "environment": "production",
        "tags": ["kubernetes", "deploy", "production"]
      }
    }
  }'
```

**Generált funkciók**:
- Deployment 3 replikával
- Resource requests és limits
- Liveness és readiness probe-ok
- ConfigMap konfigurációhoz
- Secret érzékeny adatokhoz
- Service (ClusterIP/LoadBalancer)
- Ingress TLS-sel
- HorizontalPodAutoscaler

### 2. Adatbázis klaszter

**Prompt**:
```
Telepíts PostgreSQL klasztert Kubernetes-en perzisztens tárolással,
automatikus mentésekkel és monitorozás integrációval
```

**Generált funkciók**:
- StatefulSet PostgreSQL-hez
- PersistentVolumeClaim-ek
- Automatizált backup CronJob
- PostgreSQL Exporter Prometheus-hoz
- Network Policy-k biztonsághoz

---

## Docker infrastruktúra

### 1. Docker Host beállítás

**Prompt**:
```
Telepíts Docker-t és Docker Compose-t Ubuntu 22.04-re megfelelő biztonsági
konfigurációval és log rotációval
```

**API hívás**:
```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Telepíts Docker-t és Docker Compose-t Ubuntu 22.04-re biztonsággal és log rotációval",
      "template": "docker_setup"
    }
  }'
```

**Generált funkciók**:
- Docker CE telepítés hivatalos repository-ból
- Docker Compose v2 plugin
- Felhasználói jogosultságok (docker csoport)
- Daemon konfiguráció:
  - Log rotáció (max-size: 10m, max-file: 3)
  - Storage driver konfiguráció
  - Live restore engedélyezve
- UFW szabályok Docker-hez
- Rendszer erőforrás limitek

### 2. Konténer Registry

**Prompt**:
```
Állíts be privát Docker registry-t hitelesítéssel, TLS-sel és
szemétgyűjtéssel az infrastruktúrán
```

**Generált funkciók**:
- Registry konténer telepítés
- Nginx reverse proxy SSL-lel
- htpasswd hitelesítés
- Automatizált szemétgyűjtés
- S3/MinIO storage backend opció

### 3. Docker Swarm klaszter

**Prompt**:
```
Inicializálj Docker Swarm klasztert 3 manager-rel és 5 worker-rel,
titkosított overlay hálózatokkal és Traefik load balancer-rel
```

**Generált funkciók**:
- Swarm inicializálás
- Manager/Worker join tokenek
- Overlay hálózatok titkosítással
- Traefik telepítés globális service-ként
- Portainer kezelési UI-hoz

---

## Biztonság és megerősítés

### 1. Rendszer megerősítés

**Prompt**:
```
Alkalmazz CIS benchmark biztonsági megerősítést Ubuntu szervereken, beleértve
SSH megerősítést, tűzfalat és audit naplózást
```

**API hívás**:
```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Alkalmazz CIS biztonsági megerősítést Ubuntu-n: SSH megerősítés, tűzfal, audit naplózás",
      "template": "system_hardening",
      "context": {
        "environment": "production",
        "tags": ["security", "hardening", "compliance"]
      }
    }
  }'
```

**Generált funkciók**:
- SSH megerősítés:
  - Root bejelentkezés letiltása
  - Csak kulcs-alapú hitelesítés
  - Erős titkosítások és MAC-ok
  - Bejelentkezési türelmi idő limitek
- UFW/iptables konfiguráció
- Fail2ban telepítés és konfiguráció
- Auditd szabályok
- Kernel paraméter megerősítés (sysctl)
- Fájljogosultság javítások
- Szükségtelen szolgáltatások letiltása

### 2. SSL/TLS tanúsítvány kezelés

**Prompt**:
```
Állíts be automatikus SSL tanúsítvány kezelést Let's Encrypt-tel és
automatikus megújítással webszerverekhez
```

**Generált funkciók**:
- Certbot telepítés
- ACME challenge kezelés
- Tanúsítvány generálás
- Automatikus megújítás cron job
- Nginx/Apache integráció

### 3. Titokkezelés

**Prompt**:
```
Konfiguráld a HashiCorp Vault-ot titokkezeléshez AppRole hitelesítéssel
és automatikus titok rotációval
```

**Generált funkciók**:
- Vault telepítés/konfiguráció
- AppRole beállítás
- KV secrets engine
- Titok rotációs házirendek
- Alkalmazás integráció

---

## Adatbázis kezelés

### 1. PostgreSQL beállítás

**Prompt**:
```
Telepíts PostgreSQL 15-öt replikációval, automatikus S3 mentésekkel
és pg_stat_statements monitorozással
```

**API hívás**:
```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Telepíts PostgreSQL 15-öt replikációval, S3 mentésekkel, pg_stat_statements monitorozással",
      "context": {
        "target_hosts": "database_servers",
        "environment": "production"
      }
    }
  }'
```

**Generált funkciók**:
- PostgreSQL 15 telepítés
- Primary/Replica konfiguráció
- Streaming replikáció
- pgBackRest mentésekhez
- S3 mentési célhely
- pg_stat_statements extension
- PostgreSQL Exporter Prometheus-hoz

### 2. MySQL/MariaDB klaszter

**Prompt**:
```
Telepíts MariaDB Galera klasztert 3 node-dal, ProxySQL load balancinggal
és automatikus failover-rel
```

**Generált funkciók**:
- Galera klaszter beállítás
- wsrep konfiguráció
- ProxySQL telepítés
- Read/write split
- Monitorozás integráció

### 3. Redis klaszter

**Prompt**:
```
Állíts be Redis Sentinel klasztert 3 node-dal magas rendelkezésre állású gyorsítótárazáshoz
```

**Generált funkciók**:
- Redis telepítés
- Sentinel konfiguráció
- Master/Slave replikáció
- Automatikus failover
- Perzisztencia konfiguráció

---

## Monitorozás beállítása

### 1. Teljes megfigyelhetőségi stack

**Prompt**:
```
Telepíts teljes monitorozó stacket Prometheus-szal, Grafana-val, AlertManager-rel
és Loki-val log aggregációhoz
```

**API hívás**:
```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Telepíts monitorozást: Prometheus, Grafana, AlertManager, Loki logokhoz",
      "context": {
        "target_hosts": "monitoring_servers",
        "environment": "production",
        "tags": ["monitoring", "observability"]
      }
    }
  }'
```

**Generált funkciók**:
- Prometheus szerver
- Node Exporter minden hoston
- Grafana dashboardokkal
- AlertManager útvonalakkal
- Loki + Promtail
- Előre konfigurált dashboardok
- Slack/Email riasztás

### 2. Alkalmazás teljesítmény monitorozás

**Prompt**:
```
Állíts be elosztott nyomkövetést Jaeger-rel és alkalmazás metrikák
gyűjtését mikroszolgáltatásokhoz
```

**Generált funkciók**:
- Jaeger all-in-one/production
- OpenTelemetry collector-ok
- Service mesh integráció
- Trace sampling konfiguráció

---

## CI/CD integráció

### 1. Jenkins Pipeline

**Prompt**:
```
Telepíts Jenkins-t ajánlott pluginekkel, konfigurálj GitHub integrációt
és állíts be egy minta deklaratív pipeline-t
```

**API hívás**:
```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Telepíts Jenkins-t pluginekkel, GitHub integrációval, minta deklaratív pipeline-nal",
      "context": {
        "target_hosts": "cicd_servers",
        "tags": ["jenkins", "cicd", "automation"]
      }
    }
  }'
```

**Generált funkciók**:
- Jenkins LTS telepítés
- Plugin telepítés (Git, Pipeline, Docker, stb.)
- GitHub webhook konfiguráció
- Credentials kezelés
- Minta Jenkinsfile

### 2. GitLab CI/CD

**Prompt**:
```
Állíts be GitLab Runner-t Docker executor-ral CI/CD pipeline-okhoz,
cache konfigurációval és artifact tárolással
```

**Generált funkciók**:
- GitLab Runner telepítés
- Docker executor konfiguráció
- Megosztott cache (S3/MinIO)
- Artifact tárolás
- Runner regisztráció

### 3. ArgoCD GitOps

**Prompt**:
```
Telepíts ArgoCD-t GitOps-alapú Kubernetes telepítésekhez
RBAC-cal és SSO integrációval
```

**Generált funkciók**:
- ArgoCD telepítés
- Application CRD-k
- RBAC konfiguráció
- OIDC/LDAP integráció
- Értesítés konfiguráció

---

## Multi-Cloud telepítések

### 1. AWS infrastruktúra

**Prompt**:
```
Hozz létre AWS infrastruktúrát VPC-vel, EC2 instance-okkal, RDS adatbázissal
és S3 bucket-tel Ansible használatával
```

**API hívás**:
```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Hozz létre AWS-t: VPC, EC2, RDS, S3 bucket",
      "context": {
        "environment": "production",
        "tags": ["aws", "cloud", "infrastructure"]
      }
    }
  }'
```

**Generált funkciók**:
- VPC publikus/privát alhálózatokkal
- Security group-ok
- EC2 instance-ok címkékkel
- RDS PostgreSQL/MySQL
- S3 bucket házirendekkel
- IAM szerepek

### 2. Azure infrastruktúra

**Prompt**:
```
Telepíts Azure erőforrásokat, beleértve Resource Group-ot, Virtual Network-öt,
Virtual Machine-eket és Azure SQL Database-t
```

**Generált funkciók**:
- Resource group
- Virtual network + alhálózatok
- Network security group-ok
- Virtual machine-ek
- Azure SQL
- Storage account-ok

---

## Legjobb gyakorlatok

### 1. Használj kontextust jobb eredményekért

```bash
# Mindig adj meg kontextust produkciós workload-okhoz
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Redis klaszter telepítése",
      "context": {
        "target_hosts": "redis_servers",
        "environment": "production",
        "tags": ["redis", "cache", "ha"]
      }
    }
  }'
```

### 2. Validálj végrehajtás előtt

```bash
# Mindig validáld a generált playbook-okat
playbook_path=$(generate_playbook ...)

# Validálás
curl -X POST http://localhost:3000/execute \
  -d '{"tool": "validate_playbook", "arguments": {"playbook_path": "'$playbook_path'", "strict": true}}'

# Lint
curl -X POST http://localhost:3000/execute \
  -d '{"tool": "lint_playbook", "arguments": {"playbook_path": "'$playbook_path'"}}'

# Száraz futtatás
curl -X POST http://localhost:3000/execute \
  -d '{"tool": "run_playbook", "arguments": {"playbook_path": "'$playbook_path'", "check_mode": true}}'
```

### 3. Használj finomítást összetett feladatokhoz

```bash
# Ha az első generálás nem tökéletes, finomítsd
curl -X POST http://localhost:3000/execute \
  -d '{
    "tool": "refine_playbook",
    "arguments": {
      "playbook_path": "'$playbook_path'",
      "feedback": "Adj hozzá hibakezelést, tedd idempotentté, adj rollback képességet"
    }
  }'
```

---

**Következő**: [API Referencia](API_REFERENCE.md) | [Konfiguráció](CONFIGURATION.md) | [Hibaelhárítás](TROUBLESHOOTING.md)
