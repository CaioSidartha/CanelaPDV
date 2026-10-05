# Instalador Windows — passo a passo (equipe Canela)

Este guia explica **o que o instalador faz**, **onde ficam os dados** e **como publicar uma versão nova** para os clientes testarem download e atualização.

---

## 1. O instalador já vem com tudo?

**Quase.** O que o cliente instala hoje é o **Canela Store para Windows** (Electron):

| Vem no instalador | Não vem no instalador |
|-------------------|------------------------|
| App de janela (como um Chrome só da Canela) | **PostgreSQL / SQL Server** no PC |
| Atalho na área de trabalho | Servidor Next.js rodando local |
| Integração com balança, impressora e maquininha (via Electron) | Cópia completa do site de marketing |

O app **abre o painel da loja na internet**, apontando para o endereço da Canela no Render (padrão: `https://canelapdv.onrender.com/login`).

Ou seja: o cliente **precisa de internet** para entrar, autenticar e sincronizar login com o servidor. O que fica **no computador** são os dados operacionais da loja (produtos, vendas, estoque do dia a dia) guardados no **armazenamento local do app** (equivalente ao que o navegador guarda hoje).

**Resumo para explicar ao cliente:**  
“Não precisa instalar banco de dados. O banco da Canela fica na nuvem; no seu PC ficam os dados da operação para trabalhar offline no balcão quando o app permitir.”

---

## 2. Qual é o banco de dados?

| Onde | Tecnologia | Para quê |
|------|------------|----------|
| **Nuvem (servidor)** | **PostgreSQL** no **Neon** | Contas, login, leads, tenants — tudo que o Render usa |
| **PC do cliente (app ou navegador)** | Armazenamento local do navegador/Electron | PDV, estoque, comandas, caixa do **tenant** daquela loja |

O instalador **não** instala Postgres no Windows. Só a Canela mantém o Postgres na nuvem (variável `DATABASE_URL` no Render).

No futuro dá para evoluir para um SQLite embutido no desktop; **hoje** o modelo é: **nuvem = Postgres (Neon)** + **loja = dados locais no aparelho**.

---

## 3. Duas versões diferentes (importante)

| Nome | O que é | Quem define |
|------|---------|-------------|
| **Versão online** | Código do painel no Render | `version` no `package.json` → sobe no **git push + deploy** |
| **Versão do instalador** | Número do `.exe` que o cliente baixa | **Painel master** → Configurações → App Windows |

Elas **podem ser iguais ou diferentes**. Exemplo real de teste:

- Online **0.2.0** (você acabou de publicar no Render)
- Instalador **0.1.0** (cliente ainda com exe antigo) → o app mostra “atualização disponível”

---

## 4. Passo a passo — VOCÊ (equipe Canela)

### Passo A — Preparar o projeto na sua máquina

1. Abra o projeto `SistemaPadaria`.
2. Confira o Node 20 (`.node-version` / `engines` no `package.json`).
3. Instale dependências, se precisar:
   ```bash
   npm ci
   ```

### Passo B — Definir a versão do instalador

1. Abra `package.json`.
2. Altere o campo **`version`** (ex.: `"0.2.0"` → `"0.2.1"`).
   - Esse número vira a versão que o Electron reporta como **“App instalado vX”**.
   - A **versão online** no Render também usa esse valor após o deploy (via `NEXT_PUBLIC_APP_VERSION`).

**Dica:** para o teste de “online novo / app velho”, deixe o `package.json` em **0.2.0** no Render, gere um instalador com **0.1.0** (só para teste você pode temporariamente mudar, gerar o exe, e depois voltar o package.json).

### Passo C — Gerar o instalador Windows

No PowerShell, na pasta do projeto:

```bash
npm run build
npm run dist:win
```

- `npm run build` — gera o Next (necessário para empacotar arquivos do projeto).
- `npm run dist:win` — gera o instalador com **electron-builder**.

**Onde fica o arquivo:** pasta `dist-electron/` (procure algo como `Canela Store Setup X.Y.Z.exe` ou nome parecido com o `productName` no `electron-builder.yml`).

**Requisitos na máquina que gera o exe:** Windows, espaço em disco, e às vezes permissão de administrador na primeira vez do electron-builder.

### Passo D — Publicar o `.exe` em um link público

O painel da loja precisa de uma **URL direta** para download (HTTPS).

Opções comuns:

