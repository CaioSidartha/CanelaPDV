/** Markup % sobre o custo: 120 = custo + 120% do custo (venda = custo × 2,2). */
export const DEFAULT_MARKUP_PERCENT = 120;

export function saleFromCostAndMarkup(cost: number, markupPercent: number): number {
  if (!(cost > 0)) return 0;
  const m = Math.max(0, markupPercent);
  return roundMoney(cost * (1 + m / 100));
}

export function profitFromCostAndSale(cost: number, sale: number): number {
  return roundMoney(sale - cost);
}

export function markupPercentFromCostAndSale(cost: number, sale: number): number {
  if (!(cost > 0)) return 0;
  return roundMoney(((sale - cost) / cost) * 100);
}

export function marginPercentFromCostAndSale(cost: number, sale: number): number {
  if (!(sale > 0)) return 0;
  return roundMoney(((sale - cost) / sale) * 100);
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function parseMoneyInput(raw: string): number {
  const n = Number(String(raw).replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}
