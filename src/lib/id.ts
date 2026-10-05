/**
 * IDs estáveis para multi-PC / sync futuro.
 * Preferir UUID (crypto.randomUUID) em vez de Date.now + Math.random.
 */

export function newUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback raro (ambientes sem Web Crypto)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Prefixo opcional só para leitura humana em logs (o id canônico continua UUID). */
export function newEntityId(_prefix?: string): string {
  return newUuid();
}
