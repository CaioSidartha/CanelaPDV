import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Defina DATABASE_URL.");
  process.exit(1);
}

const sql = neon(url);

const masterEmail = (process.env.PLATFORM_SEED_EMAIL ?? "master@canela.local").toLowerCase();
const masterPassword = process.env.PLATFORM_SEED_PASSWORD ?? "master123";
const masterName = process.env.PLATFORM_SEED_NAME ?? "Master Canela";

const tenantAdminEmail = (process.env.TENANT_SEED_EMAIL ?? "admin@loja.local").toLowerCase();
const tenantAdminPassword = process.env.TENANT_SEED_PASSWORD ?? "admin123";

const hash = await bcrypt.hash(masterPassword, 12);
const tenantHash = await bcrypt.hash(tenantAdminPassword, 12);

await sql`
  INSERT INTO platform_users (email, name, password_hash)
  VALUES (${masterEmail}, ${masterName}, ${hash})
  ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    active = true
`;

const tenants = await sql`
  INSERT INTO tenants (id, kind, status, name, document, plan_id, monthly_fee, admin_email)
  VALUES (
    '00000000-0000-4000-8000-000000000001',
    'test',
    'active',
    'Canela Store (demo)',
    '00000000000',
    'completo',
    650,
    ${tenantAdminEmail}
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id
`;

let tenantId = tenants[0]?.id;
if (!tenantId) {
  const existing = await sql`SELECT id FROM tenants WHERE admin_email = ${tenantAdminEmail} LIMIT 1`;
  tenantId = existing[0]?.id;
}

if (tenantId) {
  await sql`
    INSERT INTO tenant_users (tenant_id, email, name, password_hash, role)
    VALUES (${tenantId}, ${tenantAdminEmail}, 'Administrador', ${tenantHash}, 'admin')
    ON CONFLICT DO NOTHING
  `;
}

await sql`
  INSERT INTO platform_settings (key, value)
  VALUES ('lead_notify', ${JSON.stringify({ leadNotifyEmail: process.env.LEAD_NOTIFY_EMAIL ?? "" })}::jsonb)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
`;

console.log("Seed OK.");
console.log(`  Platform: ${masterEmail} / (senha do PLATFORM_SEED_PASSWORD ou master123)`);
console.log(`  Loja demo: ${tenantAdminEmail} / (senha do TENANT_SEED_PASSWORD ou admin123)`);
