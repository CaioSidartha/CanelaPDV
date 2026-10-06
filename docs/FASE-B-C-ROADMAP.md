# Fases B e C — sync e PDV offline

## Fase C (app Windows) — em andamento

**Objetivo:** o `.exe` abre o PDV **sem depender do Render** no dia a dia.

- `next build` com `output: "standalone"`.
- `npm run prepare:electron` copia `static` + `public` para o bundle.
- O instalador inclui o servidor em `resources/standalone`.
- No Electron empacotado, `electron/embedded-server.js` sobe `127.0.0.1` e a janela carrega `/login` local.
- Consulta de **nova versão do .exe** continua em `https://canelapdv.onrender.com/api/desktop/release`.
- Dados operacionais seguem no **workspace local** (Zustand / localStorage por tenant). SQLite é evolução futura.

**Gerar instalador:** `npm run release:win`

**Forçar URL remota (debug):** `PADARIA_APP_URL=https://canelapdv.onrender.com`

**Testar embedded sem empacotar:** após `build` + `prepare:electron`, `PADARIA_USE_EMBEDDED=1 npm run electron:dev`

## Fase B (nuvem) — início

**Objetivo:** tenants **online/híbridos** guardam backup/sync do workspace no Neon.

- Tabela `tenant_workspaces` (migration `drizzle/0002_tenant_workspaces.sql`).
- API `GET/PUT /api/tenant/workspace` (autenticado, scope tenant).
- Próximo passo: no app da loja, após login, `PUT` periódico do blob e `GET` na abertura para planos híbridos.

**Aplicar migration no Neon:** `npm run db:migrate`
