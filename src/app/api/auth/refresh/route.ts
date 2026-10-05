import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { platformUsers, refreshTokens, tenantUsers } from "@/db/schema";
import { getDb, isDatabaseConfigured } from "@/db/index";
import { readRefreshToken, setAuthCookies } from "@/lib/auth/cookies";
import {
  hashRefreshToken,
  newRefreshTokenPlain,
  signAccessToken,
} from "@/lib/auth/tokens";
import type { AccessTokenPayload } from "@/lib/auth/constants";
import { REFRESH_TTL_SEC } from "@/lib/auth/constants";

export async function POST() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Banco não configurado." }, { status: 503 });
  }

  const plain = await readRefreshToken();
  if (!plain) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  const db = getDb();
  const hash = hashRefreshToken(plain);
  const [row] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, hash),
        isNull(refreshTokens.revokedAt),
      ),
    )
    .limit(1);

  if (!row || row.expiresAt < new Date()) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  let profile: AccessTokenPayload | null = null;

  if (row.scope === "platform") {
    const [user] = await db.select().from(platformUsers).where(eq(platformUsers.id, row.userId)).limit(1);
    if (user?.active) {
      profile = { sub: user.id, scope: "platform", email: user.email, name: user.name };
    }
  } else {
    const [user] = await db.select().from(tenantUsers).where(eq(tenantUsers.id, row.userId)).limit(1);
    if (user?.active) {
      profile = {
        sub: user.id,
        scope: "tenant",
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        role: user.role,
      };
    }
  }

  if (!profile) {
    return NextResponse.json({ error: "Usuário inválido." }, { status: 401 });
  }

  await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, row.id));

  const refreshPlain = newRefreshTokenPlain();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_SEC * 1000);
  await db.insert(refreshTokens).values({
    scope: row.scope,
    userId: row.userId,
    tenantId: row.tenantId,
    tokenHash: hashRefreshToken(refreshPlain),
    expiresAt,
  });

  const accessToken = await signAccessToken(profile);
  await setAuthCookies(accessToken, refreshPlain);

  return NextResponse.json({ ok: true });
}
