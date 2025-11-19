# Ansible MCP Szerver - Dokumentáció

> **Verzió**: 2.0.0
> **MCP SDK**: 1.22.0
> **Utolsó frissítés**: 2025-11-18

## Áttekintés

Az Ansible MCP Szerver egy mesterséges intelligenciával támogatott infrastruktúra automatizálási megoldás, amely összekapcsolja a természetes nyelvfeldolgozást az Ansible playbook generálással és végrehajtással. A Model Context Protocol (MCP) protokollt implementálja, lehetővé téve az AI ügynökök számára, hogy produkciókész Ansible playbookokat hozzanak létre, validáljanak és futtassanak.

## Főbb funkciók

### AI-alapú generálás
- Természetes nyelv átalakítása Ansible playbookká
- Kontextus-tudatos prompt elemzés
- Több AI szolgáltató támogatása (OpenAI, Anthropic, Gemini, Ollama)
- Few-shot tanulás és gondolatlánc-következtetés

### Vállalati szintű megbízhatóság
- Beépített biztonsági funkciók (titokkód-észlelés, útvonal-bejárás megelőzés)
- Prometheus metrikák és Grafana dashboardok
- HashiCorp Vault integráció titkos adatok kezeléséhez
- Redis gyorsítótárazás a teljesítmény optimalizálásához

### Átfogó eszközkészlet
- 11 MCP eszköz a teljes automatizálási munkafolyamathoz
- Beépített playbook sablonok gyakori mintákhoz
- Automatikus YAML validálás és linting
- Verziókezelés GitLab integrációval

## Architektúra

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Ügynök/Claude                         │
│             (Természetes nyelvi interfész)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ MCP Protokoll
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Ansible MCP Szerver                        │
│                  (TypeScript - src/server.ts)                │
│  ┌──────────────┬──────────────┬──────────────────────┐    │
│  │ Eszköz Router│ Validátorok  │ Végrehajtás kezelő   │    │
│  └──────────────┴──────────────┴──────────────────────┘    │
└──────────────────────┬──────────────────────────────────────┘
                       │
      ┌────────────────┼────────────────┐
      ▼                ▼                ▼
┌──────────┐   ┌──────────────┐  ┌──────────────┐
│ Python   │   │   Redis      │  │   Vault      │
│ AI Gen   │   │   Cache      │  │   Titkok     │
└──────────┘   └──────────────┘  └──────────────┘
```

## Dokumentáció Index

| Dokumentum | Leírás |
|------------|--------|
| [Telepítési útmutató](DEPLOYMENT.md) | Telepítési és üzembe helyezési utasítások |
| [Használati esetek](USE_CASES.md) | Valós példák és forgatókönyvek |
| [API Referencia](API_REFERENCE.md) | Teljes MCP eszközök dokumentáció |
| [Konfiguráció](CONFIGURATION.md) | Környezeti változók és beállítások |
| [Hibaelhárítás](TROUBLESHOOTING.md) | Gyakori problémák és megoldások |

## Gyors kezdés

### Előfeltételek

- Docker és Docker Compose
- Node.js 18+ (helyi fejlesztéshez)
- Python 3.11+ (helyi fejlesztéshez)
- Ansible 2.15+

### Telepítés

```bash
# Klónozza a repository-t
git clone https://github.com/w7-mgfcode/Mannos-ANSIBLE_MCP-solution.git
cd Mannos-ANSIBLE_MCP-solution

# Indítsa el az összes szolgáltatást
docker compose up -d

# Ellenőrizze a szolgáltatások állapotát
docker compose ps
```

### Első Playbook

```bash
# Egyszerű playbook generálása
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Telepíts és konfigurálj nginx webszervert Ubuntu-n"
    }
  }'
```

## Technológiai stack

### Alapvető komponensek

| Komponens | Technológia | Verzió |
|-----------|-------------|--------|
| MCP Szerver | TypeScript | ES2022 |
| AI Generátor | Python | 3.11+ |
| Protokoll | MCP SDK | 1.22.0 |
| Automatizáció | Ansible | 2.15+ |
| Konténer | Docker | 24.0+ |

### Infrastruktúra szolgáltatások

| Szolgáltatás | Cél | Port |
|--------------|-----|------|
| Redis | Gyorsítótár és feladatsor | 6379 |
| HashiCorp Vault | Titkos adatok kezelése | 8200 |
| Prometheus | Metrikagyűjtés | 9090 |
| Grafana | Metrika vizualizáció | 3001 |
| GitLab | Verziókezelés | 8080 |
| AWX | Ansible UI | 8052 |

### AI szolgáltatók

| Szolgáltató | Modell támogatás | Konfiguráció |
|-------------|-----------------|--------------|
| OpenAI | GPT-4, GPT-4 Turbo | `OPENAI_API_KEY` |
| Anthropic | Claude 3 | `ANTHROPIC_API_KEY` |
| Google | Gemini Pro | `GEMINI_API_KEY` |
| Ollama | Helyi modellek | `OLLAMA_HOST` |

## Biztonsági funkciók

### Beépített védelmek

- **Útvonal-bejárás megelőzés**: Minden fájlútvonal validálása
- **Parancs-befecskendezés megelőzés**: Biztonságos execFile használata shell helyett
- **Titokkód-észlelés**: AWS kulcsok, jelszavak, tokenek, JWT keresése
- **Sebességkorlátozás**: Alapértelmezett 100 kérés/perc
- **Fájlméret validálás**: Maximum 1MB alapértelmezés
- **Biztonságos fájljogosultságok**: 0o600 érzékeny fájlokhoz

### Megfelelőség

- OWASP Top 10 védelem
- Nincs hardcoded hitelesítő adat
- Titkosított titokkezelés Vault-tal
- Audit naplózás engedélyezve

## Támogatás

### Segítség kérése

1. Nézze meg a [Hibaelhárítási útmutatót](TROUBLESHOOTING.md)
2. Tekintse át a meglévő dokumentációt
3. Nyisson egy issue-t a GitHub-on

### Közreműködés

Lásd a [CONTRIBUTING.md](../../CONTRIBUTING.md) fájlt a közreműködési irányelvekért.

## Licenc

Ez a projekt MIT licenc alatt áll. Részletekért lásd a [LICENSE](../../LICENSE) fájlt.

---

**Következő lépések**: [Telepítési útmutató](DEPLOYMENT.md) | [Használati esetek](USE_CASES.md) | [API Referencia](API_REFERENCE.md)
