import { listComandasFromLocalStore, upsertComandaInLocalStore } from "@/lib/local-store/comandas";
import { listEntitiesByKind, upsertEntityList } from "@/lib/local-store/entities";
import type {
  CashMovement,
  CashRegisterSession,
  Category,
  CompletedSale,
  Product,
  StockMovement,
} from "@/types";
import type { StoreBundle, StoreBundlePatch } from "@/lib/local-store/types";

export type { StoreBundle, StoreBundlePatch };

export function readStoreBundle(): StoreBundle {
  return {
    comandas: listComandasFromLocalStore(),
    categories: listEntitiesByKind<Category>("category"),
    products: listEntitiesByKind<Product>("product"),
    sales: listEntitiesByKind<CompletedSale>("sale"),
    cashSessions: listEntitiesByKind<CashRegisterSession>("cash_session"),
    cashMovements: listEntitiesByKind<CashMovement>("cash_movement"),
    stockLedger: listEntitiesByKind<StockMovement>("stock_movement"),
    serverTime: new Date().toISOString(),
  };
}

export function applyStoreBundlePatch(patch: StoreBundlePatch): void {
  if (patch.comandas) {
    for (const c of patch.comandas) upsertComandaInLocalStore(c);
  }
  if (patch.categories) upsertEntityList("category", patch.categories);
  if (patch.products) upsertEntityList("product", patch.products);
  if (patch.sales) upsertEntityList("sale", patch.sales);
  if (patch.cashSessions) upsertEntityList("cash_session", patch.cashSessions);
  if (patch.cashMovements) upsertEntityList("cash_movement", patch.cashMovements);
  if (patch.stockLedger) upsertEntityList("stock_movement", patch.stockLedger);
}