1. **GitHub Releases** (recomendado)
   - Repositório → **Releases** → **Draft a new release**
   - Tag: `desktop-v0.2.1` (exemplo)
   - Anexe o `.exe`
   - Publique e copie o **link direto** do arquivo (botão direito no asset → copiar link)

2. Google Drive / OneDrive — use link de download direto (menos ideal para produção).

Guarde esse link; você vai colar no painel master.

### Passo E — Deploy do painel online (Render)

1. Commit + push no `main` (se ainda não fez).
2. Aguarde o deploy no Render terminar.
3. Abra `https://canelapdv.onrender.com/api/desktop/release` no navegador — deve aparecer JSON com `webVersion` e `desktop`.

### Passo F — Cadastrar versão e link no painel master

1. Acesse **`/platform/login`** (`master@canela.local` / senha do seed).
2. Menu **Configurações**.
3. Bloco **App Windows (clientes)**:
   - **Versão do instalador:** ex. `0.2.1` (igual à do `package.json` **no momento em que você gerou aquele exe**).
   - **URL do .exe:** cole o link do GitHub Releases (ou outro).
   - **Notas da versão** (opcional): “Correção estoque, melhoria PDV…”
4. Clique **Publicar versão desktop**.

Isso grava no **Postgres (Neon)** e alimenta `/api/desktop/release`.

### Passo G — Testar como se fosse o cliente

**No navegador (loja):**

1. Login em `/login` com uma conta teste (modo híbrido / offline habilitado).
2. No topo à direita: **Painel online v…**, **App Windows v…**, **Baixar para Windows**.
3. Baixe e instale o `.exe`.

**No app instalado:**

1. Abra **Canela Store** pelo atalho.
2. Faça login na mesma loja.
3. No topo: **App instalado v…** e **Buscar atualizações**.
4. Se a versão publicada no master for **maior** que a instalada, o app avisa e abre o link do novo `.exe`.

---

## 5. Passo a passo — CLIENTE (loja)

1. Recebe o link do painel ou clica **Baixar para Windows** (logado na loja).
2. Executa o instalador → Next → instala → abre o app.
3. Entra com **e-mail e senha** que a Canela cadastrou (mesmo do `/login` no site).
4. Trabalha no PDV/estoque; dados ficam salvos neste computador.
5. Quando a Canela liberar versão nova: abre o app → **Buscar atualizações** → baixa e instala de novo por cima.

**Não precisa:** instalar Postgres, SQL Server, MySQL ou “configurar banco”.

**Precisa:** internet para login e para checar atualizações (e para o que ainda depende da API na nuvem).

---

## 6. Perguntas frequentes

**O instalador funciona sem internet?**  
Depois de logado, parte da operação usa dados locais; login, contas novas e API na nuvem ainda precisam de rede. O modo offline completo é evolução contínua.

**Mudança só no site (`/site`) afeta o app?**  
Não. Site e app da loja são rotas diferentes.

**Mudança no app (PDV, estoque) — cliente no exe antigo vê?**  
O **painel online** no exe carrega do Render — muita coisa atualiza sozinha ao recarregar. O **número da versão do instalador** só muda quando o cliente instala um **exe novo** (ou no futuro auto-update).

**Onde configuro a URL do Render no exe?**  
Variável de ambiente na build ou padrão em `electron/main.js`: `PADARIA_APP_URL` (padrão `https://canelapdv.onrender.com`).

---

## 7. Checklist rápido antes de vender/testar “como produção”

- [ ] Render com `DATABASE_URL` e `JWT_SECRET`
- [ ] Conta teste criada no master **com login no servidor** (não só local)
- [ ] `package.json` com versão desejada + deploy feito
- [ ] `npm run dist:win` gerou o `.exe`
- [ ] `.exe` hospedado com link HTTPS público
- [ ] Painel master: versão + URL publicadas
- [ ] Teste: navegador baixa → instala → login → buscar atualizações

---

## 8. Comandos úteis (cola)

```bash
# Desenvolver app desktop apontando para Next local
npm run dev
# Em outro terminal:
npm run desktop:dev

# Só Electron apontando para localhost (se Next já estiver no ar)
npm run electron:dev

# Instalador para cliente
npm run build
npm run dist:win
```

Documento relacionado: [DESKTOP-RELEASE.md](./DESKTOP-RELEASE.md) (visão técnica curta da API de versões).
