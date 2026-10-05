import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { tenants } from "@/db/schema";
import { getDb, isDatabaseConfigured } from "@/db/index";
import { getSession } from "@/lib/auth/require-session";

/** Dados mínimos para montar o workspace da loja após login na API. */
export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Banco não configurado." }, { status: 503 });
  }

  const session = await getSession();
  if (!session || session.scope !== "tenant" || !session.tenantId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const db = getDb();
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, session.tenantId)).limit(1);
  if (!tenant || tenant.deletedAt) {
    return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
  }

  return NextResponse.json({
    tenantId: tenant.id,
    name: tenant.name,
    document: tenant.document,
    planId: tenant.planId,
    monthlyFee: Number(tenant.monthlyFee),
    kind: tenant.kind,
    email: session.email,
    userName: session.name,
    role: session.role ?? "admin",
  });
}
