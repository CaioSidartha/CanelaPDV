import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/db/index";
import { setAuthCookies } from "@/lib/auth/cookies";
import { loginPlatform, loginTenant } from "@/lib/auth/login-service";
import { writeAudit } from "@/lib/audit";
import { clientIp, rateLimit } from "@/lib/rate-limit";

type Body = {
  email?: string;
  password?: string;
  scope?: "platform" | "tenant";
};

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Banco não configurado.", fallbackLocal: true },
      { status: 503 },
    );
  }

  const ip = clientIp(req);
  const limited = rateLimit(`auth:login:${ip}`, 20, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente mais tarde." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";
  const scope = body.scope ?? "tenant";

  if (!email || !password) {
    return NextResponse.json({ error: "E-mail e senha são obrigatórios." }, { status: 400 });
  }

  try {
    const result =
      scope === "platform"
        ? await loginPlatform(email, password)
        : await loginTenant(email, password);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    await setAuthCookies(result.accessToken, result.refreshPlain);
    await writeAudit({
      scope: result.profile.scope,
      actorId: result.profile.sub,
      tenantId: result.profile.tenantId,
      action: "auth.login",
      entity: "session",
      ip,
    });

    return NextResponse.json({
      ok: true,
      profile: {
        sub: result.profile.sub,
        email: result.profile.email,
        name: result.profile.name,
        scope: result.profile.scope,
        tenantId: result.profile.tenantId,
        role: result.profile.role,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao autenticar.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
