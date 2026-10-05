import { createHash, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import type { AccessTokenPayload, SessionScope } from "@/lib/auth/constants";
import { ACCESS_TTL_SEC } from "@/lib/auth/constants";

function secret(): Uint8Array {
  const raw = process.env.JWT_SECRET?.trim();
  if (!raw || raw.length < 32) {
    throw new Error("JWT_SECRET ausente ou curto (mín. 32 caracteres).");
  }
  return new TextEncoder().encode(raw);
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .sign(secret());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    const sub = payload.sub;
    if (!sub || typeof sub !== "string") return null;
    const scope = payload.scope as SessionScope;
    if (scope !== "platform" && scope !== "tenant") return null;
    return {
      sub,
      scope,
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      tenantId: payload.tenantId ? String(payload.tenantId) : undefined,
      role: payload.role ? String(payload.role) : undefined,
    };
  } catch {
    return null;
  }
}

export function newRefreshTokenPlain(): string {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}
