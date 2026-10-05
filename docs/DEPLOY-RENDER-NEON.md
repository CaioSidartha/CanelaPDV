# Deploy CANELA — Render + Neon

## 1. Neon

1. Crie um projeto em [neon.tech](https://neon.tech).
2. Copie a **connection string pooled** (`?sslmode=require`).
3. No terminal (com `.env` local ou variáveis exportadas):

```bash
DATABASE_URL="sua-url" npm run db:migrate
DATABASE_URL="sua-url" npm run db:seed
```

## 2. Render (Web Service)

- **Repositório:** `https://github.com/CaioSidartha/CanelaPDV.git`
- **Build:** `npm ci --include=dev && npm run build`  
  (obrigatório se `NODE_ENV=production` nas env vars — senão o Render não instala TypeScript/Tailwind e o build quebra)
- **Start:** `npm start`
- **Health check path:** `/api/health`

### Variáveis de ambiente (mínimo)

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Neon pooled |
| `JWT_SECRET` | ≥ 32 caracteres |
| `NODE_ENV` | `production` |
| `RESEND_API_KEY` ou `SMTP_*` | E-mail de leads (opcional) |
| `LEAD_EMAIL_FROM` | Remetente |
| `FISCAL_*` | Conforme `.env.example` |

Após o primeiro deploy, rode migrate/seed **uma vez** contra o mesmo `DATABASE_URL` (local ou job Render).

## 3. Login com banco

- **Master:** `POST /api/auth/login` com `{ "scope": "platform", "email", "password" }` — cookies httpOnly.
- Painel `/platform/login` tenta a API primeiro; sem `DATABASE_URL` continua o modo local.
- **Loja (API):** `{ "scope": "tenant", ... }` — Sprint 2 ligará o `/login` da loja; seed já cria `admin@loja.local`.

## 4. O que já está no Sprint 1

- Schema + migrations SQL + RLS (`drizzle/0001_rls.sql`)
- `/api/health`
- Auth: login, logout, refresh, me
- Leads no Postgres + rate limit
- Config de e-mail de leads protegida (com DB)
- `audit_log` em login e leads

## 5. Próximo (Sprint 2)

- Produtos, vendas, estoque no Neon
- `/login` da loja via API + sync gradual do Zustand
