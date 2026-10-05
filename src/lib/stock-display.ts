import { profitFromCostAndSale } from "@/lib/product-pricing";
import { resolveSaleUnit } from "@/lib/product-sale-unit";
import { stockUnit } from "@/lib/stock-usage";
import type { Product, ProductBatch } from "@/types";

export type StockTableRow = {
  key: string;
  product: Product;
  batch?: ProductBatch;
  qty: number;
};

export function stockTableRows(product: Product): StockTableRow[] {
  const batches = (product.batches ?? []).filter((b) => (b.qty ?? 0) > 0);
  if (batches.length) {
    const sorted = [...batches].sort((a, b) => {
      const da = a.receivedAt ?? "";
      const db = b.receivedAt ?? "";
      return da.localeCompare(db);
    });
    return sorted.map((b) => ({
      key: `${product.id}:${b.id}`,
      product,
      batch: b,
      qty: b.qty ?? 0,
    }));
  }
  return [
    {
      key: product.id,
      product,
      qty: product.trackStock === false ? 0 : product.stockQty ?? 0,
    },
  ];
}

export function formatEntryDate(ymd?: string): string {
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
}

export function profitPercent(product: Product): number | null {
  const cost = product.costPrice ?? 0;
  const price = product.price ?? 0;
  if (cost <= 0 || price <= 0) return null;
  return Math.round(((price - cost) / price) * 1000) / 10;
}

/** Lucro unitário (R$) = venda − custo. */
export function profitUnitAmount(product: Product): number | null {
  const cost = product.costPrice ?? 0;
  const price = product.price ?? 0;
  if (cost <= 0 || price <= 0) return null;
  return profitFromCostAndSale(cost, price);
}

export function unitTypeLabel(product: Product): string {
  const su = resolveSaleUnit(product);
  if (su === "kg") return "kg";
  if (su === "pacote") return "pct";
  return stockUnit(product);
}
