import type { CompletedSale } from "@/types";

export type AbcClass = "A" | "B" | "C";

export type AbcRow = {
  name: string;
  revenue: number;
  qty: number;
  share: number;
  cumulative: number;
  abc: AbcClass;
};

/** Curva ABC pelo faturamento dos itens no período. */
export function buildAbcCurve(sales: CompletedSale[]): AbcRow[] {
  const rev = new Map<string, number>();
  const qty = new Map<string, number>();
  for (const sale of sales) {
    for (const line of sale.lines ?? []) {
      const name = line.name?.trim() || "Item";
      rev.set(name, (rev.get(name) ?? 0) + (line.subtotal || 0));
      const q = line.grams ? 1 : line.quantity ?? 1;
      qty.set(name, (qty.get(name) ?? 0) + q);
    }
  }
  const rows = [...rev.entries()]
    .map(([name, revenue]) => ({
      name,
      revenue,
      qty: qty.get(name) ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const total = rows.reduce((s, r) => s + r.revenue, 0) || 1;
  let cumulative = 0;
  return rows.map((r) => {
    const share = r.revenue / total;
    cumulative += share;
    const abc: AbcClass =
      cumulative <= 0.8 ? "A" : cumulative <= 0.95 ? "B" : "C";
    return {
      ...r,
      share,
      cumulative,
      abc,
    };
  });
}

export function abcClassLabel(c: AbcClass) {
  if (c === "A") return "A · ~80% do faturamento";
  if (c === "B") return "B · miolo";
  return "C · cauda";
}
