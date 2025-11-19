# Hibaelhárítási Útmutató

> Megoldások az Ansible MCP Szerver gyakori problémáihoz

## Tartalomjegyzék

1. [Indítási problémák](#indítási-problémák)
2. [Generálási problémák](#generálási-problémák)
3. [Validálási problémák](#validálási-problémák)
4. [Végrehajtási problémák](#végrehajtási-problémák)
5. [Kapcsolódási problémák](#kapcsolódási-problémák)
6. [Teljesítmény problémák](#teljesítmény-problémák)
7. [Biztonsági problémák](#biztonsági-problémák)

---

## Indítási problémák

### MCP Szerver nem indul el

#### Tünet
A Docker konténer azonnal kilép vagy nem indul el.

#### Diagnózis
```bash
# Konténer naplók ellenőrzése
docker compose logs ansible-mcp

# Fut-e a konténer ellenőrzése
docker compose ps
```

#### Gyakori okok és megoldások

**1. Port konfliktus**
```bash
# Ellenőrizze, használatban van-e a port
lsof -i :3000

# Megoldás: Port változtatása vagy konfliktáló folyamat leállítása
# A docker-compose.yml-ben:
ports:
  - "3001:3000"
```

**2. Build hiba**
```bash
# TypeScript fordítás ellenőrzése
npm run build

# Gyakori javítás: Törlés és újratelepítés
rm -rf node_modules dist
npm install
npm run build
```

**3. Hiányzó függőségek**
```bash
# Függőségek újratelepítése
npm install

# Konténer újraépítése
docker compose build --no-cache ansible-mcp
```

**4. Jogosultsági problémák**
```bash
# Volume jogosultságok javítása
chmod -R 755 playbooks inventory logs
chown -R 1000:1000 playbooks inventory logs
```

---

### AI Generátor nem indul el

#### Tünet
A Python szolgáltatás nem indul el vagy összeomlik.

#### Diagnózis
```bash
docker compose logs ai-generator
```

#### Megoldások

**1. Hiányzó API kulcs**
```bash
# Környezeti változó ellenőrzése
docker compose exec ai-generator env | grep API_KEY

# Megoldás: Hozzáadás a .env-hez
echo "OPENAI_API_KEY=sk-az-ön-kulcsa" >> .env
docker compose up -d ai-generator
```

**2. Python függőségek**
```bash
# Újraépítés friss függőségekkel
docker compose build --no-cache ai-generator
```

---

## Generálási problémák

### Playbook generálás sikertelen

#### Tünet
A `generate_playbook` `success: false`-t ad vissza

#### Diagnózis
```bash
# Mindkét szolgáltatás ellenőrzése
docker compose logs ansible-mcp
docker compose logs ai-generator
```

#### Gyakori okok és megoldások

**1. Homályos prompt**
```json
// Rossz
{"prompt": "szerver beállítás"}

// Jó
{"prompt": "Telepíts és konfigurálj nginx-et reverse proxy-ként SSL-lel Ubuntu 22.04 szervereken"}
```

**2. Sablon nem található**
```json
// Először ellenőrizze az elérhető sablonokat
{"tool": "list_prompt_templates", "arguments": {}}

// Érvényes sablon használata
{"prompt": "App telepítés", "template": "kubernetes_deployment"}
```

**3. AI szolgáltató hiba**
```bash
# AI szolgáltatás naplóinak ellenőrzése
docker compose logs ai-generator

# API kulcs ellenőrzése
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**4. Sebességkorlátozás túllépve**
```json
{
  "success": false,
  "error_code": "RATE_LIMIT_EXCEEDED"
}

// Várjon és próbálja újra, vagy növelje a limitet a konfigurációban
```

---

### Generált playbook rossz tartalommal

#### Tünet
A playbook nem felel meg a prompt követelményeinek.

#### Megoldások

**1. Több kontextus megadása**
```json
{
  "tool": "generate_playbook",
  "arguments": {
    "prompt": "Redis klaszter telepítése",
    "context": {
      "target_hosts": "redis_servers",
      "environment": "production",
      "tags": ["redis", "cluster", "ha"]
    }
  }
}
```

**2. Finomítás használata**
```json
{
  "tool": "refine_playbook",
  "arguments": {
    "playbook_path": "/tmp/ansible-mcp/playbook_xxx.yml",
    "feedback": "Adj hozzá Sentinel-t HA-hoz, konfiguráld a perzisztenciát, adj monitorozást"
  }
}
```

**3. Specifikus sablon használata**
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

## Validálási problémák

### YAML validáció sikertelen

#### Tünet
```json
{
  "yaml_valid": false,
  "errors": ["YAML parse hiba az X. sorban"]
}
```

#### Gyakori okok és megoldások

**1. Behúzási hiba**
```yaml
# Rossz
tasks:
  - name: Csomag telepítése
  apt:
    name: nginx

# Helyes (2 szóköz behúzás)
tasks:
  - name: Csomag telepítése
    apt:
      name: nginx
```

**2. Speciális karakterek**
```yaml
# Rossz
message: Ez tartalmaz: kettőspontot

# Helyes
message: "Ez tartalmaz: kettőspontot"
```

**3. Tab karakterek**
```bash
# Tab-ok keresése és cseréje
sed -i 's/\t/  /g' playbook.yml
```

---

### Ansible szintaxis ellenőrzés sikertelen

#### Tünet
```json
{
  "ansible_syntax_valid": false,
  "errors": ["ERROR! ..."]
}
```

#### Gyakori okok és megoldások

**1. Érvénytelen modul paraméterek**
```yaml
# Rossz
- name: Nginx telepítése
  apt:
    pkg: nginx  # Rossz paraméter

# Helyes
- name: Nginx telepítése
  apt:
    name: nginx  # Helyes paraméter
```

**2. Hiányzó kötelező mezők**
```yaml
# Rossz
- hosts: all
  tasks:
    - apt: name=nginx

# Helyes
- name: Nginx telepítése
  hosts: all
  tasks:
    - name: Nginx csomag telepítése
      apt:
        name: nginx
```

**3. Nem definiált változók**
```yaml
# Alapértelmezések hozzáadása
vars:
  app_name: "{{ app_name | default('myapp') }}"
```

---

### Titokkódok észlelve

#### Tünet
```json
{
  "secrets_detected": true,
  "secrets_found": [{"type": "AWS Access Key", "line": 15}]
}
```

#### Megoldások

**1. Ansible Vault használata**
```bash
# Érzékeny fájl titkosítása
ansible-vault encrypt vars/secrets.yml

# Hivatkozás a playbook-ban
vars_files:
  - vars/secrets.yml
```

**2. Környezeti változók használata**
```yaml
tasks:
  - name: App konfigurálása
    template:
      src: config.j2
      dest: /etc/app/config.yml
    environment:
      API_KEY: "{{ lookup('env', 'API_KEY') }}"
```

**3. HashiCorp Vault használata**
```yaml
vars:
  db_password: "{{ lookup('hashi_vault', 'secret/data/db:password') }}"
```

---

## Végrehajtási problémák

### Playbook végrehajtás sikertelen

#### Tünet
A `run_playbook` hibákat ad vissza.

#### Diagnózis
```bash
# Manuális futtatás részletesen
ansible-playbook playbook.yml -i inventory/hosts -vvv
```

#### Gyakori okok és megoldások

**1. SSH kapcsolat sikertelen**
```bash
# SSH tesztelése
ssh -i /path/to/key user@host

# Inventory ellenőrzése
ansible -i inventory/hosts all -m ping
```

**2. Hozzáférés megtagadva**
```yaml
# Become hozzáadása
- name: Csomag telepítése
  become: yes
  apt:
    name: nginx
```

**3. Modul nem található**
```bash
# Collection telepítése
ansible-galaxy collection install community.general

# FQCN használata
- community.general.docker_container:
    name: myapp
```

**4. Időtúllépés**
```bash
# Időtúllépés növelése az ansible.cfg-ben
[defaults]
timeout = 60

# Vagy feladatonként
- name: Hosszan futó feladat
  async: 300
  poll: 10
```

---

### Check mód váratlan változásokat mutat

#### Tünet
A száraz futtatás olyan változásokat mutat, amelyeknek nem kellene történniük.

#### Megoldások

**1. Idempotencia biztosítása**
```yaml
# Rossz - mindig változtat
- name: Sor hozzáadása
  shell: echo "config=value" >> /etc/app.conf

# Jó - idempotens
- name: Sor hozzáadása
  lineinfile:
    path: /etc/app.conf
    line: "config=value"
```

**2. State paraméterek használata**
```yaml
- name: Csomag jelenlétének biztosítása
  apt:
    name: nginx
    state: present  # Nem telepíti újra
```

---

## Kapcsolódási problémák

### Nem lehet csatlakozni a Redis-hez

#### Tünet
```
Error: Redis kapcsolat elutasítva
```

#### Megoldások

**1. Szolgáltatás állapot ellenőrzése**
```bash
docker compose ps redis
docker compose logs redis
```

**2. Hálózat ellenőrzése**
```bash
docker compose exec ansible-mcp ping redis
```

**3. Konfiguráció ellenőrzése**
```bash
# Host ellenőrzése a környezetben
docker compose exec ansible-mcp env | grep REDIS

# Kapcsolat tesztelése
docker compose exec redis redis-cli ping
```

---

### Nem lehet csatlakozni a Vault-hoz

#### Tünet
```
Error: Vault kapcsolat sikertelen
```

#### Megoldások

**1. Szolgáltatás ellenőrzése**
```bash
docker compose ps vault
curl http://localhost:8200/v1/sys/health
```

**2. Token ellenőrzése**
```bash
# Dev mód token
export VAULT_TOKEN=myroot

# Hozzáférés tesztelése
curl -H "X-Vault-Token: $VAULT_TOKEN" \
  http://localhost:8200/v1/sys/health
```

**3. Seal állapot ellenőrzése**
```bash
# Produkcióban, unseal vault
vault operator unseal <unseal-key>
```

---

## Teljesítmény problémák

### Lassú playbook generálás

#### Tünet
A generálás több mint 30 másodpercig tart.

#### Megoldások

**1. Gyorsítótárazás használata**
```bash
# Redis futásának biztosítása
docker compose ps redis

# Cache találatok ellenőrzése
docker compose exec redis redis-cli info stats | grep hits
```

**2. Prompt-ok optimalizálása**
```json
// Legyen specifikus, hogy elkerülje a többszöri AI hívásokat
{
  "prompt": "Telepíts nginx 1.25-öt Ubuntu 22.04-re SSL-lel Let's Encrypt használatával",
  "template": "docker_setup"  // Sablon használata
}
```

**3. Gyorsabb AI modell használata**
```bash
# A .env-ben
AI_MODEL=gpt-3.5-turbo  # Gyorsabb mint a gpt-4
```

---

### Lassú playbook végrehajtás

#### Tünet
A végrehajtás hosszabb ideig tart a vártnál.

#### Megoldások

**1. Párhuzamosság növelése**
```ini
# ansible.cfg
[defaults]
forks = 100  # Növelés 50-ről
```

**2. Pipelining engedélyezése**
```ini
[ssh_connection]
pipelining = True
```

**3. Fact gyorsítótárazás használata**
```ini
[defaults]
gathering = smart
fact_caching = redis
fact_caching_connection = redis:6379:0
fact_caching_timeout = 86400
```

**4. Hatókör korlátozása**
```bash
# Futtatás adott hostokon
ansible-playbook playbook.yml --limit web1

# Adott címkék futtatása
ansible-playbook playbook.yml --tags deploy
```

---

## Biztonsági problémák

### Sebességkorlátozás túllépve

#### Tünet
```json
{"error_code": "RATE_LIMIT_EXCEEDED"}
```

#### Megoldások

**1. Várjon a reset-ig**
```bash
# Reset idő ellenőrzése a fejlécekben
X-RateLimit-Reset: 1700000060
```

**2. Limit növelése (ha szükséges)**
```bash
# A .env-ben
RATE_LIMIT=200
```

---

### Útvonal-bejárás észlelve

#### Tünet
```json
{"error_code": "PATH_TRAVERSAL"}
```

#### Megoldás
```bash
# Abszolút útvonalak használata a munkakönyvtáron belül
/tmp/ansible-mcp/playbook.yml  # OK
../../../etc/passwd            # Blokkolva
```

---

## Diagnosztikai parancsok

### Gyors egészségügyi ellenőrzés

```bash
#!/bin/bash
# health-check.sh

echo "=== Szolgáltatás állapot ==="
docker compose ps

echo -e "\n=== MCP Szerver egészség ==="
curl -s http://localhost:3000/health | jq

echo -e "\n=== AI Generátor egészség ==="
curl -s http://localhost:8000/health | jq

echo -e "\n=== Redis állapot ==="
docker compose exec redis redis-cli ping

echo -e "\n=== Vault állapot ==="
curl -s http://localhost:8200/v1/sys/health | jq
```

### Napló elemzés

```bash
# Legutóbbi hibák
docker compose logs --since 1h | grep -i error

# MCP szerver hibák
docker compose logs ansible-mcp 2>&1 | grep -i error | tail -20

# Ansible végrehajtási hibák
grep -i "fatal\|failed" logs/ansible.log | tail -20
```

### Teljesítmény metrikák

```bash
# Prometheus metrikák ellenőrzése
curl -s http://localhost:9090/api/v1/query?query=ansible_playbooks_generated_total | jq

# Generálási késleltetés ellenőrzése
curl -s http://localhost:9090/api/v1/query?query=histogram_quantile\(0.95,ansible_playbook_generation_seconds_bucket\) | jq
```

---

## Segítség kérése

### Debug információk gyűjtése

```bash
# Debug csomag létrehozása
tar -czf debug-bundle-$(date +%Y%m%d).tar.gz \
  logs/ \
  .env \
  docker-compose.yml \
  ansible.cfg
```

### Problémák jelentése

1. Ellenőrizze a meglévő issue-kat a GitHub-on
2. Tartalmazza:
   - Hibaüzenetet és naplókat
   - Reprodukálási lépéseket
   - Környezet részleteit
   - Konfigurációt (titkok nélkül)

---

**Következő**: [README](README.md) | [Telepítés](DEPLOYMENT.md) | [Konfiguráció](CONFIGURATION.md)
