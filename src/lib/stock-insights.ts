import { startOfMonth, subDays } from "date-fns";
import { productUsage } from "@/lib/stock-usage";
import type { CompletedSale, GoodsReceipt, Product, StockMovement, StockUsage } from "@/types";

export function receiptIsPosted(receipt: GoodsReceipt): boolean {
  return (receipt.status ?? "recebida") === "recebida";
}

export function receiptStatusLabel(receipt: GoodsReceipt): string {
  if (receipt.status === "a_lancar") return "A ser lançada";
  if (receipt.status === "a_caminho") return "Em rota de entrega";
  return "Lançada";
}

export type UsageTotals = Record<StockUsage, number>;

export type MonthStockPicture = {
  purchases: number;
  byUsage: UsageTotals;
  pendingTotal: number;
  pendingCount: number;
  revenue: number;
  /** Compras recebidas ÷ faturamento. */
  purchaseShare: number | null;
  /** Margem das vendas de revenda que têm custo. Null se ainda não há base. */
  margin: number | null;
  revRevenue: number;
  revCost: number;
};

function emptyUsage(): UsageTotals {
  return { revenda: 0, materia_prima: 0, consumo: 0 };
}

function itemValue(item: GoodsReceipt["itens"][number]): number {
  if (item.quantidadeRecebida != null && item.valorUnitario > 0) {
    return item.quantidadeRecebida * item.valorUnitario;
  }
  return item.valorTotal;
}

export function buildMonthStockPicture(
  products: Product[],
  receipts: GoodsReceipt[],
  sales: CompletedSale[],
  now = new Date(),
): MonthStockPicture {
  const start = startOfMonth(now);
  const byId = new Map(products.map((p) => [p.id, p]));
  const byUsage = emptyUsage();
  let pendingTotal = 0;
  let pendingCount = 0;

  for (const receipt of receipts) {
    if (new Date(receipt.createdAt) < start) continue;
    if (!receiptIsPosted(receipt)) {
      pendingTotal += receipt.total;
      pendingCount += 1;
      continue;
    }
    for (const item of receipt.itens) {
      const usage = item.usage ?? productUsage(byId.get(item.productId) ?? {});
      byUsage[usage] += itemValue(item);
    }
  }

  const purchases = byUsage.revenda + byUsage.materia_prima + byUsage.consumo;
  const monthSales = sales.filter((sale) => new Date(sale.createdAt) >= start && sale.status !== "erro");
  const revenue = monthSales.reduce((sum, sale) => sum + sale.total, 0);

  const byName = new Map(products.map((p) => [p.name.trim().toLowerCase(), p]));
  let revRevenue = 0;
  let revCost = 0;
  for (const sale of monthSales) {
    for (const line of sale.lines) {
      const product = byName.get(line.name.trim().toLowerCase());
      if (!product || productUsage(product) !== "revenda") continue;
      const qty = line.quantity ?? 0;
      const cost = product.costPrice ?? 0;
      if (qty <= 0 || cost <= 0) continue;
      revRevenue += line.subtotal;
      revCost += cost * qty;
    }
  }

  return {
    purchases,
    byUsage,
    pendingTotal,
    pendingCount,
    revenue,
    purchaseShare: revenue > 0 ? purchases / revenue : null,
    margin: revRevenue > 0 ? (revRevenue - revCost) / revRevenue : null,
    revRevenue,
    revCost,
  };
}

export type InsightRow = {
  productId: string;
  name: string;
  qty: number;
  detail: string;
};

export type StockInsightBoard = {
  topSold: InsightRow[];
  topBought: InsightRow[];
  stalled: InsightRow[];
  fast: InsightRow[];
};

export function buildStockInsights(
  products: Product[],
  ledger: StockMovement[],
  now = new Date(),
): StockInsightBoard {
  const since = subDays(now, 45);
  const sold = new Map<string, number>();
  const bought = new Map<string, number>();
  for (const move of ledger) {
    if (new Date(move.createdAt) < since) continue;
    if (move.reason === "venda_balcao" || move.reason === "venda_mesa") {
      sold.set(move.productId, (sold.get(move.productId) ?? 0) + Math.abs(move.delta));
    }
    if (move.reason === "entrada_nfe" || move.reason === "entrada_remessa") {
      bought.set(move.productId, (bought.get(move.productId) ?? 0) + Math.max(0, move.delta));
    }
  }

  const byId = new Map(products.map((p) => [p.id, p]));
  const rows = (map: Map<string, number>, limit: number, onlyResale: boolean) =>
    [...map.entries()]
      .map(([productId, qty]) => {
        const product = byId.get(productId);
        if (!product) return null;
        if (onlyResale && productUsage(product) !== "revenda") return null;
        return { productId, name: product.name, qty, detail: "" };
      })
      .filter((row): row is InsightRow => row != null && row.qty > 0)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, limit);

  const topSold = rows(sold, 5, true).map((row) => ({
    ...row,
    detail: "saíram nos últimos 45 dias",
  }));
  const topBought = rows(bought, 5, false).map((row) => ({
    ...row,
    detail: "entraram nos últimos 45 dias",
  }));

  const stalled: InsightRow[] = [];
  const fast: InsightRow[] = [];
  for (const product of products) {
    if (!product.active || productUsage(product) !== "revenda") continue;
    const out = sold.get(product.id) ?? 0;
    const inn = bought.get(product.id) ?? 0;
    const stock = product.stockQty ?? 0;
    if (inn > 0 && out === 0 && stock > 0) {
      stalled.push({
        productId: product.id,
        name: product.name,
        qty: stock,
        detail: "comprou e não vendeu",
      });
    }
    if (out > 0) {
      const daily = out / 45;
      const cover = daily > 0 ? stock / daily : Number.POSITIVE_INFINITY;
      if (cover <= 7) {
        fast.push({
          productId: product.id,
          name: product.name,
          qty: out,
          detail: stock <= 0 ? "zerou" : `cobre ${Math.max(0, Math.round(cover))} dia(s)`,
        });
      }
    }
  }

  stalled.sort((a, b) => b.qty - a.qty);
  fast.sort((a, b) => b.qty - a.qty);

  return {
    topSold,
    topBought,
    stalled: stalled.slice(0, 5),
    fast: fast.slice(0, 5),
  };
}
