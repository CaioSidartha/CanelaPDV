/**
 * Hash de senha no cliente (scaffold até existir API local).
 * Produção: bcrypt/argon2 no servidor — nunca confiar só nisto.
 */

export async function hashPassword(plain: string): Promise<string> {
  const data = new TextEncoder().encode(`padaria.v1:${plain}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  const next = await hashPassword(plain);
  return next === hash;
}
