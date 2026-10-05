import { effectiveUnitPrice } from "@/lib/product-catalog";
import { productUsage } from "@/lib/stock-usage";
import type { Category, DisplaySlot, DisplayTV, Product } from "@/types";

/** Mínimo / máximo de linhas visíveis por quadro no monitor (sem scroll). */
export const DISPLAY_ROWS_PER_PAGE_MIN = 8;
export const DISPLAY_ROWS_PER_PAGE_MAX = 40;

export function resolveMaxRowsPerPage(tv: Pick<DisplayTV, "maxRowsPerPage">): number {
  const n = tv.maxRowsPerPage ?? DISPLAY_ROWS_PER_PAGE_MIN;
  return Math.max(
    DISPLAY_ROWS_PER_PAGE_MIN,
    Math.min(DISPLAY_ROWS_PER_PAGE_MAX, n),
  );
}

export type DisplayFrameRow = {
  productId: string;
  name: string;
  unitPrice: number;
  onPromotion: boolean;
};

export type DisplayFrame = {
  categoryTitle: string;
  rows: DisplayFrameRow[];
  /** Duração deste quadro em ms */
  durationMs: number;
};

function productsForSlot(slot: DisplaySlot, products: Product[]): Product[] {
  let list = products.filter(
    (p) => p.active && productUsage(p) === "revenda" && p.categoryId === slot.categoryId && !p.soldByWeight,
  );
  if (slot.productIds.length > 0) {
    const set = new Set(slot.productIds);
    list = list.filter((p) => set.has(p.id));
  }
  return [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function chunkRows<T>(arr: T[], size: number): T[][] {
  const s = Math.max(1, size);
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += s) {
    out.push(arr.slice(i, i + s));
  }
  return out.length ? out : [[]];
}

/**
 * Monta a sequência de quadros (categoria + página de itens) e a duração de cada um.
 * - Cada quadro mostra no máximo `resolveMaxRowsPerPage(tv)` itens; excedente vira outro(s) quadro(s)
 *   da mesma categoria, **sem scroll** no monitor.
 * - Cada quadro usa o mesmo `rotationSeconds` (ex.: 20s na 1ª página + 20s na 2ª da mesma categoria).
 * - Um único quadro no total: intervalo longo para reavaliar dados sem “piscar” rápido.
 */
export function buildDisplayFrames(
  tv: DisplayTV,
  categories: Category[],
  products: Product[],
): DisplayFrame[] {
  const maxRows = resolveMaxRowsPerPage(tv);
  const rotSec = Math.max(5, tv.rotationSeconds || 20);
  const pageDurationMs = rotSec * 1000;
  const frames: DisplayFrame[] = [];

  for (const slot of tv.slots) {
    const cat = categories.find((c) => c.id === slot.categoryId);
    const title = cat?.name ?? "Categoria";
    const list = productsForSlot(slot, products);
    const pages = chunkRows(list, maxRows);

    for (const page of pages) {
      frames.push({
        categoryTitle: title,
        rows: page.map((pr) => ({
          productId: pr.id,
          name: pr.name,
          unitPrice: effectiveUnitPrice(pr),
          onPromotion: !!(pr.onPromotion && pr.promoPrice != null),
        })),
        durationMs: Math.round(pageDurationMs),
      });
    }
  }

  if (frames.length === 0) {
    frames.push({
      categoryTitle: "Sem itens",
      rows: [],
      durationMs: 10_000,
    });
  }

  if (frames.length === 1) {
    frames[0]!.durationMs = Math.max(frames[0]!.durationMs, 60_000);
  }

  return frames;
}

export function slotNeedsPaging(
  slot: DisplaySlot,
  products: Product[],
  maxRows: number,
): boolean {
  const list = productsForSlot(slot, products);
  const cap = Math.max(DISPLAY_ROWS_PER_PAGE_MIN, maxRows);
  return list.length > cap;
}

export function tvNeedsRotationField(tv: DisplayTV, products: Product[]): boolean {
  const cap = resolveMaxRowsPerPage(tv);
  if (tv.slots.length > 1) return true;
  if (tv.slots.length === 1) {
    return slotNeedsPaging(tv.slots[0]!, products, cap);
  }
  return false;
}
