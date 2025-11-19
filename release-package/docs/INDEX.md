# Ansible MCP Server - Documentation / Dokumentáció

> **Version / Verzió**: 2.0.0
> **Last Updated / Utolsó frissítés**: 2025-11-18

---

## Language Selection / Nyelvválasztás

### English Documentation

Complete documentation for the Ansible MCP Server in English.

| Document | Description |
|----------|-------------|
| [README](en/README.md) | Overview and quick start guide |
| [Deployment](en/DEPLOYMENT.md) | Installation and deployment instructions |
| [Use Cases](en/USE_CASES.md) | Real-world examples and scenarios |
| [API Reference](en/API_REFERENCE.md) | Complete MCP tools documentation |
| [Configuration](en/CONFIGURATION.md) | Environment variables and settings |
| [Troubleshooting](en/TROUBLESHOOTING.md) | Common issues and solutions |

---

### Magyar Dokumentáció

Az Ansible MCP Szerver teljes dokumentációja magyar nyelven.

| Dokumentum | Leírás |
|------------|--------|
| [README](hu/README.md) | Áttekintés és gyors kezdés |
| [Telepítés](hu/DEPLOYMENT.md) | Telepítési és üzembe helyezési utasítások |
| [Használati esetek](hu/USE_CASES.md) | Valós példák és forgatókönyvek |
| [API Referencia](hu/API_REFERENCE.md) | Teljes MCP eszközök dokumentáció |
| [Konfiguráció](hu/CONFIGURATION.md) | Környezeti változók és beállítások |
| [Hibaelhárítás](hu/TROUBLESHOOTING.md) | Gyakori problémák és megoldások |

---

## Quick Reference / Gyors referencia

### Start Services / Szolgáltatások indítása

```bash
docker compose up -d
```

### Generate Playbook / Playbook generálása

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

### Service URLs / Szolgáltatás URL-ek

| Service | URL | Credentials |
|---------|-----|-------------|
| MCP Server | http://localhost:3000 | - |
| Grafana | http://localhost:3001 | admin / ansible-mcp |
| Prometheus | http://localhost:9090 | - |
| GitLab | http://localhost:8080 | root / ansible-mcp-2024 |
| Vault | http://localhost:8200 | Token: myroot |
| AWX | http://localhost:8052 | - |

---

## About This Documentation / A dokumentációról

This documentation provides comprehensive guides for deploying, configuring, and using the Ansible MCP Server. Both English and Hungarian versions contain the same information and are maintained in parallel.

Ez a dokumentáció átfogó útmutatókat tartalmaz az Ansible MCP Szerver telepítéséhez, konfigurálásához és használatához. Az angol és magyar verziók ugyanazt az információt tartalmazzák és párhuzamosan kerülnek karbantartásra.

---

## Contributing / Közreműködés

To contribute to this documentation, please see [CONTRIBUTING.md](../CONTRIBUTING.md).

A dokumentációhoz való hozzájáruláshoz kérjük, tekintse meg a [CONTRIBUTING.md](../CONTRIBUTING.md) fájlt.

---

## License / Licenc

This project is licensed under the MIT License. See [LICENSE](../LICENSE) for details.

Ez a projekt MIT licenc alatt áll. Részletekért lásd a [LICENSE](../LICENSE) fájlt.
