# Fases B e C — sync e PDV offline

## Rede local — Servidor vs Terminal

- Instalador NSIS pergunta: **Servidor** ou **Terminal** (grava `%APPDATA%\Canela\install-role.txt`).
- **Servidor:** Next embutido em `0.0.0.0:3847`; Configurações → **Terminais** mostra endereço mascarado (olho + copiar).
- **Terminal:** conecta ao servidor, teste via `/api/health`, pareamento opcional por código.
- Operador / terminal: abas Configurações = Terminais, Hardwares, Preços no peso.

## Fase C (app Windows) — em andamento

**Objetivo:** o `.exe` abre o PDV **sem depender do Render** no dia a dia.

- `next build` com `output: "standalone"`.
- `npm run prepare:electron` copia `static` + `public` para o bundle.
- O instalador inclui o servidor em `resources/standalone`.
- No Electron empacotado, `electron/embedded-server.js` sobe `127.0.0.1` e a janela carrega `/login` local.
- Consulta de **nova versão do .exe** continua em `https://canelapdv.onrender.com/api/desktop/release`.
- **PDV na LAN (SQLite):** `canela-store.db` no servidor — comandas, categorias, produtos, vendas, turno/caixa e movimentos de estoque via `GET/PUT /api/store/bundle` (~1,5s). Carrinho de balcão continua local até finalizar (a venda vai para o bundle).

**Gerar instalador:** `npm run release:win`

**Forçar URL remota (debug):** `PADARIA_APP_URL=https://canelapdv.onrender.com`

**Testar embedded sem empacotar:** após `build` + `prepare:electron`, `PADARIA_USE_EMBEDDED=1 npm run electron:dev`

## Fase B (nuvem) — início

**Objetivo:** tenants **online/híbridos** guardam backup/sync do workspace no Neon.

- Tabela `tenant_workspaces` (migration `drizzle/0002_tenant_workspaces.sql`).
- API `GET/PUT /api/tenant/workspace` (autenticado, scope tenant).
- Próximo passo: no app da loja, após login, `PUT` periódico do blob e `GET` na abertura para planos híbridos.

**Aplicar migration no Neon:** `npm run db:migrate`
