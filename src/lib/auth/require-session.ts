import { NextResponse } from "next/server";
import { readAccessToken } from "@/lib/auth/cookies";
import { verifyAccessToken } from "@/lib/auth/tokens";
import type { AccessTokenPayload } from "@/lib/auth/constants";
import { isDatabaseConfigured } from "@/db/index";

export async function getSession(): Promise<AccessTokenPayload | null> {
  if (!isDatabaseConfigured()) return null;
  const token = await readAccessToken();
  if (!token) return null;
  return verifyAccessToken(token);
}

export async function requirePlatformSession(): Promise<
  { session: AccessTokenPayload } | { response: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { response: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  }
  if (session.scope !== "platform") {
    return { response: NextResponse.json({ error: "Acesso restrito à plataforma." }, { status: 403 }) };
  }
  return { session };
}
