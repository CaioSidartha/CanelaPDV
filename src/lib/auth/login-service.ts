import { and, eq, sql } from "drizzle-orm";
import { platformUsers, refreshTokens, tenantUsers, tenants } from "@/db/schema";
import { getDb } from "@/db/index";
import { verifyPasswordServer } from "@/lib/password-server";
import {
  hashRefreshToken,
  newRefreshTokenPlain,
  signAccessToken,
} from "@/lib/auth/tokens";
import type { AccessTokenPayload, SessionScope } from "@/lib/auth/constants";
import { REFRESH_TTL_SEC } from "@/lib/auth/constants";

export type LoginResult =
  | {
      ok: true;
      accessToken: string;
      refreshPlain: string;
      profile: AccessTokenPayload;
    }
  | { ok: false; error: string };

async function issueSession(
  scope: SessionScope,
  userId: string,
  profile: AccessTokenPayload,
  tenantId?: string,
): Promise<LoginResult> {
  const db = getDb();
  const refreshPlain = newRefreshTokenPlain();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_SEC * 1000);
  await db.insert(refreshTokens).values({
    scope,
    userId,
    tenantId: tenantId ?? null,
    tokenHash: hashRefreshToken(refreshPlain),
    expiresAt,
  });
  const accessToken = await signAccessToken(profile);
  return { ok: true, accessToken, refreshPlain, profile };
}

export async function loginPlatform(email: string, password: string): Promise<LoginResult> {
  const db = getDb();
  const normalized = email.trim().toLowerCase();
  const [user] = await db
    .select()
    .from(platformUsers)
    .where(sql`lower(${platformUsers.email}) = ${normalized}`)
    .limit(1);
  if (!user || !user.active) return { ok: false, error: "E-mail ou senha inválidos." };
  if (!(await verifyPasswordServer(password, user.passwordHash))) {
    return { ok: false, error: "E-mail ou senha inválidos." };
  }
  const profile: AccessTokenPayload = {
    sub: user.id,
    scope: "platform",
    email: user.email,
    name: user.name,
  };
  return issueSession("platform", user.id, profile);
}

export async function loginTenant(email: string, password: string): Promise<LoginResult> {
  const db = getDb();
  const normalized = email.trim().toLowerCase();
  const rows = await db
    .select({
      user: tenantUsers,
      tenant: tenants,
    })
    .from(tenantUsers)
    .innerJoin(tenants, eq(tenantUsers.tenantId, tenants.id))
    .where(
      and(
        sql`lower(${tenantUsers.email}) = ${normalized}`,
        eq(tenantUsers.active, true),
        sql`${tenants.deletedAt} is null`,
      ),
    )
    .limit(2);

  if (!rows.length) return { ok: false, error: "E-mail ou senha inválidos." };
  if (rows.length > 1) {
    return { ok: false, error: "Este e-mail está em mais de uma loja. Use o link exclusivo da sua conta." };
  }

  const { user, tenant } = rows[0]!;
  if (tenant.status === "suspended" || tenant.status === "churned") {
    return { ok: false, error: "Conta suspensa. Fale com o suporte." };
  }
  if (!(await verifyPasswordServer(password, user.passwordHash))) {
    return { ok: false, error: "E-mail ou senha inválidos." };
  }

  const profile: AccessTokenPayload = {
    sub: user.id,
    scope: "tenant",
    email: user.email,
    name: user.name,
    tenantId: tenant.id,
    role: user.role,
  };
  return issueSession("tenant", user.id, profile, tenant.id);
}
