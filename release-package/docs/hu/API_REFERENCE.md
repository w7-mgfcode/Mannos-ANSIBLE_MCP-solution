# API Referencia

> Teljes dokumentáció az összes MCP eszközhöz

## Tartalomjegyzék

1. [Áttekintés](#áttekintés)
2. [Alap eszközök](#alap-eszközök)
3. [Sablon eszközök](#sablon-eszközök)
4. [Eszköz annotációk](#eszköz-annotációk)
5. [Hibakezelés](#hibakezelés)
6. [Sebességkorlátozás](#sebességkorlátozás)

---

## Áttekintés

### MCP Protokoll

Az Ansible MCP Szerver a Model Context Protocol (MCP) 2025-03-26 verzióját implementálja, 11 eszközt biztosítva az Ansible automatizáláshoz.

### Alap URL

```
http://localhost:3000/execute
```

### Kérés formátum

```json
{
  "tool": "eszköz_neve",
  "arguments": {
    "param1": "érték1",
    "param2": "érték2"
  }
}
```

### Válasz formátum

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

## Alap eszközök

### 1. generate_playbook

Ansible playbook generálása természetes nyelvi promptból.

#### Paraméterek

| Paraméter | Típus | Kötelező | Leírás |
|-----------|-------|----------|--------|
| `prompt` | string | Igen | A kívánt playbook természetes nyelvi leírása |
| `template` | string | Nem | Használandó sablon neve |
| `context` | object | Nem | További kontextus a generáláshoz |

#### Kontextus objektum

| Mező | Típus | Leírás |
|------|-------|--------|
| `target_hosts` | string | Cél host csoport (alapértelmezett: 'all') |
| `environment` | string | Környezet: production, staging, development |
| `tags` | string[] | Címkék a feladatokhoz |
| `vars` | object | További változók |

#### Elérhető sablonok

- `kubernetes_deployment` - Kubernetes telepítés szolgáltatásokkal
- `docker_setup` - Docker és Docker Compose telepítés
- `system_hardening` - Biztonsági megerősítés konfiguráció

#### Kérés példa

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Nginx telepítése SSL-lel Ubuntu szervereken",
      "template": "docker_setup",
      "context": {
        "target_hosts": "webservers",
        "environment": "production",
        "tags": ["nginx", "ssl", "web"]
      }
    }
  }'
```

#### Válasz példa

```json
{
  "success": true,
  "playbook_path": "/tmp/ansible-mcp/playbook_1700000000000.yml",
  "playbook_content": "---\n- name: Nginx telepítése SSL-lel...",
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

#### Annotációk

- `readOnlyHint`: false
- `destructiveHint`: false
- `idempotentHint`: true

---

### 2. validate_playbook

Ansible playbook validálása szintaxis és struktúra szempontjából.

#### Paraméterek

| Paraméter | Típus | Kötelező | Leírás |
|-----------|-------|----------|--------|
| `playbook_path` | string | Igen | A playbook fájl abszolút útvonala |
| `strict` | boolean | Nem | Szigorú validálás engedélyezése (alapértelmezett: false) |

#### Kérés példa

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

#### Válasz példa

```json
{
  "success": true,
  "validation_results": {
    "yaml_valid": true,
    "ansible_syntax_valid": true,
    "structure_valid": true,
    "secrets_detected": false,
    "warnings": [
      "Érdemes címkéket hozzáadni a feladatokhoz",
      "Az 'app_name' változónak legyen alapértéke"
    ],
    "errors": []
  }
}
```

#### Validációs ellenőrzések

1. **YAML szintaxis**: Érvényes YAML formátum
2. **Ansible szintaxis**: `ansible-playbook --syntax-check`
3. **Struktúra**: Kötelező mezők (name, hosts, tasks)
4. **Titokkód-észlelés**: AWS kulcsok, jelszavak, tokenek
5. **Legjobb gyakorlatok**: Címkék, handlerek, idempotencia

#### Annotációk

- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true

---

### 3. run_playbook

Ansible playbook végrehajtása.

#### Paraméterek

| Paraméter | Típus | Kötelező | Leírás |
|-----------|-------|----------|--------|
| `playbook_path` | string | Igen | A playbook fájl abszolút útvonala |
| `inventory` | string | Nem | Inventory fájl vagy host minta |
| `extra_vars` | object | Nem | Extra átadandó változók |
| `check_mode` | boolean | Nem | Száraz futtatás mód (alapértelmezett: false) |
| `tags` | string[] | Nem | Csak ezekkel a címkékkel rendelkező feladatok futtatása |
| `skip_tags` | string[] | Nem | Ezekkel a címkékkel rendelkező feladatok kihagyása |
| `limit` | string | Nem | Korlátozás adott hostokra |
| `verbosity` | number | Nem | Részletességi szint (0-4) |

#### Kérés példa

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

#### Válasz példa

```json
{
  "success": true,
  "output": "PLAY [Alkalmazás telepítése] *****\n\nTASK [Csomagok telepítése] *****\nok: [server1]\n\nPLAY RECAP *****\nserver1 : ok=5 changed=2 unreachable=0 failed=0",
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

#### Annotációk

- `readOnlyHint`: false
- `destructiveHint`: true (amikor check_mode=false)
- `idempotentHint`: false

---

### 4. refine_playbook

Playbook javítása visszajelzés vagy validációs hibák alapján.

#### Paraméterek

| Paraméter | Típus | Kötelező | Leírás |
|-----------|-------|----------|--------|
| `playbook_path` | string | Igen | A finomítandó playbook útvonala |
| `feedback` | string | Nem | Emberi visszajelzés a javításokhoz |
| `validation_errors` | string[] | Nem | Javítandó validációs hibák |

#### Kérés példa

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "refine_playbook",
    "arguments": {
      "playbook_path": "/tmp/ansible-mcp/playbook_1700000000000.yml",
      "feedback": "Adj hibakezelést, tedd az összes feladatot idempotentté, adj rollback képességet",
      "validation_errors": [
        "A 'Csomagok telepítése' feladatból hiányzik a when feltétel",
        "A 'restart nginx' handler soha nincs értesítve"
      ]
    }
  }'
```

#### Válasz példa

```json
{
  "success": true,
  "refined_playbook_path": "/tmp/ansible-mcp/playbook_1700000000000_refined.yml",
  "changes_applied": [
    "Visszajelzés alkalmazva: Hibakezelés hozzáadva - block/rescue/always struktúra hozzáadva",
    "Visszajelzés alkalmazva: minden feladat idempotentté téve - állapotellenőrzések hozzáadva",
    "Visszajelzés alkalmazva: rollback képesség hozzáadva - rescue feladatok hozzáadva",
    "Validációs hiba javítva: When feltétel hozzáadva a 'Csomagok telepítése'-hez",
    "Validációs hiba javítva: Notify hozzáadva a 'restart nginx' handler-hez"
  ],
  "original_path": "/tmp/ansible-mcp/playbook_1700000000000.yml"
}
```

---

### 5. lint_playbook

Ansible-lint futtatása playbook-on.

#### Paraméterek

| Paraméter | Típus | Kötelező | Leírás |
|-----------|-------|----------|--------|
| `playbook_path` | string | Igen | A lintelendő playbook útvonala |

#### Kérés példa

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

#### Válasz példa

```json
{
  "success": true,
  "lint_output": "Sikeres, 0 szabálysértéssel",
  "errors": "",
  "violations": [],
  "warnings": [
    {
      "rule": "yaml[line-length]",
      "message": "Túl hosszú sor (120 > 80 karakter)",
      "line": 45
    }
  ]
}
```

---

## Sablon eszközök

### 6. list_prompt_templates

Elérhető prompt sablonok listázása.

#### Paraméterek

| Paraméter | Típus | Kötelező | Leírás |
|-----------|-------|----------|--------|
| `category` | string | Nem | Szűrés kategória szerint |

#### Kategóriák

- `kubernetes` - Kubernetes telepítések
- `docker` - Docker konfigurációk
- `security` - Biztonsági megerősítés
- `database` - Adatbázis beállítások
- `monitoring` - Monitorozó stackek
- `network` - Hálózati konfigurációk
- `cicd` - CI/CD pipeline-ok
- `cloud` - Felhő infrastruktúra
- `general` - Általános sablonok

#### Kérés példa

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

#### Válasz példa

```json
{
  "success": true,
  "templates": [
    {
      "id": "k8s-deployment",
      "name": "Kubernetes Deployment",
      "category": "kubernetes",
      "description": "Alkalmazás telepítése Kubernetes klaszterre",
      "version": "2.0.0",
      "tags": ["kubernetes", "deployment", "production"]
    }
  ],
  "total": 1
}
```

---

### 7. get_prompt_template

Adott prompt sablon részleteinek lekérése.

#### Paraméterek

| Paraméter | Típus | Kötelező | Leírás |
|-----------|-------|----------|--------|
| `template_id` | string | Igen | Sablon azonosító |

---

### 8. enrich_prompt

Prompt gazdagítása few-shot példákkal és következtetéssel.

#### Paraméterek

| Paraméter | Típus | Kötelező | Leírás |
|-----------|-------|----------|--------|
| `prompt` | string | Igen | Gazdagítandó felhasználói prompt |
| `template_id` | string | Nem | Sablon kontextushoz |
| `include_reasoning` | boolean | Nem | Gondolatlánc hozzáadása (alapértelmezett: true) |

---

### 9. generate_with_template

Playbook generálása adott sablon használatával.

#### Paraméterek

| Paraméter | Típus | Kötelező | Leírás |
|-----------|-------|----------|--------|
| `template_id` | string | Igen | Használandó sablon |
| `variables` | object | Igen | Sablon változók |
| `prompt` | string | Nem | További utasítások |

---

### 10. update_template_version

Sablon verziójának frissítése.

#### Paraméterek

| Paraméter | Típus | Kötelező | Leírás |
|-----------|-------|----------|--------|
| `template_id` | string | Igen | Frissítendő sablon |
| `version` | string | Igen | Új verzió (semver) |
| `changelog` | string | Igen | Változások leírása |

---

### 11. get_template_history

Sablon verzió előzményeinek lekérése.

#### Paraméterek

| Paraméter | Típus | Kötelező | Leírás |
|-----------|-------|----------|--------|
| `template_id` | string | Igen | Sablon azonosító |

---

## Eszköz annotációk

Minden eszköz tartalmaz MCP 2025-03-26 annotációkat:

| Annotáció | Leírás | Példa értékek |
|-----------|--------|---------------|
| `readOnlyHint` | Az eszköz nem módosít állapotot | `true` validate, lint esetén |
| `destructiveHint` | Az eszköz adatvesztést okozhat | `true` run esetén (nem-check módban) |
| `idempotentHint` | Biztonságosan többször hívható | `true` generate, validate esetén |

---

## Hibakezelés

### Hiba válasz formátum

```json
{
  "success": false,
  "error": "Hibaüzenet",
  "error_code": "HIBA_KÓD",
  "details": {
    "field": "specifikus információ"
  }
}
```

### Hibakódok

| Kód | Leírás |
|-----|--------|
| `VALIDATION_ERROR` | Bemenet validáció sikertelen |
| `FILE_NOT_FOUND` | Playbook fájl nem található |
| `YAML_PARSE_ERROR` | Érvénytelen YAML szintaxis |
| `ANSIBLE_SYNTAX_ERROR` | Ansible szintaxis ellenőrzés sikertelen |
| `EXECUTION_ERROR` | Playbook végrehajtás sikertelen |
| `SECRETS_DETECTED` | Titokkódok találhatók a playbook-ban |
| `RATE_LIMIT_EXCEEDED` | Túl sok kérés |
| `TEMPLATE_NOT_FOUND` | A sablon nem létezik |
| `PATH_TRAVERSAL` | Érvénytelen fájlútvonal észlelve |

### Példa hiba válasz

```json
{
  "success": false,
  "error": "Titokkódok észlelve a playbook-ban",
  "error_code": "SECRETS_DETECTED",
  "details": {
    "secrets_found": [
      {
        "type": "AWS Access Key",
        "line": 15
      },
      {
        "type": "Jelszó",
        "line": 23
      }
    ],
    "recommendation": "Használjon Ansible Vault-ot vagy környezeti változókat a titokkódokhoz"
  }
}
```

---

## Sebességkorlátozás

### Alapértelmezett limitek

| Végpont | Limit | Ablak |
|---------|-------|-------|
| Összes eszköz | 100 kérés | 1 perc |
| generate_playbook | 20 kérés | 1 perc |
| run_playbook | 10 kérés | 1 perc |

### Sebességkorlátozás fejlécek

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1700000060
```

### Sebességkorlátozás túllépés válasz

```json
{
  "success": false,
  "error": "Sebességkorlátozás túllépve",
  "error_code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 100,
    "remaining": 0,
    "reset_at": "2025-11-18T10:31:00Z"
  }
}
```

---

## Metrikák

### Elérhető Prometheus metrikák

| Metrika | Típus | Leírás |
|---------|-------|--------|
| `ansible_playbooks_generated_total` | Counter | Összes generált playbook |
| `ansible_playbook_generation_seconds` | Histogram | Generálási idő |
| `ansible_playbook_executions_total` | Counter | Összes végrehajtás |
| `ansible_playbook_execution_seconds` | Histogram | Végrehajtási idő |
| `ansible_validation_total` | Counter | Összes validálás |
| `ansible_secrets_detected_total` | Counter | Titokkód-észlelési események |
| `ansible_rate_limit_exceeded_total` | Counter | Sebességkorlátozási események |

### Metrikák végpont

```
http://localhost:3000/metrics
```

---

**Következő**: [Konfiguráció](CONFIGURATION.md) | [Hibaelhárítás](TROUBLESHOOTING.md)
