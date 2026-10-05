import type { CartLine } from "@/types";

export function moneyToCents(v: number) {
  return Math.round(v * 100);
}

export function centsToMoney(c: number) {
  return Math.round(c) / 100;
}

export function allocateMoneyCentsTotal(totalCents: number, buckets: number): number[] {
  const n = Math.floor(buckets);
  if (!Number.isFinite(totalCents) || totalCents < 0 || !Number.isFinite(n) || n <= 0) {
    return [];
  }
  const base = Math.floor(totalCents / n);
  const rem = totalCents - base * n;
  const out = Array.from({ length: n }, () => base);
  for (let i = 0; i < rem; i++) out[i]! += 1;
  return out;
}

type LineAggKey = string;

function lineAggKey(l: CartLine): LineAggKey {
  if (l.productId) return `p:${l.productId}`;
  if (l.grams || l.weightConfigId) return `w:${l.weightConfigId ?? "grams"}:${l.grams ?? 0}:${l.name}`;
  return `o:${l.name}:${l.unitPrice}`;
}

function aggregateLineQty(lines: CartLine[]): Map<LineAggKey, { qty: number }> {
  const m = new Map<LineAggKey, { qty: number }>();
  for (const l of lines) {
    const k = lineAggKey(l);
    const grams = l.grams || l.weightConfigId;
    const delta = grams ? 1 : l.quantity;
    const cur = m.get(k);
    if (!cur) m.set(k, { qty: delta });
    else cur.qty += delta;
  }
  return m;
}

export function assertSplitMatchesBaseline(baseline: CartLine[], parts: { lines: CartLine[] }[]) {
  const merged: CartLine[] = parts.flatMap((p) => p.lines);
  const a = aggregateLineQty(baseline);
  const b = aggregateLineQty(merged);
  if (a.size !== b.size) return "A divisão por itens não bate com o pedido original (quantidades diferentes).";
  for (const [k, av] of a.entries()) {
    const bv = b.get(k);
    if (!bv || bv.qty !== av.qty) {
      return "A divisão por itens não bate com o pedido original (itens faltando/sobrando).";
    }
  }
  return null;
}

export function linesSubtotal(lines: CartLine[]) {
  return lines.reduce((s, l) => s + l.subtotal, 0);
}
