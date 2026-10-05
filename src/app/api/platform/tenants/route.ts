import { NextResponse } from "next/server";
import { requirePlatformSession } from "@/lib/auth/require-session";
import { isDatabaseConfigured } from "@/db/index";
import { listTenantsFromDb, provisionTenantInDb } from "@/lib/platform/tenant-provision";
import { writeAudit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";
import type { CommercialPlanId, PlatformTenantKind } from "@/types/platform";
import { defaultCapabilities } from "@/lib/tenant-snapshot";

export async function GET() {
  const auth = await requirePlatformSession();
  if ("response" in auth) return auth.response;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ tenants: [], mode: "local" });
  }

  const rows = await listTenantsFromDb();
  return NextResponse.json({
    tenants: rows.map((t) => ({
      id: t.id,
      kind: t.kind,
      status: t.status,
      name: t.name,
      document: t.document,
      planId: t.planId,
      monthlyFee: Number(t.monthlyFee),
      adminEmail: t.adminEmail,
      createdAt: t.createdAt.toISOString(),
      capabilities: defaultCapabilities(),
      branding: {},
      setupFee: 0,
    })),
  });
}

type Body = {
  kind?: PlatformTenantKind;
  name?: string;
  document?: string;
  planId?: CommercialPlanId;
  monthlyFee?: number;
  adminEmail?: string;
  adminPassword?: string;
  adminName?: string;
};

export async function POST(req: Request) {
  const auth = await requirePlatformSession();
  if ("response" in auth) return auth.response;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Banco não configurado." }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const document = body.document ?? "";
  const adminEmail = body.adminEmail?.trim() ?? "";
  const adminPassword = body.adminPassword ?? "";
  const kind = body.kind ?? "test";
  const planId = body.planId ?? "essencial";

  if (!name || !document || !adminEmail || !adminPassword) {
    return NextResponse.json(
      { error: "Nome, documento, e-mail e senha do admin são obrigatórios." },
      { status: 400 },
    );
  }
  if (adminPassword.length < 6) {
    return NextResponse.json({ error: "Senha mínima: 6 caracteres." }, { status: 400 });
  }

  try {
    const tenant = await provisionTenantInDb({
      kind,
      name,
      document,
      planId,
      monthlyFee: body.monthlyFee,
      adminEmail,
      adminPassword,
      adminName: body.adminName,
    });

    await writeAudit({
      scope: "platform",
      actorId: auth.session.sub,
      action: "tenant.created",
      entity: "tenants",
      payload: { tenantId: tenant.id, adminEmail },
      ip: clientIp(req),
    });

    return NextResponse.json({
      ok: true,
      tenant: {
        id: tenant.id,
        kind: tenant.kind,
        status: tenant.status,
        name: tenant.name,
        document: tenant.document,
        planId: tenant.planId,
        monthlyFee: Number(tenant.monthlyFee),
        adminEmail: tenant.adminEmail,
        createdAt: tenant.createdAt.toISOString(),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar conta.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
