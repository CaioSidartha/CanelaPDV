"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { normalizeDemoCompanyName } from "@/config/brand";
import {
  createInitialComandas,
  defaultCompany,
  defaultWeightPrices,
} from "@/data/seed";
import { emitirNota } from "@/services/fiscal.service";
import { getActiveCashSession, expectedDrawerCash } from "@/lib/cash-analytics";
import { buildDailyComandaCode } from "@/lib/comanda-code";
import {
  allocateMoneyCentsTotal,
  assertSplitMatchesBaseline,
  centsToMoney,
  linesSubtotal,
  moneyToCents,
} from "@/lib/comanda-split";
import {
  DISPLAY_ROWS_PER_PAGE_MAX,
  DISPLAY_ROWS_PER_PAGE_MIN,
} from "@/lib/display-schedule";
import { newEntityId } from "@/lib/id";
import { verifyPassword } from "@/lib/password";
import {
  addStockAsNewBatch,
  addStockToLastBatch,
  deductFromProductBatches,
  effectiveUnitPrice,
  syncStockQtyFromBatches,
} from "@/lib/product-catalog";
import { nfeUnitToSaleUnit, saleUnitToFiscal } from "@/lib/product-sale-unit";
import { defaultModules } from "@/lib/tenant-access";
import {
  defaultCapabilities,
  modulesFromCapabilities,
  readTenantWorkspace,
  writeTenantWorkspace,
} from "@/lib/tenant-snapshot";
import { buildFreshTenantWorkspace } from "@/lib/tenant-workspace";
import type { PlatformTenant, TenantCapabilities } from "@/types/platform";
import { usePlatformStore } from "@/store/usePlatformStore";
import type {
  AppUser,
  AuthSession,
  CartLine,
  CashMovement,
  CashMovementKind,
  CashRegisterSession,
  Category,
  ComandaAuditEvent,
  ComandaSplitMode,
  ComandaState,
  CompanySettings,
  CompletedSale,
  DisplayTV,
  Employee,
  GoodsReceipt,
  HardwareSettings,
  OrderChannel,
  PaymentMethod,
  Product,
  ProductBatch,
  PunchKind,
  ReceiveNfeLine,
  SalePaymentPart,
  SalePayload,
  StockActionResult,
  StockMovement,
  StockUsage,
  Supplier,
  TenantModuleName,
  TimeOffEntry,
  TimePunch,
  TimeSchedule,
  UserRole,
  WeightPriceConfig,
} from "@/types";
import { demoSales, mergeDemoSales, mergeDemoStock } from "@/data/demo-stock";
import { defaultFiscalFields } from "@/lib/default-fiscal";
import { defaultHardwareSettings } from "@/lib/hardware/defaults";
import { onlyDigits, usableEan } from "@/lib/nfe-xml";
import { productUsage } from "@/lib/stock-usage";

type OkResult = { ok: true };
type ErrorResult = { ok: false; error: string };
type ActionResult = OkResult | ErrorResult;
type SaleResult = { ok: true; sale: CompletedSale } | ErrorResult;
type LoginResult = ActionResult;
type PunchResult = { ok: true; message: string } | ErrorResult;
type ComandaResult = ({ ok: true } & ComandaState) | ErrorResult;

type AuthState = {
  tenantId: string;
  empresaId: string;
  role: UserRole;
  modules: Record<TenantModuleName, boolean>;
};

type FinalizeOptions = {
  channel?: OrderChannel;
  mesaId?: number;
  customerNote?: string;
  customerName?: string;
  linesOverride?: CartLine[];
  /** Pagamento misto. Se omitido, usa o `payment` único. */
  payments?: SalePaymentPart[];
  discountAmount?: number;
  amountTendered?: number;
  changeGiven?: number;
};

type AppStore = {
  auth: AuthState;
  session: AuthSession | null;
  users: AppUser[];
  hasHydrated: boolean;
  company: CompanySettings;
  categories: Category[];
  products: Product[];
  weightPrices: WeightPriceConfig[];
  cart: CartLine[];
  posSearch: string;
  comandas: ComandaState[];
  comandaAudit: ComandaAuditEvent[];
  sales: CompletedSale[];
  stockLedger: StockMovement[];
  suppliers: Supplier[];
  goodsReceipts: GoodsReceipt[];
  cashSessions: CashRegisterSession[];
  cashMovements: CashMovement[];
  displayTvs: DisplayTV[];
  employees: Employee[];
  schedules: TimeSchedule[];
  timeOff: TimeOffEntry[];
  punches: TimePunch[];
  sidebarCollapsed: boolean;
  hardware: HardwareSettings;
  /** Contrato/plano (modo online-offline, fiscal, etc.) — vem do painel master no workspace. */
  tenantCapabilities?: TenantCapabilities;

  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  saveActiveTenantWorkspace: () => void;
  activateTenantWorkspace: (tenantId: string) => void;
  setAuth: (patch: Partial<AuthState>) => void;
  setHasHydrated: (value: boolean) => void;
  setCompany: (patch: Partial<CompanySettings>) => void;
  setHardware: (patch: Partial<HardwareSettings> | ((prev: HardwareSettings) => HardwareSettings)) => void;
  addCategory: (name: string) => string | undefined;
  updateCategory: (id: string, name: string) => void;
  removeCategory: (id: string) => void;
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (id: string, patch: Partial<Omit<Product, "id">>) => void;
  removeProduct: (id: string) => void;
  toggleProductActive: (id: string) => void;
  upsertWeightPrice: (config: WeightPriceConfig) => void;
  removeWeightPrice: (id: string) => void;
  addToCartProduct: (productId: string, quantity?: number) => StockActionResult;
  addToCartWeight: (weightConfigId: string, grams: number) => StockActionResult;
  incLine: (lineId: string) => StockActionResult;
  decLine: (lineId: string) => void;
  removeLine: (lineId: string) => void;
  clearCart: () => void;
  /** Mescla linhas no carrinho do caixa (ex.: vindo da Rampa). */
  importCartLines: (lines: CartLine[]) => StockActionResult;
  setPosSearch: (value: string) => void;
  createComanda: (opts?: { customerName?: string; customerNote?: string }) => ComandaResult;
  sendCartToComanda: (opts?: { comandaId?: string; customerName?: string; customerNote?: string }) => ComandaResult;
  sendLinesToComanda: (lines: CartLine[], opts?: { comandaId?: string; customerName?: string; customerNote?: string }) => ComandaResult;
  addProductToComanda: (comandaId: string, productId: string, quantity?: number) => StockActionResult;
  removeLineFromComanda: (comandaId: string, lineId: string) => void;
  incComandaLine: (comandaId: string, lineId: string) => StockActionResult;
  decComandaLine: (comandaId: string, lineId: string) => void;
  setComandaCustomerName: (comandaId: string, name: string) => void;
  clearComanda: (comandaId: string) => void;
  startComandaSplit: (comandaId: string, opts: { mode: ComandaSplitMode; people: number }) => ActionResult;
  cancelComandaSplit: (comandaId: string) => ActionResult;
  moveComandaSplitLine: (comandaId: string, fromPartIndex: number, toPartIndex: number, lineId: string) => ActionResult;
  finalizeComandaSplitPart: (comandaId: string, partIndex: number, payment: PaymentMethod) => Promise<ActionResult>;
  finalizeComanda: (
    comandaId: string,
    payment: PaymentMethod,
    opts?: Pick<
      FinalizeOptions,
      "payments" | "discountAmount" | "amountTendered" | "changeGiven"
    >,
  ) => Promise<SaleResult>;
  cancelComanda: (comandaId: string, reason?: string) => ActionResult;
  finalizeCart: (payment: PaymentMethod, opts?: FinalizeOptions) => Promise<SaleResult>;
  openCashSession: (opts?: {
    openedBy?: string;
    employeeId?: string;
    initialFloat?: number;
    expectedCloseAt?: string;
  }) => ActionResult;
  closeCashSession: (opts?: {
    closingNotes?: string;
    wasteDescription?: string;
    wasteWeightKg?: number;
    wasteValue?: number;
    leftoversNote?: string;
    countedDrawerCash?: number;
  }) => ActionResult;
  addCashMovement: (opts: { kind: CashMovementKind; amount: number; note?: string }) => ActionResult;
  adjustStock: (productId: string, delta: number, note?: string) => ActionResult;
  appendProductBatches: (productId: string, entries: { barcode: string; qty: number; expiresAt?: string }[], note?: string) => ActionResult;
  receiveSupplierInvoice: (input: {
    chave: string;
    numero?: string;
    dataEmissao?: string;
    vencimento?: string;
    total: number;
    /** false = nota fica a caminho, sem mexer no saldo. */
    lancarAgora?: boolean;
    fornecedor: {
      razaoSocial: string;
      nomeFantasia?: string;
      cnpj: string;
      ie?: string;
      phone?: string;
      email?: string;
      note?: string;
      logradouro?: string;
      numero?: string;
      complemento?: string;
      bairro?: string;
      cidade?: string;
      uf?: string;
      cep?: string;
      logoUrl?: string;
    };
    itens: ReceiveNfeLine[];
  }) => ActionResult;
  postGoodsReceipt: (
    receiptId: string,
    received: { itemId: string; quantidade: number; usage?: StockUsage; unitsPerNfUnit?: number }[],
  ) => ActionResult;
  markReceiptEnRoute: (receiptId: string) => ActionResult;
  saveSupplier: (input: {
    id?: string;
    razaoSocial: string;
    nomeFantasia?: string;
    cnpj: string;
    ie?: string;
    phone?: string;
    email?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
    logoUrl?: string;
    note?: string;
  }) => ActionResult;
  registerPunch: (opts: { clockCode: string }) => PunchResult;
  addEmployee: (employee: Omit<Employee, "id" | "createdAt">) => void;
  updateEmployee: (id: string, patch: Partial<Omit<Employee, "id" | "createdAt">>) => void;
  removeEmployee: (id: string) => ActionResult;
  toggleEmployeeActive: (id: string) => void;
  addSchedule: (schedule: Omit<TimeSchedule, "id">) => void;
  updateSchedule: (id: string, patch: Partial<Omit<TimeSchedule, "id">>) => void;
  removeSchedule: (id: string) => void;
  toggleScheduleActive: (id: string) => void;
  addTimeOff: (entry: Omit<TimeOffEntry, "id" | "createdAt">) => void;
  removeTimeOff: (id: string) => void;
  addDisplayTv: (label: string) => void;
  updateDisplayTv: (id: string, patch: Partial<Omit<DisplayTV, "id">>) => void;
  removeDisplayTv: (id: string) => void;
  addDisplaySlot: (tvId: string, categoryId: string) => void;
  updateDisplaySlot: (tvId: string, slotId: string, productIds: string[]) => void;
  removeDisplaySlot: (tvId: string, slotId: string) => void;
  setSidebarCollapsed: (value: boolean) => void;
};

