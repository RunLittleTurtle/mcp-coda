# Coda MCP Server (Fork)

Serveur MCP Coda avec:
- transport **Streamable HTTP** (`/mcp`) pour LangSmith Agent Builder
- transport **SSE legacy** (`/sse`)
- transport **stdio** (`dist/index.js`) pour clients desktop

## Pourquoi 15 outils ici (vs fork d'origine plus large)

Ce fork expose **15 outils “core”** (documents, pages, tables, rows, formulas, controls, auth), volontairement plus compact pour rester stable côté Agent Builder.

Le repo amont `dustinrgood/coda-mcp` annonce actuellement **34 tools** dans son README (ligne “Total: 34 tools available”).  
Ici, le scope est réduit et orienté usage opérationnel.

## Outils disponibles (15)

- Auth: `coda_whoami`
- Documents: `coda_list_docs`, `coda_get_doc`, `coda_create_doc`, `coda_delete_doc`
- Pages: `coda_list_pages`
- Tables: `coda_list_tables`, `coda_get_table`, `coda_list_columns`
- Rows: `coda_list_rows`, `coda_create_row`, `coda_update_row`
- Formulas: `coda_list_formulas`
- Controls: `coda_list_controls`, `coda_push_button`

## Installation

```bash
pnpm install
pnpm build
echo "API_KEY=votre-cle-coda" > .env
```

## Lancer en local

```bash
PORT=3023 pnpm start:http
```

Endpoints:
- `GET /health`
- `GET|POST|DELETE /mcp` (recommandé)
- `GET /sse` + `POST /message` (legacy)

## Agent Builder (LangSmith)

Dans “Add MCP server”:
- Name: `coda-mcp`
- URL: `http://localhost:3023/mcp`
- Auth: `Static Headers`
- Headers: vide

Si “Failed to load tools” apparaît:
- vérifier que l’URL finit par `/mcp`
- vérifier qu’Agent Builder peut atteindre `localhost`
- si besoin, exposer en HTTPS public (Koyeb / tunnel)

## Déploiement Koyeb (GitHub)

Réglages service web:
- Build command: `pnpm install && pnpm build`
- Start command: `pnpm start:http`
- Environment variable: `API_KEY=<votre-cle>`
- Health check path: `/health`

Puis dans Agent Builder:
- URL: `https://<votre-app>.koyeb.app/mcp`

## Développement

```bash
pnpm dev:http
pnpm dev:stdio
pnpm build
```

## Variables d'environnement

- `API_KEY` ou `CODA_API_KEY` (requis)
- `PORT` (optionnel, défaut `3000`)

## Crédits

- Projet d'origine: [dustinrgood/coda-mcp](https://github.com/dustinrgood/coda-mcp)
- Fork initial du projet d'origine: [orellazri/coda-mcp](https://github.com/orellazri/coda-mcp)

## License

MIT
