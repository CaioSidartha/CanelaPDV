import { productUsage, stockUnit, formatQty } from "@/lib/stock-usage";
import { receiptIsPosted } from "@/lib/stock-insights";
import type { CompletedSale, GoodsReceipt, Product, Supplier } from "@/types";

export type SupplierRank = {
  supplierId: string;
  name: string;
  total: number;
  noteCount: number;
};

export type FastMoverSource = {
  productName: string;
  soldQty: number;
  supplierName: string;
  boughtQty: number;
};

export type ReorderTip = {
  productName: string;
  supplierName: string;
  phone?: string;
  stockLabel: string;
};

function supplierName(suppliers: Supplier[], id: string) {
  return suppliers.find((supplier) => supplier.id === id)?.razaoSocial ?? "Fornecedor";
}

function boughtBySupplier(receipts: GoodsReceipt[], productId: string) {
  const totals = new Map<string, number>();
  for (const receipt of receipts) {
    if (!receiptIsPosted(receipt)) continue;
    for (const item of receipt.itens) {
      if (item.productId !== productId) continue;
      const qty = item.quantidadeRecebida ?? item.quantidade;
      totals.set(receipt.supplierId, (totals.get(receipt.supplierId) ?? 0) + qty);
    }
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

export function buildSupplierBoard(
  suppliers: Supplier[],
  receipts: GoodsReceipt[],
  products: Product[],
  sales: CompletedSale[],
) {
  const ranks = new Map<string, SupplierRank>();
  for (const receipt of receipts) {
    if (!receiptIsPosted(receipt)) continue;
    const current = ranks.get(receipt.supplierId) ?? {
      supplierId: receipt.supplierId,
      name: supplierName(suppliers, receipt.supplierId),
      total: 0,
      noteCount: 0,
    };
    current.total += receipt.total;
    current.noteCount += 1;
    ranks.set(receipt.supplierId, current);
  }
  const ranking = [...ranks.values()].sort((a, b) => b.total - a.total);

  const sold = new Map<string, number>();
  for (const sale of sales) {
    if (sale.status === "erro") continue;
    for (const line of sale.lines) {
      const key = line.name.trim().toLowerCase();
      sold.set(key, (sold.get(key) ?? 0) + (line.quantity ?? 0));
    }
  }

  const byName = new Map(products.map((product) => [product.name.trim().toLowerCase(), product]));
  let fast: FastMoverSource | null = null;
  const topSold = [...sold.entries()].sort((a, b) => b[1] - a[1]);
  for (const [name, qty] of topSold) {
    const product = byName.get(name);
    if (!product || productUsage(product) !== "revenda" || qty <= 0) continue;
    const source = boughtBySupplier(receipts, product.id)[0];
    if (!source) continue;
    fast = {
      productName: product.name,
      soldQty: qty,
      supplierName: supplierName(suppliers, source[0]),
      boughtQty: source[1],
    };
    break;
  }

  const tips: ReorderTip[] = [];
  for (const product of products) {
    if (product.trackStock === false) continue;
    const qty = product.stockQty ?? 0;
    const min = product.stockMin ?? 0;
    if (min <= 0 || qty > min) continue;
    const source = boughtBySupplier(receipts, product.id)[0];
    if (!source) continue;
    const supplier = suppliers.find((item) => item.id === source[0]);
    tips.push({
      productName: product.name,
      supplierName: supplier?.razaoSocial ?? "o fornecedor",
      phone: supplier?.phone,
      stockLabel: formatQty(qty, stockUnit(product)),
    });
  }
  tips.sort((a, b) => a.productName.localeCompare(b.productName, "pt-BR"));

  return { ranking, fast, tips: tips.slice(0, 4) };
}