const TENANT_ID = "tenant-demo";
const EMPRESA_ID = "empresa-demo";

const demoUsers: AppUser[] = [
  {
    id: "user-admin",
    tenantId: TENANT_ID,
    empresaId: EMPRESA_ID,
    name: "Administrador",
    email: "admin@loja.local",
    passwordHash: "3bc77af026eb86b1eb69e7020718a804bd7e936adba6f96a945fadcd7b9c44a4",
    role: "admin",
    active: true,
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "user-caixa",
    tenantId: TENANT_ID,
    empresaId: EMPRESA_ID,
    name: "Caixa",
    email: "caixa@loja.local",
    passwordHash: "de117bec60eae2c3df0f1baaa6ffd86f07b8223a5c823e7151d6e86c04fbd29a",
    role: "caixa",
    active: true,
    createdAt: "2025-01-01T00:00:00.000Z",
  },
];

function ensureDemoUsers(stored?: AppUser[]): AppUser[] {
  const byEmail = new Map<string, AppUser>();
  for (const u of demoUsers) byEmail.set(u.email.toLowerCase(), { ...u });
  for (const u of stored ?? []) {
    const email = u.email?.toLowerCase();
    if (!email) continue;
    const base = byEmail.get(email);
    byEmail.set(email, base ? { ...base, ...u, passwordHash: base.passwordHash } : u);
  }
  return [...byEmail.values()];
}

const initialAuth: AuthState = {
  tenantId: TENANT_ID,
  empresaId: EMPRESA_ID,
  role: "operador",
  modules: defaultModules(),
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;
const lineItemCount = (lines: CartLine[]) =>
  lines.reduce((sum, line) => sum + (line.grams ? 1 : line.quantity), 0);

export function qtyInCartForProduct(lines: CartLine[], productId: string): number {
  return lines.reduce(
    (sum, line) => sum + (line.productId === productId ? line.quantity : 0),
    0,
  );
}

export function validateLinesStock(products: Product[], lines: CartLine[]): string | null {
  for (const product of products) {
    if (product.trackStock === false) continue;
    const requested = qtyInCartForProduct(lines, product.id);
    if (requested > Math.max(0, product.stockQty ?? 0)) {
      return `Estoque insuficiente para "${product.name}". Disponível: ${Math.max(0, product.stockQty ?? 0)}.`;
    }
  }
  return null;
}

function normalizeLine(line: CartLine): CartLine {
  const quantity = Math.max(1, line.quantity || 1);
  return { ...line, quantity, subtotal: roundMoney(line.unitPrice * quantity * (line.grams ? line.grams / 1000 : 1)) };
}

function mergeLines(base: CartLine[], incoming: CartLine[]): CartLine[] {
  const next = base.map((line) => ({ ...line }));
  for (const raw of incoming) {
    const line = normalizeLine({ ...raw, id: raw.id || newEntityId("line") });
    const index = !line.grams && !line.weightConfigId && line.productId
      ? next.findIndex((item) => item.productId === line.productId && !item.grams && !item.weightConfigId)
      : -1;
    if (index < 0) {
      next.push(line);
    } else {
      const current = next[index]!;
      const quantity = current.quantity + line.quantity;
      next[index] = { ...current, quantity, unitPrice: line.unitPrice, subtotal: roundMoney(line.unitPrice * quantity) };
    }
  }
  return next;
}

function makeComanda(state: AppStore, opts?: { customerName?: string; customerNote?: string }): ComandaState {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const sequence = state.comandas.filter((c) => c.openedAt.slice(0, 10) === day).length + 1;
  const code = buildDailyComandaCode(now, sequence);
  const activeCash = getActiveCashSession(state.cashSessions);
  return {
    id: newEntityId("comanda"),
    ...code,
    tenantId: state.auth.tenantId,
    empresaId: state.auth.empresaId,
    status: "aberta",
    openedAt: now.toISOString(),
    openedSessionId: activeCash?.id,
    lines: [],
    customerName: opts?.customerName?.trim() || undefined,
    customerNote: opts?.customerNote?.trim() || undefined,
  };
}

function salePayload(
  id: string,
  lines: CartLine[],
  total: number,
  payment: PaymentMethod,
  channel: OrderChannel,
  products: Product[],
  opts?: { mesaId?: number; customerName?: string },
): SalePayload {
  return {
    id,
    total,
    status: "pendente",
    payment_method: payment,
    channel,
    mesaId: opts?.mesaId,
    cliente: opts?.customerName ? { nome: opts.customerName } : undefined,
    items: lines.map((line) => {
      const product = line.productId ? products.find((p) => p.id === line.productId) : undefined;
      return {
        descricao: line.name,
        quantidade: line.grams ? line.grams / 1000 : line.quantity,
        valor_unitario: line.unitPrice,
        valor_total: line.subtotal,
        ncm: product?.fiscal.ncm,
        cfop: product?.fiscal.cfop,
      };
    }),
  };
}

function applyStockSale(
  state: AppStore,
  lines: CartLine[],
  saleId: string,
  channel: OrderChannel,
  mesaId?: number,
): { products: Product[]; ledger: StockMovement[] } {
  const quantities = new Map<string, number>();
  for (const line of lines) {
    if (line.productId) quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.quantity);
  }
  const ledger: StockMovement[] = [];
  const products = state.products.map((product) => {
    const qty = quantities.get(product.id) ?? 0;
    if (!qty || product.trackStock === false) return product;
    const previous = product.stockQty ?? 0;
    const updated = product.batches?.length
      ? deductFromProductBatches(product, qty)
      : { ...product, stockQty: Math.max(0, previous - qty) };
    ledger.push({
      id: newEntityId("stock"),
      createdAt: new Date().toISOString(),
      tenantId: state.auth.tenantId,
      empresaId: state.auth.empresaId,
      productId: product.id,
      productName: product.name,
      delta: -qty,
      balanceAfter: updated.stockQty ?? 0,
      reason: channel === "mesa" ? "venda_mesa" : "venda_balcao",
      saleId,
      mesaId,
    });
    return updated;
  });
  return { products, ledger };
}

function completedSale(
  state: AppStore,
  id: string,
  lines: CartLine[],
  total: number,
  payment: PaymentMethod,
  channel: OrderChannel,
  fiscal: { chave_nota?: string; xml?: string },
  opts?: {
    mesaId?: number;
    comanda?: ComandaState;
    customerNote?: string;
    payments?: SalePaymentPart[];
    discountAmount?: number;
    amountTendered?: number;
    changeGiven?: number;
  },
): CompletedSale {
  return {
    id,
    createdAt: new Date().toISOString(),
    tenantId: state.auth.tenantId,
    empresaId: state.auth.empresaId,
    total,
    channel,
    mesaId: opts?.mesaId,
    comandaId: opts?.comanda?.id,
    comandaCode: opts?.comanda?.code,
    comandaNumber: opts?.comanda?.number,
    itemCount: lineItemCount(lines),
    payment_method: payment,
    payments: opts?.payments,
    discountAmount: opts?.discountAmount,
    amountTendered: opts?.amountTendered,
    changeGiven: opts?.changeGiven,
    chave_nota: fiscal.chave_nota ?? "",
    xml: fiscal.xml,
    status: "autorizada",
    lines: lines.map((line) => ({
      name: line.name,
      subtotal: line.subtotal,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      grams: line.grams,
      categoryId: line.productId
        ? state.products.find((p) => p.id === line.productId)?.categoryId
        : undefined,
    })),
    customerNote: opts?.customerNote,
    caixaId: getActiveCashSession(state.cashSessions)?.id,
  };
}

function workspaceBlobFromState(state: AppStore): Record<string, unknown> {
  return {
    auth: state.auth,
    session: state.session,
    users: state.users,
    company: state.company,
    categories: state.categories,
    products: state.products,
    weightPrices: state.weightPrices,
    comandas: state.comandas,
    comandaAudit: state.comandaAudit,
    sales: state.sales,
    stockLedger: state.stockLedger,
    suppliers: state.suppliers,
    goodsReceipts: state.goodsReceipts,
    cashSessions: state.cashSessions,
    cashMovements: state.cashMovements,
    displayTvs: state.displayTvs,
    employees: state.employees,
    schedules: state.schedules,
    timeOff: state.timeOff,
    punches: state.punches,
    sidebarCollapsed: state.sidebarCollapsed,
    hardware: state.hardware,
    catalogLayoutVersion: CATALOG_LAYOUT_VERSION,
    tenantCapabilities: state.tenantCapabilities,
  };
}

function stockErrorFor(state: AppStore, lines: CartLine[]) {
  if (!getActiveCashSession(state.cashSessions)) return "Abra um turno de caixa antes de finalizar a venda.";
  if (!lines.length || linesSubtotal(lines) <= 0) return "Não há itens para finalizar.";
  return validateLinesStock(state.products, lines);
}

