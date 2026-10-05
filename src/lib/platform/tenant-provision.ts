import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { tenants, tenantUsers } from "@/db/schema";
import { getDb } from "@/db/index";
import { hashPasswordServer } from "@/lib/password-server";
import { PLAN_PRESETS } from "@/types/platform";
import type { CommercialPlanId, PlatformTenantKind } from "@/types/platform";

export type ProvisionInput = {
  kind: PlatformTenantKind;
  name: string;
  document: string;
  planId: CommercialPlanId;
  monthlyFee?: number;
  adminEmail: string;
  adminPassword: string;
  adminName?: string;
};

export async function provisionTenantInDb(input: ProvisionInput) {
  const db = getDb();
  const doc = input.document.replace(/\D/g, "");
  const email = input.adminEmail.trim().toLowerCase();
  const plan =
    input.planId === "custom"
      ? { monthlyFee: input.monthlyFee ?? 500 }
      : PLAN_PRESETS[input.planId];

  const existing = await db
    .select({ id: tenantUsers.id })
    .from(tenantUsers)
    .where(sql`lower(${tenantUsers.email}) = ${email}`)
    .limit(1);
  if (existing.length) {
    throw new Error("Já existe um usuário de loja com este e-mail.");
  }

  const passwordHash = await hashPasswordServer(input.adminPassword);
  const status = input.kind === "test" ? "trial" : "active";

  const [tenant] = await db
    .insert(tenants)
    .values({
      kind: input.kind,
      status,
      name: input.name.trim(),
      document: doc,
      planId: input.planId,
      monthlyFee: String(plan.monthlyFee),
      adminEmail: email,
    })
    .returning();

  if (!tenant) throw new Error("Falha ao criar tenant.");

  await db.insert(tenantUsers).values({
    tenantId: tenant.id,
    email,
    name: input.adminName?.trim() || "Administrador",
    passwordHash,
    role: "admin",
  });

  return tenant;
}

export async function softDeleteTenant(id: string) {
  const db = getDb();
  await db.update(tenants).set({ deletedAt: new Date(), status: "churned" }).where(eq(tenants.id, id));
}

export async function listTenantsFromDb() {
  const db = getDb();
  return db.select().from(tenants).where(isNull(tenants.deletedAt)).orderBy(desc(tenants.createdAt));
}

export async function updateTenantAdminPassword(tenantId: string, email: string, newPassword: string) {
  const db = getDb();
  const hash = await hashPasswordServer(newPassword);
  await db
    .update(tenantUsers)
    .set({ passwordHash: hash })
    .where(
      and(eq(tenantUsers.tenantId, tenantId), sql`lower(${tenantUsers.email}) = ${email.toLowerCase()}`),
    );
}
