# Coda MCP Server

Serveur MCP pour l'API Coda avec support **stdio** (Claude Desktop) et **HTTP/SSE** (LangSmith Agent Builder).

## Installation Rapide

```bash
# 1. Installer les dépendances
pnpm install

# 2. Build le projet
pnpm build

# 3. Configurer votre clé API
echo "API_KEY=votre-cle-coda-ici" > .env
```

🔑 Obtenez votre clé API: https://coda.io/account

## Usage Local

### Option 1: LangSmith Agent Builder (HTTP/SSE)

```bash
# Démarrer le serveur HTTP
pnpm start:http
```

Configuration LangSmith:
```json
{
  "mcp_servers": {
    "coda": {
      "url": "http://localhost:3000/sse",
      "transport": "sse"
    }
  }
}
```

### Option 2: Claude Desktop (Stdio)

Configuration dans `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "coda": {
      "command": "node",
      "args": ["/Users/samuelaudette/Documents/agents/mcp_coda/dist/index.js"],
      "env": {
        "API_KEY": "votre-cle-coda"
      }
    }
  }
}
```

## Tests Locaux

### 1. Démarrer le serveur

```bash
API_KEY=votre-cle pnpm start:http
```

Vous devriez voir:
```
═══════════════════════════════════════════════════════════
✓ Coda MCP HTTP Server running on port 3000
═══════════════════════════════════════════════════════════
  Transport:     Streamable HTTP + SSE (legacy)
  MCP endpoint:  http://localhost:3000/mcp
  SSE endpoint:  http://localhost:3000/sse
  Health check:  http://localhost:3000/health
```

### 2. Tester les endpoints (dans un autre terminal)

```bash
# Test de santé
curl http://localhost:3000/health
# Réponse: {"status":"ok","transport":"http",...}

# Informations serveur
curl http://localhost:3000/
# Réponse: Détails du serveur et liste des endpoints

# Test SSE (garde cette connexion ouverte)
curl -N http://localhost:3000/sse

# Test endpoint MCP (Streamable HTTP, recommandé)
curl -i http://localhost:3000/mcp
```

### 3. Tester un outil Coda

Dans un 3ème terminal (pendant que SSE est connecté):

```bash
# Test whoami
curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "coda_whoami",
      "arguments": {}
    }
  }'

# Lister vos documents Coda
curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "coda_list_docs",
      "arguments": {}
    }
  }'

# Trouver rapidement une table (recherche intelligente)
curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "coda_list_tables",
      "arguments": {
        "contextUrl": "https://coda.io/d/_d167_R7sE_h/Insights-RH_suBt3VMg#Insights-cartographie-Macro-Processus-RH_tuSjQJvw",
        "query": "macro processus rh",
        "limit": 5
      }
    }
  }'
```

## Déploiement Railway

```bash
# 1. Installer Railway CLI
npm install -g @railway/cli

# 2. Login et initialiser
railway login
railway init

# 3. Configurer la clé API
railway variables set API_KEY=votre-cle-coda

# 4. Déployer
railway up
```

Railway vous donnera une URL comme `https://coda-mcp-production.up.railway.app`

**Configuration LangSmith (Production):**
```json
{
  "mcp_servers": {
    "coda": {
      "url": "https://coda-mcp-production.up.railway.app/mcp",
      "transport": "sse"
    }
  }
}
```

## Outils Disponibles (15 outils)

| Catégorie | Outils | Description |
|-----------|--------|-------------|
| **Auth** | `coda_whoami` | Info utilisateur authentifié |
| **Documents** | `coda_list_docs`<br>`coda_get_doc`<br>`coda_create_doc`<br>`coda_delete_doc` | Gérer les documents |
| **Pages** | `coda_list_pages` | Lister les pages d'un doc |
| **Tables** | `coda_list_tables`<br>`coda_get_table`<br>`coda_list_columns` | Explorer les tables |
| **Rows** | `coda_list_rows`<br>`coda_create_row`<br>`coda_update_row` | CRUD sur les lignes |
| **Formulas** | `coda_list_formulas` | Lister les formules |
| **Controls** | `coda_list_controls`<br>`coda_push_button` | Interagir avec contrôles |

## Architecture

```
┌─────────────────────────────────────┐
│   LangSmith Agent Builder           │
│   (ou Claude Desktop)               │
└──────────────┬──────────────────────┘
               │ HTTP/SSE ou Stdio
               ▼
┌─────────────────────────────────────┐
│   Coda MCP Server                   │
│   - Express (HTTP mode)             │
│   - Stdio (Claude Desktop mode)     │
│   - 15 outils Coda                  │
└──────────────┬──────────────────────┘
               │ HTTPS REST API
               ▼
┌─────────────────────────────────────┐
│   Coda API (api.coda.io)            │
└─────────────────────────────────────┘
```

## Troubleshooting

### ❌ "API_KEY environment variable is required"
**Solution:** Créez le fichier `.env` avec votre clé:
```bash
echo "API_KEY=votre-cle" > .env
```

### ❌ "Connection refused" sur localhost:3000
**Solution:**
1. Vérifiez que le serveur est démarré: `pnpm start:http`
2. Testez: `curl http://localhost:3000/health`
3. Vérifiez qu'aucun autre processus n'utilise le port 3000

### ❌ Outils invisibles dans LangSmith
**Solution:** Vérifiez l'URL:
- ✅ Correct (Agent Builder): `http://localhost:3000/mcp`
- ✅ Compatible legacy: `http://localhost:3000/sse`
- ❌ Incorrect: `http://localhost:3000/message`

### ❌ Erreurs TypeScript au build
**Solution:**
```bash
rm -rf node_modules dist
pnpm install
pnpm build
```

## Variables d'Environnement

| Variable | Description | Requis | Défaut |
|----------|-------------|--------|--------|
| `API_KEY` ou `CODA_API_KEY` | Clé API Coda | ✅ Oui | - |
| `PORT` | Port serveur HTTP | Non | `3000` |

## Développement

```bash
# Mode développement avec auto-reload
pnpm dev:http    # Serveur HTTP
pnpm dev:stdio   # Serveur stdio

# Autres commandes
pnpm lint        # Lint le code
pnpm format      # Formater le code
```

## Prochaines Étapes

1. ✅ Build et test local (vous êtes ici)
2. 🔄 Tester dans LangSmith Agent Builder
3. 🚀 Déployer sur Railway
4. 🎯 Créer vos premiers agents Coda

## Support

- 📖 [Coda API Docs](https://coda.io/developers/apis/v1)
- 🔧 [MCP Documentation](https://modelcontextprotocol.io/)
- 🙏 Basé sur [dustinrgood/coda-mcp](https://github.com/dustinrgood/coda-mcp) (projet d'origine)

## License

MIT