function addLineToPart(lines: CartLine[], line: CartLine): CartLine[] {
  const existing = lines.find((item) =>
    item.productId === line.productId &&
    item.weightConfigId === line.weightConfigId &&
    item.grams === line.grams &&
    item.name === line.name &&
    item.unitPrice === line.unitPrice,
  );
  if (!existing) return [...lines, { ...line, id: newEntityId("split-line") }];
  return lines.map((item) => item.id === existing.id
    ? { ...item, quantity: item.quantity + line.quantity, subtotal: roundMoney(item.subtotal + line.subtotal) }
    : item);
}

/** Incrementa quando o catálogo/estoque demo deve ser zerado no navegador do cliente. */
const CATALOG_LAYOUT_VERSION = 2;

const initialState = {
  auth: initialAuth,
  session: null,
  users: demoUsers,
  hasHydrated: false,
  company: { ...defaultCompany, tenantId: TENANT_ID, empresaId: EMPRESA_ID },
  categories: [] as Category[],
  products: [] as Product[],
  weightPrices: defaultWeightPrices,
  cart: [],
  posSearch: "",
  comandas: createInitialComandas(),
  comandaAudit: [],
  sales: demoSales,
  stockLedger: [],
  suppliers: [],
  goodsReceipts: [],
  cashSessions: [],
  cashMovements: [],
  displayTvs: [],
  employees: [],
  schedules: [],
  timeOff: [],
  punches: [],
  sidebarCollapsed: false,
  hardware: { ...defaultHardwareSettings },
} satisfies Partial<AppStore>;

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      saveActiveTenantWorkspace: () => {
        const state = get();
        if (!state.auth.tenantId) return;
        writeTenantWorkspace(state.auth.tenantId, workspaceBlobFromState(state));
      },

      activateTenantWorkspace: (tenantId) => {
        const prev = get();
        if (prev.auth.tenantId && prev.auth.tenantId !== tenantId) {
          writeTenantWorkspace(prev.auth.tenantId, workspaceBlobFromState(prev));
        }
        const blob = readTenantWorkspace(tenantId);
        if (!blob) return;
        const platformTenant = usePlatformStore.getState().getTenant(tenantId);
        const modules = platformTenant
          ? modulesFromCapabilities(platformTenant.capabilities)
          : defaultModules((blob.auth as AuthState | undefined)?.modules);
        set((state) => ({
          ...state,
          ...(blob as Partial<AppStore>),
          auth: {
            ...state.auth,
            ...(blob.auth as AuthState),
            modules,
          },
          cart: [],
          posSearch: "",
          session: null,
          users: ensureDemoUsers((blob.users as AppUser[]) ?? state.users),
        }));
      },

      login: async (email, password) => {
        const trimmed = email.trim().toLowerCase();

        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email: trimmed, password, scope: "tenant" }),
          });
          const data = (await res.json()) as {
            error?: string;
            fallbackLocal?: boolean;
            profile?: {
              sub: string;
              email: string;
              name: string;
              tenantId?: string;
              role?: string;
            };
          };
          if (res.ok && data.profile?.tenantId) {
            const profile = data.profile;
            const tenantId: string = data.profile.tenantId;
            get().activateTenantWorkspace(tenantId);
            let state = get();
            const hasWorkspace = Boolean(readTenantWorkspace(tenantId));
            const userInStore = state.users.find((u) => u.email.toLowerCase() === trimmed);

            if (!hasWorkspace || !userInStore) {
              const bootRes = await fetch("/api/tenant/bootstrap", { credentials: "include" });
              if (bootRes.ok) {
                const boot = (await bootRes.json()) as {
                  tenantId: string;
                  name: string;
                  document: string;
                  planId: string;
                  monthlyFee: number;
                  kind: PlatformTenant["kind"];
                  email: string;
                  userName: string;
                  role: string;
                };
                const fromPlatform = usePlatformStore.getState().getTenant(tenantId);
                const tenant: PlatformTenant =
                  fromPlatform ?? {
                    id: boot.tenantId,
                    kind: boot.kind,
                    status: "active",
                    name: boot.name,
                    document: boot.document,
                    planId: boot.planId as PlatformTenant["planId"],
                    monthlyFee: boot.monthlyFee,
                    setupFee: 0,
                    capabilities: defaultCapabilities(),
                    branding: {},
                    adminEmail: boot.email,
                    createdAt: new Date().toISOString(),
                  };
                const workspace = await buildFreshTenantWorkspace(tenant, password, profile.sub);
                const admin = workspace.users[0];
                if (admin) {
                  admin.email = boot.email;
                  admin.name = boot.userName;
                  admin.role = (boot.role as AppUser["role"]) ?? "admin";
                }
                writeTenantWorkspace(tenantId, workspace);
                get().activateTenantWorkspace(tenantId);
                state = get();
              }
            }

            const user =
              state.users.find((u) => u.email.toLowerCase() === trimmed) ??
              state.users.find((u) => u.id === profile.sub);
            const platformTenant = usePlatformStore.getState().getTenant(tenantId);
            const modules = platformTenant
              ? modulesFromCapabilities(platformTenant.capabilities)
              : defaultModules(state.auth.modules);
            const role = (profile.role as AppUser["role"]) ?? user?.role ?? "admin";

            const session: AuthSession = {
              userId: user?.id ?? profile.sub,
              email: profile.email,
              name: profile.name,
              role,
              tenantId,
              empresaId: user?.empresaId ?? state.auth.empresaId,
              loggedInAt: new Date().toISOString(),
            };
            set((s) => ({
              session,
              auth: {
                ...s.auth,
                tenantId,
                empresaId: session.empresaId ?? s.auth.empresaId,
                role,
                modules,
              },
            }));
            get().saveActiveTenantWorkspace();
            return { ok: true };
          }
          if (res.status !== 503 && !data.fallbackLocal) {
            return { ok: false, error: data.error ?? "E-mail ou senha inválidos." };
          }
        } catch {
          /* API offline — fluxo local abaixo */
        }

        let state = get();
        const platformTenants = usePlatformStore.getState().tenants;
        const tenantByAdmin = platformTenants.find((t) => t.adminEmail.toLowerCase() === trimmed);
        if (tenantByAdmin && state.auth.tenantId !== tenantByAdmin.id) {
          get().activateTenantWorkspace(tenantByAdmin.id);
          state = get();
        }

        const user = state.users.find((u) => u.email.toLowerCase() === trimmed);
        if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
          return { ok: false, error: "E-mail ou senha inválidos." };
        }

        if (user.tenantId !== state.auth.tenantId) {
          get().activateTenantWorkspace(user.tenantId);
          state = get();
          const again = state.users.find((u) => u.email.toLowerCase() === trimmed);
          if (!again || !(await verifyPassword(password, again.passwordHash))) {
            return { ok: false, error: "E-mail ou senha inválidos." };
          }
        }

        const platformTenant = usePlatformStore.getState().getTenant(user.tenantId);
        const modules = platformTenant
          ? modulesFromCapabilities(platformTenant.capabilities)
          : defaultModules(state.auth.modules);

        const session: AuthSession = {
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          empresaId: user.empresaId,
          loggedInAt: new Date().toISOString(),
        };
        set((s) => ({
          session,
          auth: {
            ...s.auth,
            tenantId: user.tenantId,
            empresaId: user.empresaId ?? s.auth.empresaId,
            role: user.role,
            modules,
          },
        }));
        get().saveActiveTenantWorkspace();
        return { ok: true };
      },
      logout: () => {
        get().saveActiveTenantWorkspace();
        set({ session: null, auth: { ...get().auth, role: "operador" } });
      },
      setAuth: (patch) => set((state) => ({
        auth: { ...state.auth, ...patch, modules: defaultModules(patch.modules ?? state.auth.modules) },
      })),
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setCompany: (patch) => set((state) => ({ company: { ...state.company, ...patch } })),
      setHardware: (patch) =>
        set((state) => ({
          hardware:
            typeof patch === "function"
              ? patch(state.hardware)
              : {
                  scale: { ...state.hardware.scale, ...(patch.scale ?? {}) },
                  paymentTerminal: {
                    ...state.hardware.paymentTerminal,
                    ...(patch.paymentTerminal ?? {}),
                  },
                },
        })),
      addCategory: (name) => {
        const clean = name.trim();
        if (!clean) return undefined;
        const id = newEntityId("category");
        set((state) => ({ categories: [...state.categories, { id, name: clean }] }));
        return id;
      },
      updateCategory: (id, name) => {
        const clean = name.trim();
        if (!clean) return;
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? { ...c, name: clean } : c)),
        }));
      },
      removeCategory: (id) => set((state) => ({ categories: state.categories.filter((c) => c.id !== id) })),
      addProduct: (product) => set((state) => ({
        products: [...state.products, syncStockQtyFromBatches({ ...product, id: newEntityId("product") })],
      })),
      updateProduct: (id, patch) => set((state) => ({
        products: state.products.map((p) => p.id === id ? syncStockQtyFromBatches({ ...p, ...patch }) : p),
      })),
      removeProduct: (id) => set((state) => ({ products: state.products.filter((p) => p.id !== id) })),
      toggleProductActive: (id) => set((state) => ({
        products: state.products.map((p) => p.id === id ? { ...p, active: !p.active } : p),
      })),
      upsertWeightPrice: (config) => set((state) => ({
        weightPrices: state.weightPrices.some((w) => w.id === config.id)
          ? state.weightPrices.map((w) => w.id === config.id ? config : w)
          : [...state.weightPrices, { ...config, id: config.id || newEntityId("weight") }],
      })),
      removeWeightPrice: (id) => set((state) => ({ weightPrices: state.weightPrices.filter((w) => w.id !== id) })),

      addToCartProduct: (productId, quantity = 1) => {
        const state = get();
        const product = state.products.find((p) => p.id === productId && p.active);
        if (!product) return { ok: false, error: "Produto não encontrado ou inativo." };
        if (productUsage(product) !== "revenda") {
          return { ok: false, error: "Esse item não é de revenda e não entra no caixa." };
        }
        if (product.soldByWeight) return { ok: false, error: "Use a opção de peso para este produto." };
        const qty = Math.max(1, Math.floor(quantity));
        const unitPrice = effectiveUnitPrice(product);
        const next = mergeLines(state.cart, [{
          id: newEntityId("line"),
          productId,
          name: product.name,
          unitPrice,
          quantity: qty,
          subtotal: roundMoney(unitPrice * qty),
        }]);
        const error = validateLinesStock(state.products, next);
        if (error) return { ok: false, error };
        set({ cart: next });
        return { ok: true };
      },
      addToCartWeight: (weightConfigId, grams) => {
        const config = get().weightPrices.find((w) => w.id === weightConfigId && w.active);
        if (!config || !Number.isFinite(grams) || grams <= 0) return { ok: false, error: "Peso ou configuração inválida." };
        const line: CartLine = {
          id: newEntityId("line"),
          weightConfigId,
          name: config.label,
          unitPrice: config.pricePerKg,
          quantity: 1,
          grams,
          subtotal: roundMoney(config.pricePerKg * grams / 1000),
        };
        set((state) => ({ cart: [...state.cart, line] }));
        return { ok: true };
      },
      incLine: (lineId) => {
        const state = get();
        const line = state.cart.find((l) => l.id === lineId);
        if (!line || line.grams || line.weightConfigId) return { ok: false, error: "Item não permite alterar quantidade." };
        const next = state.cart.map((l) => l.id === lineId
          ? { ...l, quantity: l.quantity + 1, subtotal: roundMoney(l.unitPrice * (l.quantity + 1)) }
          : l);
        const error = validateLinesStock(state.products, next);
        if (error) return { ok: false, error };
        set({ cart: next });
        return { ok: true };
      },
      decLine: (lineId) => set((state) => ({
        cart: state.cart.flatMap((line) => {
          if (line.id !== lineId) return [line];
          if (line.quantity <= 1 || line.grams || line.weightConfigId) return [];
          const quantity = line.quantity - 1;
          return [{ ...line, quantity, subtotal: roundMoney(line.unitPrice * quantity) }];
        }),
      })),
      removeLine: (lineId) => set((state) => ({ cart: state.cart.filter((l) => l.id !== lineId) })),
      clearCart: () => set({ cart: [] }),
      importCartLines: (lines) => {
        const state = get();
        if (!lines.length) return { ok: false, error: "Nenhum item para enviar ao caixa." };
        const incoming = lines.map((line) => ({
          ...line,
          id: newEntityId("line"),
        }));
        const merged = mergeLines(state.cart, incoming);
        const error = validateLinesStock(state.products, merged);
        if (error) return { ok: false, error };
        set({ cart: merged });
        return { ok: true };
      },
      setPosSearch: (value) => set({ posSearch: value }),

      createComanda: (opts) => {
        const state = get();
        if (!getActiveCashSession(state.cashSessions)) {
          return { ok: false, error: "Abra o turno em Turno antes de emitir comandas." };
        }
        const comanda = makeComanda(state, opts);
        set({ comandas: [...state.comandas, comanda] });
        return { ok: true, ...comanda };
      },
      sendCartToComanda: (opts) => {
        const result = get().sendLinesToComanda(get().cart, opts);
        if (result.ok) set({ cart: [] });
        return result;
      },
      sendLinesToComanda: (lines, opts) => {
        const state = get();
        if (!getActiveCashSession(state.cashSessions)) {
          return { ok: false, error: "Abra o turno em Turno antes de emitir ou alterar comandas." };
        }
        if (!lines.length) return { ok: false, error: "Adicione itens antes de enviar à comanda." };
        let comanda = opts?.comandaId ? state.comandas.find((c) => c.id === opts.comandaId) : undefined;
        if (comanda && (comanda.status !== "aberta" || comanda.split)) {
          return { ok: false, error: comanda.split ? "Cancele a divisão antes de adicionar itens." : "A comanda não está aberta." };
        }
        if (!comanda) comanda = makeComanda(state, opts);
        const merged = mergeLines(comanda.lines, lines);
        const error = validateLinesStock(state.products, merged);
        if (error) return { ok: false, error };
        const updated: ComandaState = {
          ...comanda,
          lines: merged,
          customerName: opts?.customerName?.trim() || comanda.customerName,
          customerNote: opts?.customerNote?.trim() || comanda.customerNote,
        };
        set({
          comandas: state.comandas.some((c) => c.id === updated.id)
            ? state.comandas.map((c) => c.id === updated.id ? updated : c)
            : [...state.comandas, updated],
        });
        return { ok: true, ...updated };
      },
      addProductToComanda: (comandaId, productId, quantity = 1) => {
        const state = get();
        const product = state.products.find((p) => p.id === productId && p.active);
        if (!product || product.soldByWeight || product.saleUnit === "kg") {
          return { ok: false, error: "Produto inválido para esta operação." };
        }
        if (productUsage(product) !== "revenda") {
          return { ok: false, error: "Esse item não é de revenda e não entra na comanda." };
        }
        const unitPrice = effectiveUnitPrice(product);
        return state.sendLinesToComanda([{
          id: newEntityId("line"),
          productId,
          name: product.name,
          unitPrice,
          quantity: Math.max(1, Math.floor(quantity)),
          subtotal: roundMoney(unitPrice * Math.max(1, Math.floor(quantity))),
        }], { comandaId });
      },
      removeLineFromComanda: (comandaId, lineId) => set((state) => ({
        comandas: state.comandas.map((c) =>
          c.id === comandaId && c.status === "aberta" && !c.split
            ? { ...c, lines: c.lines.filter((l) => l.id !== lineId) }
            : c),
      })),
      incComandaLine: (comandaId, lineId) => {
        const state = get();
        const comanda = state.comandas.find((c) => c.id === comandaId);
        if (!comanda || comanda.status !== "aberta" || comanda.split) return { ok: false, error: "Comanda indisponível para edição." };
        const line = comanda.lines.find((l) => l.id === lineId);
        if (!line || line.grams || line.weightConfigId) return { ok: false, error: "Item não permite alterar quantidade." };
        const lines = comanda.lines.map((l) => l.id === lineId
          ? { ...l, quantity: l.quantity + 1, subtotal: roundMoney(l.unitPrice * (l.quantity + 1)) }
          : l);
        const error = validateLinesStock(state.products, lines);
        if (error) return { ok: false, error };
        set({ comandas: state.comandas.map((c) => c.id === comandaId ? { ...c, lines } : c) });
        return { ok: true };
      },
      decComandaLine: (comandaId, lineId) => set((state) => ({
        comandas: state.comandas.map((c) => {
          if (c.id !== comandaId || c.status !== "aberta" || c.split) return c;
          return {
            ...c,
            lines: c.lines.flatMap((line) => {
              if (line.id !== lineId) return [line];
              if (line.quantity <= 1 || line.grams || line.weightConfigId) return [];
              const quantity = line.quantity - 1;
              return [{ ...line, quantity, subtotal: roundMoney(line.unitPrice * quantity) }];
            }),
          };
        }),
      })),
      setComandaCustomerName: (comandaId, name) => set((state) => ({
        comandas: state.comandas.map((c) => c.id === comandaId ? { ...c, customerName: name.trim() || undefined } : c),
      })),
      clearComanda: (comandaId) => set((state) => ({
        comandas: state.comandas.map((c) => c.id === comandaId && c.status === "aberta" && !c.split ? { ...c, lines: [] } : c),
      })),
      startComandaSplit: (comandaId, opts) => {
        const state = get();
        const comanda = state.comandas.find((c) => c.id === comandaId);
        const people = Math.floor(opts.people);
        if (!comanda || comanda.status !== "aberta" || comanda.split) return { ok: false, error: "Comanda indisponível para divisão." };
        if (!comanda.lines.length) return { ok: false, error: "A comanda está vazia." };
        if (!Number.isFinite(people) || people < 2 || people > 20) return { ok: false, error: "Informe entre 2 e 20 partes." };
        const shares = allocateMoneyCentsTotal(moneyToCents(linesSubtotal(comanda.lines)), people);
        const parts = Array.from({ length: people }, (_, index) => ({
          index: index + 1,
          lines: index === 0 && opts.mode === "itens" ? comanda.lines.map((l) => ({ ...l })) : [],
          shareTotal: opts.mode === "valor" ? centsToMoney(shares[index] ?? 0) : undefined,
          paid: false,
        }));
        set({ comandas: state.comandas.map((c) => c.id === comandaId ? {
          ...c,
          split: {
            mode: opts.mode,
            people,
            parts,
            baselineLines: c.lines.map((l) => ({ ...l })),
            createdAt: new Date().toISOString(),
          },
        } : c) });
        return { ok: true };
      },
      cancelComandaSplit: (comandaId) => {
        const state = get();
        const comanda = state.comandas.find((c) => c.id === comandaId);
        if (!comanda?.split) return { ok: false, error: "A comanda não possui divisão." };
        if (comanda.split.parts.some((p) => p.paid)) return { ok: false, error: "Não é possível desfazer uma divisão com partes pagas." };
        set({ comandas: state.comandas.map((c) => c.id === comandaId ? { ...c, split: undefined } : c) });
        return { ok: true };
      },
      moveComandaSplitLine: (comandaId, fromPartIndex, toPartIndex, lineId) => {
        const state = get();
        const comanda = state.comandas.find((c) => c.id === comandaId);
        const split = comanda?.split;
        if (!comanda || !split || split.mode !== "itens") return { ok: false, error: "Divisão por itens não encontrada." };
        const from = split.parts.find((p) => p.index === fromPartIndex);
        const to = split.parts.find((p) => p.index === toPartIndex);
        const line = from?.lines.find((l) => l.id === lineId);
        if (!from || !to || !line || from.paid || to.paid) return { ok: false, error: "Não é possível mover este item." };
        const moving = line.quantity > 1 && !line.grams && !line.weightConfigId
          ? { ...line, id: newEntityId("split-line"), quantity: 1, subtotal: line.unitPrice }
          : { ...line };
        const parts = split.parts.map((part) => {
          if (part.index === fromPartIndex) {
            return {
              ...part,
              lines: part.lines.flatMap((item) => {
                if (item.id !== lineId) return [item];
                if (moving.quantity >= item.quantity) return [];
                const quantity = item.quantity - moving.quantity;
                return [{ ...item, quantity, subtotal: roundMoney(item.unitPrice * quantity) }];
              }),
            };
          }
          if (part.index === toPartIndex) return { ...part, lines: addLineToPart(part.lines, moving) };
          return part;
        });
        const mismatch = assertSplitMatchesBaseline(split.baselineLines, parts);
        if (mismatch) return { ok: false, error: mismatch };
        set({ comandas: state.comandas.map((c) => c.id === comandaId ? { ...c, split: { ...split, parts } } : c) });
        return { ok: true };
      },
      finalizeComandaSplitPart: async (comandaId, partIndex, payment) => {
        const state = get();
        const comanda = state.comandas.find((c) => c.id === comandaId);
        const split = comanda?.split;
        const part = split?.parts.find((p) => p.index === partIndex);
        if (!comanda || comanda.status !== "aberta" || !split || !part || part.paid) return { ok: false, error: "Parte inválida ou já paga." };
        const lines = split.mode === "itens" ? part.lines : split.baselineLines;
        const total = split.mode === "itens" ? linesSubtotal(lines) : (part.shareTotal ?? 0);
        if (!lines.length || total <= 0) return { ok: false, error: "Esta parte não possui valor para pagamento." };
        if (!getActiveCashSession(state.cashSessions)) return { ok: false, error: "Abra um turno de caixa antes de receber." };
        if (split.mode === "itens") {
          const error = validateLinesStock(state.products, lines);
          if (error) return { ok: false, error };
        } else if (split.parts.every((p) => p.paid || p.index === partIndex)) {
          const error = validateLinesStock(state.products, split.baselineLines);
          if (error) return { ok: false, error };
        }
        const saleId = newEntityId("sale");
        const fiscal = await emitirNota(salePayload(saleId, lines, total, payment, "mesa", state.products, { customerName: comanda.customerName }));
        if (!fiscal.ok) return { ok: false, error: fiscal.error };
        const fresh = get();
        const current = fresh.comandas.find((c) => c.id === comandaId);
        const currentSplit = current?.split;
        if (!current || !currentSplit) return { ok: false, error: "A comanda foi alterada durante o pagamento." };
        const allPaid = currentSplit.parts.every((p) => p.paid || p.index === partIndex);
        const stockLines = currentSplit.mode === "itens" ? part.lines : allPaid ? currentSplit.baselineLines : [];
        const stock = applyStockSale(fresh, stockLines, saleId, "mesa");
        const saleLines = currentSplit.mode === "itens" ? part.lines : allPaid ? currentSplit.baselineLines : [];
        const sale = completedSale(fresh, saleId, saleLines, total, payment, "mesa", fiscal.data, { comanda: current, customerNote: current.customerNote });
        const paidAt = new Date().toISOString();
        set({
          products: stock.products,
          stockLedger: [...fresh.stockLedger, ...stock.ledger],
          sales: [...fresh.sales, sale],
          comandas: fresh.comandas.map((c) => {
            if (c.id !== comandaId || !c.split) return c;
            const parts = c.split.parts.map((p) => p.index === partIndex ? {
              ...p,
              paid: true,
              payment_method: payment,
              paidAt,
              saleId,
              chave_nota: fiscal.data.chave_nota,
            } : p);
            if (!allPaid) return { ...c, split: { ...c.split, parts } };
            return {
              ...c,
              status: "fechada",
              closedAt: paidAt,
              lines: c.split.baselineLines.map((l) => ({ ...l })),
              split: { ...c.split, parts },
              lastClosedTotal: linesSubtotal(c.split.baselineLines),
              lastPaymentMethod: payment,
              lastItemCount: lineItemCount(c.split.baselineLines),
              lastClosedLines: c.split.baselineLines.map((l) => ({ ...l })),
            };
          }),
        });
        return { ok: true };
      },
      finalizeComanda: async (comandaId, payment, opts) => {
        const state = get();
        const comanda = state.comandas.find((c) => c.id === comandaId);
        if (!comanda || comanda.status !== "aberta") return { ok: false, error: "Comanda não encontrada ou já fechada." };
        if (comanda.split) return { ok: false, error: "Finalize as partes da divisão separadamente." };
        const error = stockErrorFor(state, comanda.lines);
        if (error) return { ok: false, error };
        const subtotal = roundMoney(linesSubtotal(comanda.lines));
        const discount = Math.max(0, Math.min(subtotal, opts?.discountAmount ?? 0));
        const total = roundMoney(subtotal - discount);
        const payments = opts?.payments?.length
          ? opts.payments
          : [{ method: payment, amount: total }];
        const paid = roundMoney(payments.reduce((s, p) => s + p.amount, 0));
        if (Math.abs(paid - total) > 0.02) {
          return { ok: false, error: `Pagamentos (${paid.toFixed(2)}) não batem com o total (${total.toFixed(2)}).` };
        }
        const primary = payments[0]?.method ?? payment;
        const saleId = newEntityId("sale");
        const fiscal = await emitirNota(salePayload(saleId, comanda.lines, total, primary, "mesa", state.products, { customerName: comanda.customerName }));
        if (!fiscal.ok) return { ok: false, error: fiscal.error };
        const fresh = get();
        const current = fresh.comandas.find((c) => c.id === comandaId);
        if (!current || current.status !== "aberta") return { ok: false, error: "A comanda foi alterada durante o pagamento." };
        const freshError = validateLinesStock(fresh.products, current.lines);
        if (freshError) return { ok: false, error: freshError };
        const stock = applyStockSale(fresh, current.lines, saleId, "mesa");
        const sale = completedSale(fresh, saleId, current.lines, total, primary, "mesa", fiscal.data, {
          comanda: current,
          customerNote: current.customerNote,
          payments,
          discountAmount: discount || undefined,
          amountTendered: opts?.amountTendered,
          changeGiven: opts?.changeGiven,
        });
        const closedAt = new Date().toISOString();
        set({
          products: stock.products,
          stockLedger: [...fresh.stockLedger, ...stock.ledger],
          sales: [...fresh.sales, sale],
          comandas: fresh.comandas.map((c) => c.id === comandaId ? {
            ...c,
            status: "fechada",
            closedAt,
            lines: current.lines.map((l) => ({ ...l })),
            lastClosedTotal: total,
            lastPaymentMethod: primary,
            lastItemCount: lineItemCount(current.lines),
            lastClosedLines: current.lines.map((l) => ({ ...l })),
          } : c),
        });
        return { ok: true, sale };
      },
      cancelComanda: (comandaId, reason) => {
        const state = get();
        const comanda = state.comandas.find((c) => c.id === comandaId);
        if (!comanda || comanda.status !== "aberta") return { ok: false, error: "Comanda não encontrada ou já encerrada." };
        if (comanda.split?.parts.some((p) => p.paid)) return { ok: false, error: "A comanda possui partes pagas e não pode ser cancelada." };
        const now = new Date().toISOString();
        const audit: ComandaAuditEvent = {
          id: newEntityId("audit"),
          at: now,
          tenantId: state.auth.tenantId,
          empresaId: state.auth.empresaId,
          comandaId,
          comandaCode: comanda.code,
          comandaNumber: comanda.number,
          action: "cancelada",
          userId: state.session?.userId,
          userName: state.session?.name,
          reason: reason?.trim() || undefined,
          snapshotTotal: linesSubtotal(comanda.lines),
          snapshotItemCount: lineItemCount(comanda.lines),
          customerName: comanda.customerName,
        };
        set({
          comandas: state.comandas.map((c) => c.id === comandaId ? {
            ...c,
            status: "cancelada",
            cancelledAt: now,
            cancelledByUserId: state.session?.userId,
            cancelledByName: state.session?.name,
            cancelReason: reason?.trim() || undefined,
          } : c),
          comandaAudit: [...state.comandaAudit, audit],
        });
        return { ok: true };
      },
      finalizeCart: async (payment, opts) => {
        const state = get();
        const lines = opts?.linesOverride ?? state.cart;
        const error = stockErrorFor(state, lines);
        if (error) return { ok: false, error };
        const channel = opts?.channel ?? "bancada";
        const subtotal = roundMoney(linesSubtotal(lines));
        const discount = Math.max(0, Math.min(subtotal, opts?.discountAmount ?? 0));
        const total = roundMoney(subtotal - discount);
        const payments = opts?.payments?.length
          ? opts.payments
          : [{ method: payment, amount: total }];
        const paid = roundMoney(payments.reduce((s, p) => s + p.amount, 0));
        if (Math.abs(paid - total) > 0.02) {
          return { ok: false, error: `Pagamentos (${paid.toFixed(2)}) não batem com o total (${total.toFixed(2)}).` };
        }
        const primary = payments[0]?.method ?? payment;
        const saleId = newEntityId("sale");
        const fiscal = await emitirNota(salePayload(saleId, lines, total, primary, channel, state.products, {
          mesaId: opts?.mesaId,
          customerName: opts?.customerName,
        }));
        if (!fiscal.ok) return { ok: false, error: fiscal.error };
        const fresh = get();
        const freshError = validateLinesStock(fresh.products, lines);
        if (freshError) return { ok: false, error: freshError };
        const stock = applyStockSale(fresh, lines, saleId, channel, opts?.mesaId);
        const sale = completedSale(fresh, saleId, lines, total, primary, channel, fiscal.data, {
          mesaId: opts?.mesaId,
          customerNote: opts?.customerNote,
          payments,
          discountAmount: discount || undefined,
          amountTendered: opts?.amountTendered,
          changeGiven: opts?.changeGiven,
        });
        set({
          products: stock.products,
          stockLedger: [...fresh.stockLedger, ...stock.ledger],
          sales: [...fresh.sales, sale],
          cart: opts?.linesOverride ? fresh.cart : [],
        });
        return { ok: true, sale };
      },

      openCashSession: (opts) => {
        const state = get();
        if (getActiveCashSession(state.cashSessions)) return { ok: false, error: "Já existe um caixa aberto." };
        const initialFloat = opts?.initialFloat;
        if (initialFloat != null && (!Number.isFinite(initialFloat) || initialFloat < 0)) return { ok: false, error: "Fundo inicial inválido." };
        const activeEmployees = state.employees.filter((e) => e.active);
        let openedBy = opts?.openedBy?.trim();
        const openedByEmployeeId = opts?.employeeId;
        if (openedByEmployeeId) {
          const emp = state.employees.find((e) => e.id === openedByEmployeeId && e.active);
          if (!emp) return { ok: false, error: "Funcionário inválido ou inativo." };
          openedBy = emp.name;
        } else if (activeEmployees.length > 0) {
          return { ok: false, error: "Selecione o funcionário responsável pela abertura do turno." };
        }
        const cash: CashRegisterSession = {
          id: newEntityId("cash"),
          openedAt: new Date().toISOString(),
          tenantId: state.auth.tenantId,
          empresaId: state.auth.empresaId,
          status: "aberto",
          openedBy: openedBy || undefined,
          openedByEmployeeId,
          initialFloat,
          expectedCloseAt: opts?.expectedCloseAt,
        };
        set({ cashSessions: [...state.cashSessions, cash] });
        return { ok: true };
      },
      closeCashSession: (opts) => {
        const state = get();
        const active = getActiveCashSession(state.cashSessions);
        if (!active) return { ok: false, error: "Não há caixa aberto." };
        if (state.comandas.some((c) => c.status === "aberta")) return { ok: false, error: "Finalize ou cancele as comandas abertas antes de fechar o caixa." };
        const expected = expectedDrawerCash(active, state.sales, state.cashMovements);
        const counted = opts?.countedDrawerCash;
        set({
          cashSessions: state.cashSessions.map((cash) => cash.id === active.id ? {
            ...cash,
            ...opts,
            status: "fechado",
            closedAt: new Date().toISOString(),
            expectedDrawerAtClose: expected,
            drawerDifference: counted == null ? undefined : roundMoney(counted - expected),
          } : cash),
        });
        return { ok: true };
      },
      addCashMovement: (opts) => {
        const state = get();
        const active = getActiveCashSession(state.cashSessions);
        if (!active) return { ok: false, error: "Abra o caixa antes de registrar movimentações." };
        if (!Number.isFinite(opts.amount) || opts.amount === 0 || (opts.kind !== "ajuste" && opts.amount < 0)) {
          return { ok: false, error: "Valor de movimentação inválido." };
        }
        const movement: CashMovement = {
          id: newEntityId("cash-movement"),
          sessionId: active.id,
          createdAt: new Date().toISOString(),
          tenantId: state.auth.tenantId,
          empresaId: state.auth.empresaId,
          kind: opts.kind,
          amount: opts.kind === "ajuste" ? opts.amount : Math.abs(opts.amount),
          note: opts.note?.trim() || undefined,
        };
        set({ cashMovements: [...state.cashMovements, movement] });
        return { ok: true };
      },

      adjustStock: (productId, delta, note) => {
        const state = get();
        const product = state.products.find((p) => p.id === productId);
        if (!product || product.trackStock === false) return { ok: false, error: "Produto sem controle de estoque." };
        if (!Number.isFinite(delta) || delta === 0) return { ok: false, error: "Quantidade inválida." };
        const updated = addStockToLastBatch(product, delta);
        const actualDelta = (updated.stockQty ?? 0) - (product.stockQty ?? 0);
        if (actualDelta === 0) return { ok: false, error: "O estoque já está zerado." };
        const movement: StockMovement = {
          id: newEntityId("stock"),
          createdAt: new Date().toISOString(),
          tenantId: state.auth.tenantId,
          empresaId: state.auth.empresaId,
          productId,
          productName: product.name,
          delta: actualDelta,
          balanceAfter: updated.stockQty ?? 0,
          reason: "ajuste_manual",
          note: note?.trim() || undefined,
        };
        set({
          products: state.products.map((p) => p.id === productId ? updated : p),
          stockLedger: [...state.stockLedger, movement],
        });
        return { ok: true };
      },
      appendProductBatches: (productId, entries, note) => {
        const state = get();
        const product = state.products.find((p) => p.id === productId);
        if (!product || product.trackStock === false) return { ok: false, error: "Produto sem controle de estoque." };
        const clean = entries.filter((e) => e.barcode.trim() && Number.isFinite(e.qty) && e.qty > 0);
        if (!clean.length) return { ok: false, error: "Nenhuma remessa válida informada." };
        const existingCodes = new Set((product.batches ?? []).map((b) => b.barcode));
        if (clean.some((e) => existingCodes.has(e.barcode.trim()))) return { ok: false, error: "Código de remessa já cadastrado neste produto." };
        const batches: ProductBatch[] = clean.map((entry) => ({
          id: newEntityId("batch"),
          barcode: entry.barcode.trim(),
          qty: entry.qty,
          expiresAt: entry.expiresAt,
        }));
        const baseBatches = product.batches?.length
          ? product.batches
          : (product.stockQty ?? 0) > 0
            ? [{ id: newEntityId("batch"), barcode: product.barcode ?? `LEGACY-${product.id}`, qty: product.stockQty ?? 0 }]
            : [];
        const updated = syncStockQtyFromBatches({ ...product, batches: [...baseBatches, ...batches] });
        const delta = clean.reduce((sum, entry) => sum + entry.qty, 0);
        const movement: StockMovement = {
          id: newEntityId("stock"),
          createdAt: new Date().toISOString(),
          tenantId: state.auth.tenantId,
          empresaId: state.auth.empresaId,
          productId,
          productName: product.name,
          delta,
          balanceAfter: updated.stockQty ?? 0,
          reason: "entrada_remessa",
          note: note?.trim() || undefined,
        };
        set({
          products: state.products.map((p) => p.id === productId ? updated : p),
          stockLedger: [...state.stockLedger, movement],
        });
        return { ok: true };
      },

      receiveSupplierInvoice: (input) => {
        const state = get();
        const chave = onlyDigits(input.chave);
        if (chave.length !== 44) return { ok: false, error: "Chave da NF-e inválida." };
        if (state.goodsReceipts.some((r) => r.nfeChave === chave)) {
          return { ok: false, error: "Nota já lançada. Esta NF-e já consta no estoque." };
        }
        if (!input.itens.length) return { ok: false, error: "Nenhum item para lançar." };
        const cnpj = onlyDigits(input.fornecedor.cnpj);
        if (cnpj.length < 11) return { ok: false, error: "CNPJ do fornecedor inválido." };

        const now = new Date().toISOString();
        const existingSupplier = state.suppliers.find((s) => onlyDigits(s.cnpj) === cnpj);
        const f = input.fornecedor;
        const pick = <T>(a: T | undefined, b: T | undefined) => a ?? b;
        const supplier: Supplier = existingSupplier
          ? {
              ...existingSupplier,
              razaoSocial: f.razaoSocial.trim() || existingSupplier.razaoSocial,
              nomeFantasia: pick(existingSupplier.nomeFantasia, f.nomeFantasia?.trim()),
              ie: pick(existingSupplier.ie, f.ie?.trim()),
              phone: pick(existingSupplier.phone, f.phone?.trim()),
              email: pick(existingSupplier.email, f.email?.trim()),
              note: pick(existingSupplier.note, f.note?.trim()),
              logradouro: pick(existingSupplier.logradouro, f.logradouro?.trim()),
              numero: pick(existingSupplier.numero, f.numero?.trim()),
              complemento: pick(existingSupplier.complemento, f.complemento?.trim()),
              bairro: pick(existingSupplier.bairro, f.bairro?.trim()),
              cidade: pick(existingSupplier.cidade, f.cidade?.trim()),
              uf: pick(existingSupplier.uf, f.uf?.trim()),
              cep: pick(existingSupplier.cep, f.cep?.trim()),
              logoUrl: pick(existingSupplier.logoUrl, f.logoUrl?.trim()),
              active: true,
            }
          : {
              id: newEntityId("supplier"),
              razaoSocial: f.razaoSocial.trim(),
              nomeFantasia: f.nomeFantasia?.trim() || undefined,
              cnpj,
              ie: f.ie?.trim() || undefined,
              phone: f.phone?.trim() || undefined,
              email: f.email?.trim() || undefined,
              note: f.note?.trim() || undefined,
              logradouro: f.logradouro?.trim() || undefined,
              numero: f.numero?.trim() || undefined,
              complemento: f.complemento?.trim() || undefined,
              bairro: f.bairro?.trim() || undefined,
              cidade: f.cidade?.trim() || undefined,
              uf: f.uf?.trim() || undefined,
              cep: f.cep?.trim() || undefined,
              logoUrl: f.logoUrl?.trim() || undefined,
              active: true,
              createdAt: now,
            };

        const lancarAgora = input.lancarAgora !== false;
        let products = state.products.map((p) => ({ ...p }));
        const movements: StockMovement[] = [];
        const itens: GoodsReceipt["itens"] = [];
        const note = `NF-e ${input.numero ?? chave.slice(-8)} · ${supplier.razaoSocial}`;
        const entryDate =
          input.dataEmissao?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

        for (const line of input.itens) {
          if (line.quantidade <= 0) return { ok: false, error: `Quantidade inválida em ${line.descricaoNota}.` };
          const unitsPerNfUnit = Math.max(1, line.unitsPerNfUnit ?? 1);
          const stockQty = line.quantidade * unitsPerNfUnit;
          const unitCost =
            line.valorUnitario > 0 ? line.valorUnitario / unitsPerNfUnit : 0;
          const usage = line.usage ?? line.novoProduto?.usage ?? "revenda";
          let product = line.productId ? products.find((p) => p.id === line.productId) : undefined;
          if (!product && line.novoProduto) {
            const name = line.novoProduto.name.trim();
            if (!name) return { ok: false, error: "Informe o nome do produto novo." };
            if (!state.categories.some((c) => c.id === line.novoProduto?.categoryId)) {
              return { ok: false, error: `Escolha a categoria de ${name}.` };
            }
            const ean = usableEan(line.ean);
            const saleUnit = line.saleUnit ?? nfeUnitToSaleUnit(line.unidade);
            const unitMeta = saleUnitToFiscal(saleUnit);
            product = {
              id: newEntityId("product"),
              name,
              price: Math.max(0, line.novoProduto.price),
              categoryId: line.novoProduto.categoryId,
              barcode: ean,
              active: true,
              saleUnit,
              soldByWeight: unitMeta.soldByWeight,
              trackStock: true,
              stockQty: 0,
              stockMin: 0,
              costPrice: unitCost > 0 ? unitCost : line.valorUnitario,
              usage,
              fiscal: {
                ...defaultFiscalFields,
                ncm: line.ncm || defaultFiscalFields.ncm,
                cfop: line.cfop || defaultFiscalFields.cfop,
                unidade_comercial: unitMeta.unidade_comercial,
              },
            };
            products = [...products, product];
          }
          if (!product) {
            return { ok: false, error: `Vincule ou cadastre: ${line.descricaoNota}.` };
          }
          const ean = usableEan(line.ean);
          const withCost: Product = {
            ...product,
            trackStock: true,
            usage,
            costPrice: unitCost > 0 ? unitCost : line.valorUnitario > 0 ? line.valorUnitario : product.costPrice,
            price:
              line.precoVendaAtualizado != null && line.precoVendaAtualizado > 0
                ? line.precoVendaAtualizado
                : product.price,
            barcode: product.barcode || ean,
            fiscal: {
              ...product.fiscal,
              unidade_comercial: product.fiscal?.unidade_comercial || line.unidade || "UN",
            },
          };
          const updated = lancarAgora
            ? addStockAsNewBatch(withCost, stockQty, {
                barcode: ean || undefined,
                receivedAt: entryDate,
              })
            : { ...withCost };
          products = products.map((p) => (p.id === updated.id ? updated : p));
          if (lancarAgora) {
            movements.push({
              id: newEntityId("stock"),
              createdAt: now,
              tenantId: state.auth.tenantId,
              empresaId: state.auth.empresaId,
              productId: updated.id,
              productName: updated.name,
              delta: stockQty,
              balanceAfter: updated.stockQty ?? 0,
              reason: "entrada_nfe",
              note,
            });
          }
          itens.push({
            id: newEntityId("receipt-item"),
            productId: updated.id,
            productName: updated.name,
            descricaoNota: line.descricaoNota,
            ean,
            ncm: line.ncm,
            cfop: line.cfop,
            unidade: line.unidade,
            quantidade: line.quantidade,
            unitsPerNfUnit,
            quantidadeRecebida: lancarAgora ? stockQty : undefined,
            valorUnitario: line.valorUnitario,
            valorTotal: line.valorTotal,
            usage,
          });
        }

        const receipt: GoodsReceipt = {
          id: newEntityId("receipt"),
          supplierId: supplier.id,
          nfeChave: chave,
          nfeNumero: input.numero,
          dataEmissao: input.dataEmissao,
          vencimento: input.vencimento,
          total: input.total,
          createdAt: now,
          status: lancarAgora ? "recebida" : "a_lancar",
          receivedAt: lancarAgora ? now : undefined,
          itens,
        };

        set({
          products,
          suppliers: existingSupplier
            ? state.suppliers.map((s) => (s.id === supplier.id ? supplier : s))
            : [...state.suppliers, supplier],
          goodsReceipts: [receipt, ...state.goodsReceipts],
          stockLedger: [...state.stockLedger, ...movements],
        });
        return { ok: true };
      },

      postGoodsReceipt: (receiptId, received) => {
        const state = get();
        const receipt = state.goodsReceipts.find((r) => r.id === receiptId);
        if (!receipt) return { ok: false, error: "Nota não encontrada." };
        if (receipt.status === "a_lancar") {
          return { ok: false, error: "Essa nota ainda não saiu para entrega. Marque em rota antes da baixa." };
        }
        if ((receipt.status ?? "recebida") !== "a_caminho") {
          return { ok: false, error: "Essa nota já foi lançada." };
        }
        const rowByItem = new Map(received.map((row) => [row.itemId, row]));
        const itens = receipt.itens.map((item) => {
          const row = rowByItem.get(item.id);
          const factor = Math.max(1, row?.unitsPerNfUnit ?? item.unitsPerNfUnit ?? 1);
          const qty = row ? Number(row.quantidade) : item.quantidade * factor;
          return {
            ...item,
            unitsPerNfUnit: factor,
            quantidadeRecebida: qty,
            usage: row?.usage ?? item.usage,
          };
        });
        for (const item of itens) {
          if (!Number.isFinite(item.quantidadeRecebida) || (item.quantidadeRecebida ?? 0) < 0) {
            return { ok: false, error: `Quantidade inválida em ${item.productName}.` };
          }
        }

        const now = new Date().toISOString();
        const supplier = state.suppliers.find((s) => s.id === receipt.supplierId);
        const note = `NF-e ${receipt.nfeNumero ?? receipt.nfeChave.slice(-8)} · ${supplier?.razaoSocial ?? "fornecedor"}`;
        let products = state.products.map((p) => ({ ...p }));
        const movements: StockMovement[] = [];

        for (const item of itens) {
          const qty = item.quantidadeRecebida ?? 0;
          const product = products.find((p) => p.id === item.productId);
          if (!product) return { ok: false, error: `Produto não encontrado: ${item.productName}.` };
          const factor = Math.max(1, item.unitsPerNfUnit ?? 1);
          const unitCost =
            item.valorUnitario > 0 ? item.valorUnitario / factor : product.costPrice ?? 0;
          const base: Product = {
            ...product,
            trackStock: true,
            usage: item.usage ?? product.usage,
            costPrice: unitCost > 0 ? unitCost : product.costPrice,
          };
          const updated = qty > 0 ? addStockToLastBatch(base, qty) : base;
          products = products.map((p) => (p.id === updated.id ? updated : p));
          if (qty <= 0) continue;
          movements.push({
            id: newEntityId("stock"),
            createdAt: now,
            tenantId: state.auth.tenantId,
            empresaId: state.auth.empresaId,
            productId: updated.id,
            productName: updated.name,
            delta: qty,
            balanceAfter: updated.stockQty ?? 0,
            reason: "entrada_nfe",
            note,
          });
        }

        set({
          products,
          goodsReceipts: state.goodsReceipts.map((r) =>
            r.id === receipt.id ? { ...r, status: "recebida", receivedAt: now, itens } : r,
          ),
          stockLedger: [...state.stockLedger, ...movements],
        });
        return { ok: true };
      },

      markReceiptEnRoute: (receiptId) => {
        const state = get();
        const receipt = state.goodsReceipts.find((r) => r.id === receiptId);
        if (!receipt) return { ok: false, error: "Nota não encontrada." };
        if (receipt.status !== "a_lancar") {
          return { ok: false, error: "Só uma nota a ser lançada pode ir para rota." };
        }
        set({
          goodsReceipts: state.goodsReceipts.map((r) =>
            r.id === receiptId ? { ...r, status: "a_caminho" } : r,
          ),
        });
        return { ok: true };
      },

      saveSupplier: (input) => {
        const razao = input.razaoSocial.trim();
        const cnpj = onlyDigits(input.cnpj);
        if (!razao) return { ok: false, error: "Informe a razão social." };
        if (cnpj.length !== 14 && cnpj.length !== 11) {
          return { ok: false, error: "Informe um CNPJ (ou CPF) válido." };
        }
        const state = get();
        const duplicate = state.suppliers.find(
          (s) => onlyDigits(s.cnpj) === cnpj && s.id !== input.id,
        );
        if (duplicate) return { ok: false, error: "Já existe um fornecedor com esse documento." };
        const now = new Date().toISOString();
        const patch = {
          razaoSocial: razao,
          nomeFantasia: input.nomeFantasia?.trim() || undefined,
          cnpj,
          ie: input.ie?.trim() || undefined,
          phone: input.phone?.trim() || undefined,
          email: input.email?.trim() || undefined,
          logradouro: input.logradouro?.trim() || undefined,
          numero: input.numero?.trim() || undefined,
          complemento: input.complemento?.trim() || undefined,
          bairro: input.bairro?.trim() || undefined,
          cidade: input.cidade?.trim() || undefined,
          uf: input.uf?.trim() || undefined,
          cep: input.cep?.trim() || undefined,
          logoUrl: input.logoUrl?.trim() || undefined,
          note: input.note?.trim() || undefined,
          active: true,
        };
        const current = input.id ? state.suppliers.find((s) => s.id === input.id) : undefined;
        if (input.id && !current) return { ok: false, error: "Fornecedor não encontrado." };
        const supplier: Supplier = current
          ? { ...current, ...patch }
          : { ...patch, id: newEntityId("supplier"), createdAt: now };
        set({
          suppliers: current
            ? state.suppliers.map((s) => (s.id === supplier.id ? supplier : s))
            : [...state.suppliers, supplier],
        });
        return { ok: true };
      },

      registerPunch: ({ clockCode }) => {
        const state = get();
        const code = clockCode.trim();
        const employee = state.employees.find((e) => e.active && e.clockCode === code);
        if (!employee) return { ok: false, error: "Funcionário não encontrado ou inativo." };
        const now = new Date();
        const day = now.toISOString().slice(0, 10);
        const today = state.punches.filter((p) => p.employeeId === employee.id && p.at.slice(0, 10) === day);
        const kinds: PunchKind[] = ["entrada_1", "saida_1", "entrada_2", "saida_2", "entrada_3", "saida_3"];
        const kind = kinds[today.length];
        if (!kind) return { ok: false, error: "Todos os registros do dia já foram realizados." };
        const punch: TimePunch = {
          id: newEntityId("punch"),
          employeeId: employee.id,
          at: now.toISOString(),
          kind,
          source: "web",
          createdAt: now.toISOString(),
          tenantId: state.auth.tenantId,
          empresaId: state.auth.empresaId,
        };
        set({ punches: [...state.punches, punch] });
        return { ok: true, message: `${employee.name}: ${kind.replace("_", " ")} registrada.` };
      },
      addEmployee: (employee) => set((state) => ({
        employees: [...state.employees, { ...employee, id: newEntityId("employee"), createdAt: new Date().toISOString() }],
      })),
      updateEmployee: (id, patch) => set((state) => ({
        employees: state.employees.map((e) => e.id === id ? { ...e, ...patch } : e),
      })),
      removeEmployee: (id) => {
        const state = get();
        const open = getActiveCashSession(state.cashSessions);
        if (open?.openedByEmployeeId === id) {
          return { ok: false, error: "Funcionário está no turno de caixa aberto. Feche o turno antes de excluir." };
        }
        set({ employees: state.employees.filter((e) => e.id !== id) });
        return { ok: true };
      },
      toggleEmployeeActive: (id) => set((state) => ({
        employees: state.employees.map((e) => e.id === id ? { ...e, active: !e.active } : e),
      })),
      addSchedule: (schedule) => set((state) => ({
        schedules: [...state.schedules, { ...schedule, id: newEntityId("schedule") }],
      })),
      updateSchedule: (id, patch) => set((state) => ({
        schedules: state.schedules.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      })),
      removeSchedule: (id) => set((state) => ({
        schedules: state.schedules.filter((s) => s.id !== id),
      })),
      toggleScheduleActive: (id) => set((state) => ({
        schedules: state.schedules.map((s) => s.id === id ? { ...s, active: !s.active } : s),
      })),
      addTimeOff: (entry) => set((state) => ({
        timeOff: [...state.timeOff, { ...entry, id: newEntityId("time-off"), createdAt: new Date().toISOString() }],
      })),
      removeTimeOff: (id) => set((state) => ({ timeOff: state.timeOff.filter((e) => e.id !== id) })),

      addDisplayTv: (label) => set((state) => ({
        displayTvs: [...state.displayTvs, {
          id: newEntityId("tv"),
          label: label.trim(),
          slots: [],
          rotationSeconds: 20,
          maxRowsPerPage: 15,
        }],
      })),
      updateDisplayTv: (id, patch) => set((state) => ({
        displayTvs: state.displayTvs.map((tv) => tv.id === id ? {
          ...tv,
          ...patch,
          rotationSeconds: patch.rotationSeconds == null ? tv.rotationSeconds : Math.max(5, patch.rotationSeconds),
          maxRowsPerPage: patch.maxRowsPerPage == null
            ? tv.maxRowsPerPage
            : Math.max(DISPLAY_ROWS_PER_PAGE_MIN, Math.min(DISPLAY_ROWS_PER_PAGE_MAX, patch.maxRowsPerPage)),
        } : tv),
      })),
      removeDisplayTv: (id) => set((state) => ({ displayTvs: state.displayTvs.filter((tv) => tv.id !== id) })),
      addDisplaySlot: (tvId, categoryId) => set((state) => ({
        displayTvs: state.displayTvs.map((tv) => tv.id === tvId && !tv.slots.some((s) => s.categoryId === categoryId)
          ? { ...tv, slots: [...tv.slots, { id: newEntityId("slot"), categoryId, productIds: [] }] }
          : tv),
      })),
      updateDisplaySlot: (tvId, slotId, productIds) => set((state) => ({
        displayTvs: state.displayTvs.map((tv) => tv.id === tvId
          ? { ...tv, slots: tv.slots.map((slot) => slot.id === slotId ? { ...slot, productIds } : slot) }
          : tv),
      })),
      removeDisplaySlot: (tvId, slotId) => set((state) => ({
        displayTvs: state.displayTvs.map((tv) => tv.id === tvId
          ? { ...tv, slots: tv.slots.filter((slot) => slot.id !== slotId) }
          : tv),
      })),
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
    }),
    {
      name: "padaria-maxima-store",
      partialize: (state) => ({
        auth: state.auth,
        session: state.session,
        users: state.users,
        company: state.company,
        categories: state.categories,
        products: state.products,
        weightPrices: state.weightPrices,
        comandas: state.comandas,
        comandaAudit: state.comandaAudit,
        sales: state.sales,
        stockLedger: state.stockLedger,
        suppliers: state.suppliers,
        goodsReceipts: state.goodsReceipts,
        cashSessions: state.cashSessions,
        cashMovements: state.cashMovements,
        displayTvs: state.displayTvs,
        employees: state.employees,
        schedules: state.schedules,
        timeOff: state.timeOff,
        punches: state.punches,
        sidebarCollapsed: state.sidebarCollapsed,
        hardware: state.hardware,
        catalogLayoutVersion: CATALOG_LAYOUT_VERSION,
      }),
      merge: (persisted, current) => {
        const legacy = (persisted ?? {}) as Partial<AppStore> & {
          catalogLayoutVersion?: number;
          tables?: Array<{ id: number; status: string; openedAt?: string; lines?: CartLine[]; customerNote?: string }>;
        };
        const wipeCatalog =
          (legacy.catalogLayoutVersion ?? 0) < CATALOG_LAYOUT_VERSION;
        let comandas = legacy.comandas;
        if (!comandas && legacy.tables) {
          comandas = legacy.tables.map((table, index) => {
            const openedAt = table.openedAt ?? new Date().toISOString();
            const built = buildDailyComandaCode(new Date(openedAt), index + 1);
            return {
              id: newEntityId("legacy-comanda"),
              ...built,
              status: table.status === "ocupada" ? "aberta" : "fechada",
              openedAt,
              closedAt: table.status === "ocupada" ? undefined : openedAt,
              lines: table.lines ?? [],
              customerNote: table.customerNote,
            };
          });
        }
        const auth = {
          ...current.auth,
          ...(legacy.auth ?? {}),
          modules: defaultModules(legacy.auth?.modules),
        };
        const sales = (legacy.sales ?? current.sales).map((sale) => ({
          ...sale,
          channel: (sale.channel as string) === "balcao" ? "bancada" as const : sale.channel,
        }));
        const hw = legacy.hardware;
        const hardware = {
          scale: { ...defaultHardwareSettings.scale, ...(hw?.scale ?? {}) },
          paymentTerminal: {
            ...defaultHardwareSettings.paymentTerminal,
            ...(hw?.paymentTerminal ?? {}),
            fields: {
              ...defaultHardwareSettings.paymentTerminal.fields,
              ...(hw?.paymentTerminal?.fields ?? {}),
            },
          },
        };
        const catalogBase = wipeCatalog
          ? {
              categories: [] as Category[],
              products: [] as Product[],
              suppliers: [] as typeof current.suppliers,
              goodsReceipts: [] as typeof current.goodsReceipts,
              stockLedger: [] as typeof current.stockLedger,
            }
          : mergeDemoStock({
              categories: legacy.categories ?? current.categories,
              products: (legacy.products ?? current.products).map(syncStockQtyFromBatches),
              suppliers: legacy.suppliers ?? current.suppliers,
              goodsReceipts: legacy.goodsReceipts ?? current.goodsReceipts,
              stockLedger: legacy.stockLedger ?? current.stockLedger ?? [],
            });
        const company = {
          ...current.company,
          ...(legacy.company ?? {}),
          name: normalizeDemoCompanyName(
            legacy.company?.name ?? current.company.name,
          ),
        };
        const users = ensureDemoUsers(legacy.users ?? current.users);
        return {
          ...current,
          ...legacy,
          auth,
          company,
          users,
          sales: mergeDemoSales(sales),
          hardware,
          categories: catalogBase.categories,
          products: catalogBase.products,
          suppliers: catalogBase.suppliers,
          goodsReceipts: catalogBase.goodsReceipts,
          stockLedger: catalogBase.stockLedger,
          catalogLayoutVersion: CATALOG_LAYOUT_VERSION,
          comandas: wipeCatalog ? [] : (comandas ?? current.comandas),
          cart: [],
          posSearch: "",
          hasHydrated: false,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        queueMicrotask(() => {
          const current = useAppStore.getState();
          const repaired = current.comandas.map((c) => {
            if (c.status !== "fechada") return c;
            if ((c.lastClosedLines?.length ?? 0) > 0 || c.lines.length > 0) return c;
            const sale = current.sales.find(
              (s) =>
                s.comandaId === c.id ||
                (s.comandaCode === c.code && s.comandaNumber === c.number),
            );
            if (!sale?.lines?.length) return c;
            const recovered = sale.lines.map((l, i) => ({
              id: `${c.id}-recovered-${i}`,
              name: l.name,
              unitPrice: l.unitPrice ?? l.subtotal,
              quantity: Math.max(1, l.quantity ?? 1),
              grams: l.grams,
              subtotal: l.subtotal,
            }));
            return {
              ...c,
              lines: recovered,
              lastClosedLines: recovered,
              lastClosedTotal: c.lastClosedTotal ?? sale.total,
              lastItemCount: c.lastItemCount ?? sale.itemCount,
              lastPaymentMethod: c.lastPaymentMethod ?? sale.payment_method,
            };
          });
          const company = current.company;
          useAppStore.setState({
            comandas: repaired,
            hasHydrated: true,
            users: ensureDemoUsers(current.users),
            company: {
              ...company,
              name: normalizeDemoCompanyName(company.name),
            },
          });
        });
      },
    },
  ),
);
