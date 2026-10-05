import type { Product, ProductBatch } from "@/types";

/** Dias até a validade para considerar “próximo a vencer” (alerta na lista de estoque). */
export const NEAR_EXPIRY_DAYS = 30;

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

/** Diferença em dias entre hoje e a data (fim do dia da validade). */
export function daysUntilExpiry(iso: string): number | null {
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return null;
  const today = startOfDay(new Date());
  const d0 = startOfDay(end);
  return Math.round((d0 - today) / 86400000);
}

export function expiryToneFromDiffDays(diffDays: number | null): {
  label: string;
  className: string;
} {
  if (diffDays == null) {
    return { label: "sem validade", className: "bg-zinc-800/80 text-zinc-300" };
  }
  if (diffDays < 0) {
    return { label: "vencido", className: "bg-red-100 text-red-800" };
  }
  if (diffDays <= NEAR_EXPIRY_DAYS) {
    return {
      label: `≤ ${NEAR_EXPIRY_DAYS}d (${diffDays}d)`,
      className: "bg-amber-100 text-amber-900",
    };
  }
  return { label: "no prazo", className: "bg-emerald-500/15 text-emerald-300" };
}

/** Pior validade entre remessas com quantidade > 0 (para coluna na grade de estoque). */
export function productValiditySummary(product: Product): {
  label: string;
  className: string;
} {
  if (product.trackStock === false) {
    return { label: "—", className: "text-zinc-500" };
  }
  const batches = product.batches ?? [];
  if (!batches.length) {
    return { label: "sem lote", className: "text-xs text-zinc-500" };
  }
  let best: number | null = null;
  for (const b of batches) {
    if ((b.qty ?? 0) <= 0 || !b.expiresAt) continue;
    const d = daysUntilExpiry(b.expiresAt);
    if (d == null) continue;
    if (best == null || d < best) best = d;
  }
  if (best == null) {
    return { label: "sem validade", className: "bg-zinc-800/70 text-zinc-400" };
  }
  const tone = expiryToneFromDiffDays(best);
  if (best >= 0 && best <= NEAR_EXPIRY_DAYS) {
    return { label: `Próximo (${best}d)`, className: tone.className };
  }
  if (best < 0) {
    return { label: "Há lote vencido", className: tone.className };
  }
  return { label: "No prazo", className: tone.className };
}

/** Menor diff de validade (dias) entre remessas com qty > 0; null se não houver. */
export function productNearestExpiryDays(product: Product): number | null {
  if (product.trackStock === false) return null;
  const batches = product.batches ?? [];
  let best: number | null = null;
  for (const b of batches) {
    if ((b.qty ?? 0) <= 0 || !b.expiresAt) continue;
    const d = daysUntilExpiry(b.expiresAt);
    if (d == null) continue;
    if (best == null || d < best) best = d;
  }
  return best;
}

/** True se houver remessa com validade em até NEAR_EXPIRY_DAYS (e qty > 0). */
export function productIsNearExpiry(product: Product): boolean {
  const d = productNearestExpiryDays(product);
  return d != null && d >= 0 && d <= NEAR_EXPIRY_DAYS;
}

/** True se houver remessa vencida (e qty > 0). */
export function productHasExpiredBatch(product: Product): boolean {
  const d = productNearestExpiryDays(product);
  return d != null && d < 0;
}

export function batchExpiryHint(b: ProductBatch): { label: string; className: string } {
  if (!b.expiresAt) {
    return { label: "sem validade", className: "bg-zinc-800/80 text-zinc-300" };
  }
  const diff = daysUntilExpiry(b.expiresAt);
  if (diff == null) {
    return { label: "validade inválida", className: "bg-zinc-800/80 text-zinc-400" };
  }
  if (diff < 0) {
    return { label: "vencido", className: "bg-red-100 text-red-800" };
  }
  if (diff <= NEAR_EXPIRY_DAYS) {
    return { label: `próximo (${diff}d)`, className: "bg-amber-100 text-amber-900" };
  }
  return { label: "dentro do prazo", className: "bg-emerald-500/15 text-emerald-300" };
}
