import type { Product, StockUsage } from "@/types";

export const STOCK_USAGES: StockUsage[] = ["revenda", "materia_prima", "consumo"];

export const STOCK_USAGE_LABEL: Record<StockUsage, string> = {
  revenda: "Revenda",
  materia_prima: "Matéria-prima",
  consumo: "Consumo",
};

export function productUsage(product: { usage?: StockUsage }): StockUsage {
  return product.usage ?? "revenda";
}

/** Só revenda entra no caixa, na comanda e no cardápio. */
export function isSellableProduct(product: Product): boolean {
  return product.active && productUsage(product) === "revenda";
}

export function isPosProduct(product: Product): boolean {
  return isSellableProduct(product) && !product.soldByWeight;
}

/**
 * Sugestão a partir do CFOP.
 * Entrada e a saída equivalente (os XML de teste usam 5101, 5102, 5556 e 6403):
 * insumo 1101/5101, revenda 1102/5102, ST 1403/6403, uso e consumo 1556/5556.
 */
export function inferUsageFromCfop(cfop?: string): StockUsage {
  const tail = (cfop ?? "").replace(/\D/g, "").slice(-3);
  if (tail === "556" || tail === "551") return "consumo";
  if (tail === "101" || tail === "401") return "materia_prima";
  if (tail === "102" || tail === "403" || tail === "405") return "revenda";
  return "revenda";
}

export function usageHint(usage: StockUsage): string {
  if (usage === "revenda") return "Disponível no caixa";
  if (usage === "materia_prima") return "Uso na produção";
  return "Consumo interno";
}

export function usageBadgeClass(usage: StockUsage): string {
  if (usage === "revenda") return "border border-accent/25 bg-accent/10 text-accent";
  if (usage === "materia_prima") return "border border-info/25 bg-info/10 text-info";
  return "border border-border bg-foreground/5 text-muted-foreground";
}

export function stockUnit(product: Product): string {
  if (product.soldByWeight) return "kg";
  const unit = product.fiscal?.unidade_comercial?.trim();
  if (!unit) return "un";
  const upper = unit.toUpperCase();
  if (upper === "UN" || upper === "UND" || upper === "UNID") return "un";
  return unit.toLowerCase();
}

export function formatQty(qty: number, unit: string): string {
  const text = Number.isInteger(qty)
    ? String(qty)
    : qty.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
  return `${text} ${unit}`;
}
