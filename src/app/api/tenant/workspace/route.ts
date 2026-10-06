import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { tenantWorkspaces } from "@/db/schema";
import { getDb, isDatabaseConfigured } from "@/db/index";
import { getSession } from "@/lib/auth/require-session";

/** Fase B — leitura do último snapshot da loja na nuvem (planos online/híbridos). */
export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Banco não configurado." }, { status: 503 });
  }
  const session = await getSession();
  if (!session || session.scope !== "tenant" || !session.tenantId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const db = getDb();
  const [row] = await db
    .select()
    .from(tenantWorkspaces)
    .where(eq(tenantWorkspaces.tenantId, session.tenantId))
    .limit(1);

  if (!row) {
    return NextResponse.json({ workspace: null, updatedAt: null });
  }

  return NextResponse.json({
    workspace: row.payload,
    updatedAt: row.updatedAt,
  });
}

/** Fase B — grava snapshot (produtos, vendas, etc.) enviado pelo app da loja. */
export async function PUT(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Banco não configurado." }, { status: 503 });
  }
  const session = await getSession();
  if (!session || session.scope !== "tenant" || !session.tenantId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: { workspace?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  if (!body.workspace || typeof body.workspace !== "object") {
    return NextResponse.json({ error: "Campo workspace é obrigatório." }, { status: 400 });
  }

  const db = getDb();
  const now = new Date();
  await db
    .insert(tenantWorkspaces)
    .values({
      tenantId: session.tenantId,
      payload: body.workspace as Record<string, unknown>,
      updatedAt: now,
      updatedBy: session.sub,
    })
    .onConflictDoUpdate({
      target: tenantWorkspaces.tenantId,
      set: {
        payload: body.workspace as Record<string, unknown>,
        updatedAt: now,
        updatedBy: session.sub,
      },
    });

  return NextResponse.json({ ok: true, updatedAt: now.toISOString() });
}
