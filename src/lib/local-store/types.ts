import type {
  CashMovement,
  CashRegisterSession,
  Category,
  ComandaState,
  CompletedSale,
  Product,
  StockMovement,
} from "@/types";

export type StoreBundle = {
  comandas: ComandaState[];
  categories: Category[];
  products: Product[];
  sales: CompletedSale[];
  cashSessions: CashRegisterSession[];
  cashMovements: CashMovement[];
  stockLedger: StockMovement[];
  serverTime: string;
};

export type StoreBundlePatch = Partial<
  Pick<
    StoreBundle,
    | "comandas"
    | "categories"
    | "products"
    | "sales"
    | "cashSessions"
    | "cashMovements"
    | "stockLedger"
  >
>;
