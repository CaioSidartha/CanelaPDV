# App Windows — versões e atualização

**Guia completo para humanos:** [INSTALADOR-WINDOWS-PASSO-A-PASSO.md](./INSTALADOR-WINDOWS-PASSO-A-PASSO.md) (banco de dados, o que o exe traz, publicar versão, testar com cliente).

## Fluxo

1. **Deploy no Render** atualiza o painel web (`NEXT_PUBLIC_APP_VERSION` = `package.json`).
2. **Painel master** → Configurações → publica versão do instalador + URL do `.exe`.
3. **Loja (navegador)** — barra superior: versão online + **Baixar para Windows**.
4. **App instalado** — mesma barra: versão instalada + **Buscar atualizações** (compara com `/api/desktop/release`).

## Gerar instalador

```bash
npm run build
npm run dist:win
```

Artefatos em `dist-electron/`. Suba o `.exe` (GitHub Releases) e cole o link no painel master.

## Variáveis (opcional no Render)

- `DESKTOP_WINDOWS_URL` — fallback se não houver valor no banco
- `DESKTOP_APP_VERSION` — fallback da versão desktop
- `PADARIA_APP_URL` — URL do Electron em produção (padrão: canelapdv.onrender.com)
