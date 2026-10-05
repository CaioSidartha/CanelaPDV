import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { tenants } from "@/db/schema";
import { getDb, isDatabaseConfigured } from "@/db/index";
import { requirePlatformSession } from "@/lib/auth/require-session";
import { softDeleteTenant, updateTenantAdminPassword } from "@/lib/platform/tenant-provision";
import { writeAudit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, ctx: Ctx) {
  const auth = await requirePlatformSession();
  if ("response" in auth) return auth.response;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Banco não configurado." }, { status: 503 });
  }

  const { id } = await ctx.params;
  await softDeleteTenant(id);

  await writeAudit({
    scope: "platform",
    actorId: auth.session.sub,
    action: "tenant.deleted",
    entity: "tenants",
    payload: { tenantId: id },
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requirePlatformSession();
  if ("response" in auth) return auth.response;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Banco não configurado." }, { status: 503 });
  }

  const { id } = await ctx.params;
  let body: { name?: string; monthlyFee?: number; planId?: string; adminPassword?: string; adminEmail?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const db = getDb();
  const patch: Partial<{ name: string; monthlyFee: string; planId: string; adminEmail: string }> = {};
  if (body.name?.trim()) patch.name = body.name.trim();
  if (body.planId) patch.planId = body.planId;
  if (body.monthlyFee != null) patch.monthlyFee = String(body.monthlyFee);
  if (body.adminEmail?.trim()) patch.adminEmail = body.adminEmail.trim().toLowerCase();

  if (Object.keys(patch).length) {
    await db.update(tenants).set(patch).where(eq(tenants.id, id));
  }

  if (body.adminPassword && body.adminPassword.length >= 6) {
    const [row] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    if (row) {
      await updateTenantAdminPassword(id, row.adminEmail, body.adminPassword);
    }
  }

  return NextResponse.json({ ok: true });
}
