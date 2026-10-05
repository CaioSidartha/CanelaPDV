import { newEntityId } from "@/lib/id";
import type { Product, ProductBatch } from "@/types";

/** Tempo mínimo entre duas leituras do mesmo código (leitor manda Enter duas vezes). */
export const BARCODE_SCAN_COOLDOWN_MS = 800;

export function normalizeBarcode(raw: string): string {
  return raw.trim().replace(/\s+/g, "");
}

export function effectiveUnitPrice(p: Product): number {
  if (p.onPromotion && p.promoPrice != null && !Number.isNaN(p.promoPrice) && p.promoPrice >= 0) {
    return p.promoPrice;
  }
  return p.price;
}

export function collectProductBarcodes(p: Product): string[] {
  const set = new Set<string>();
  const add = (s?: string) => {
    const n = normalizeBarcode(s ?? "");
    if (n) set.add(n);
  };
  add(p.barcode);
  for (const b of p.batches ?? []) add(b.barcode);
  return [...set];
}

export function productMatchesBarcode(p: Product, rawCode: string): boolean {
  const code = normalizeBarcode(rawCode);
  if (!code) return false;
  return collectProductBarcodes(p).some((b) => b === code);
}

export function findActiveProductByBarcode(products: Product[], rawCode: string): Product | undefined {
  const code = normalizeBarcode(rawCode);
  if (!code) return undefined;
  return products.find((p) => p.active && productMatchesBarcode(p, code));
}

/** Soma das quantidades das remessas; 0 se não houver remessas. */
export function sumBatchQty(batches: ProductBatch[] | undefined): number {
  if (!batches?.length) return 0;
  return batches.reduce((s, b) => s + Math.max(0, b.qty ?? 0), 0);
}

export function syncStockQtyFromBatches(p: Product): Product {
  const batches = p.batches;
  if (!batches?.length) return p;
  return { ...p, stockQty: sumBatchQty(batches) };
}

function batchSortKeyExpires(b: ProductBatch): number {
  if (!b.expiresAt) return Number.POSITIVE_INFINITY;
  const t = new Date(b.expiresAt).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

/** Ordena remessas para consumo: validade mais próxima primeiro; sem data por último. */
export function sortBatchesForConsumption(batches: ProductBatch[]): ProductBatch[] {
  return [...batches].sort((a, b) => {
    const da = batchSortKeyExpires(a);
    const db = batchSortKeyExpires(b);
    if (da !== db) return da - db;
    return a.id.localeCompare(b.id);
  });
}

export function deductFromProductBatches(product: Product, qty: number): Product {
  if (!product.batches?.length || qty <= 0) return product;
  let remaining = qty;
  const qtyById = new Map(product.batches.map((b) => [b.id, Math.max(0, b.qty ?? 0)]));
  for (const b of sortBatchesForConsumption(product.batches)) {
    if (remaining <= 0) break;
    const cur = qtyById.get(b.id) ?? 0;
    if (cur <= 0) continue;
    const take = Math.min(cur, remaining);
    qtyById.set(b.id, cur - take);
    remaining -= take;
  }
  const nextBatches = product.batches.map((b) => ({
    ...b,
    qty: Math.max(0, qtyById.get(b.id) ?? 0),
  }));
  return syncStockQtyFromBatches({ ...product, batches: nextBatches });
}

/** Nova remessa na entrada (NF-e ou manual) — não mistura com lote anterior. */
export function addStockAsNewBatch(
  product: Product,
  delta: number,
  opts?: { barcode?: string; receivedAt?: string },
): Product {
  if (delta <= 0) return product;
  const receivedAt = opts?.receivedAt?.slice(0, 10);
  const barcode =
    opts?.barcode?.trim() ||
    product.barcode ||
    `REM-${receivedAt ?? "manual"}-${Date.now().toString(36).slice(-4)}`;
  const batch: ProductBatch = {
    id: newEntityId("batch"),
    barcode,
    qty: delta,
    receivedAt,
  };
  const batches = [...(product.batches ?? []), batch];
  return syncStockQtyFromBatches({ ...product, batches, barcode: product.barcode || barcode });
}

/** Entrada manual: credita na última remessa (última compra / lote mais recente no cadastro). */
export function addStockToLastBatch(product: Product, delta: number): Product {
  if (delta === 0) return product;
  const batches = product.batches ?? [];
  if (!batches.length) {
    const cur = product.stockQty ?? 0;
    return { ...product, stockQty: Math.max(0, cur + delta) };
  }
  const copy = [...batches];
  const idx = copy.length - 1;
  const last = { ...copy[idx] };
  last.qty = Math.max(0, (last.qty ?? 0) + delta);
  copy[idx] = last;
  return syncStockQtyFromBatches({ ...product, batches: copy });
}

export function productMatchesTextSearch(p: Product, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  if (p.name.toLowerCase().includes(q)) return true;
  for (const b of collectProductBarcodes(p)) {
    if (b.toLowerCase().includes(q)) return true;
  }
  return false;
}
