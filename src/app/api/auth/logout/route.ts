import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { refreshTokens } from "@/db/schema";
import { getDb, isDatabaseConfigured } from "@/db/index";
import { clearAuthCookies, readRefreshToken } from "@/lib/auth/cookies";
import { hashRefreshToken } from "@/lib/auth/tokens";
import { getSession } from "@/lib/auth/require-session";
import { writeAudit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const session = await getSession();
  const ip = clientIp(req);

  if (isDatabaseConfigured()) {
    const refresh = await readRefreshToken();
    if (refresh) {
      try {
        const db = getDb();
        await db
          .update(refreshTokens)
          .set({ revokedAt: new Date() })
          .where(eq(refreshTokens.tokenHash, hashRefreshToken(refresh)));
      } catch {
        /* ignore */
      }
    }
  }

  if (session) {
    await writeAudit({
      scope: session.scope,
      actorId: session.sub,
      tenantId: session.tenantId,
      action: "auth.logout",
      entity: "session",
      ip,
    });
  }

  await clearAuthCookies();
  return NextResponse.json({ ok: true });
}
