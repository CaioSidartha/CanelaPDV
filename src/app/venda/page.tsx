"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Barcode,
  LayoutGrid,
  Minus,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { BalcaoReceiptList } from "@/components/venda/BalcaoReceiptList";
import { ProductThumb } from "@/components/product/ProductThumb";
import { PaymentCheckoutPanel } from "@/components/venda/PaymentCheckoutPanel";
import { VisualCatalogModal } from "@/components/venda/VisualCatalogModal";
import { SaleReceiptModal } from "@/components/venda/SaleReceiptModal";
import { trySilentPrint, type PrintAttempt } from "@/lib/receipt-print";
import {
  PaymentMethodIcon,
  paymentMethodLabel,
} from "@/components/payment/PaymentMethodDisplay";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getActiveCashSession } from "@/lib/cash-analytics";
import { toBarcodeSafeCode } from "@/lib/comanda-code";
import {
  BARCODE_SCAN_COOLDOWN_MS,
  effectiveUnitPrice,
  findActiveProductByBarcode,
  productMatchesTextSearch,
} from "@/lib/product-catalog";
import { isPosProduct } from "@/lib/stock-usage";
import { useBarcodeScanner } from "@/lib/useBarcodeScanner";
import { canAccessModule } from "@/lib/tenant-access";
import { cn, formatBRL } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { CartLine, ComandaState, CompletedSale, PaymentMethod, Product } from "@/types";

const PAY_METHODS: { id: PaymentMethod; hotkey: string }[] = [
  { id: "dinheiro", hotkey: "F1" },
  { id: "pix", hotkey: "F2" },
  { id: "cartao_debito", hotkey: "F3" },
  { id: "cartao_credito", hotkey: "F4" },
];

const PAY_BTN: Record<PaymentMethod, string> = {
  dinheiro:
    "border-emerald-500/50 bg-emerald-500/20 text-emerald-50 hover:bg-emerald-500/30 data-[active=true]:border-brand data-[active=true]:bg-brand/90 data-[active=true]:text-white",
  pix: "border-[#32BCAD]/50 bg-[#32BCAD]/15 text-[#dffaf6] hover:bg-[#32BCAD]/25",
  cartao_debito:
    "border-sky-500/45 bg-sky-500/12 text-sky-50 hover:bg-sky-500/22",
  cartao_credito:
    "border-sky-500/45 bg-sky-500/12 text-sky-50 hover:bg-sky-500/22",
};

const QUICK_NAME_HINTS = [
  "pão francês",
  "pao frances",
  "pão de queijo",
  "pao de queijo",
  "café expresso",
  "cafe expresso",
  "água mineral 500",
  "agua mineral 500",
  "refrigerante",
  "requeij",
];

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function pickQuickProducts(products: Product[]): Product[] {
  const active = products.filter((p) => isPosProduct(p));
  const picked: Product[] = [];
  const used = new Set<string>();

  for (const hint of QUICK_NAME_HINTS) {
    const hit = active.find(
      (p) => !used.has(p.id) && normalize(p.name).includes(normalize(hint)),
    );
    if (hit) {
      picked.push(hit);
      used.add(hit.id);
    }
    if (picked.length >= 6) break;
  }

  if (picked.length < 6) {
    for (const p of active) {
      if (used.has(p.id)) continue;
      picked.push(p);
      used.add(p.id);
      if (picked.length >= 6) break;
    }
  }
  return picked;
}

function findOpenComandaByScan(comandas: ComandaState[], raw: string): ComandaState | null {
  const code = toBarcodeSafeCode(raw.trim().toLowerCase()) || raw.trim().toLowerCase();
  if (!code) return null;
  const open = comandas.filter((c) => c.status === "aberta");
  const byCode = open.find((c) => toBarcodeSafeCode(c.code.toLowerCase()) === code);
  if (byCode) return byCode;
  const digits = code.replace(/\D/g, "");
  if (digits.length >= 1 && digits.length <= 3) {
    const num = digits.padStart(3, "0");
    return open.find((c) => c.number === num) ?? null;
  }
  if (digits.length >= 3) {
    const tail = digits.slice(-3);
    return (
      open.find(
        (c) =>
          c.number === tail || toBarcodeSafeCode(c.code.toLowerCase()).endsWith(tail),
      ) ?? null
    );
  }
  return null;
}

function lineUnitLabel(l: CartLine) {
  if (l.grams) return `${l.grams}g`;
  return `${l.quantity}× ${formatBRL(l.unitPrice)}`;
}

export default function CaixaPage() {
  const searchRef = useRef<HTMLInputElement>(null);
  const lastScanRef = useRef<{ at: number; raw: string }>({ at: 0, raw: "" });
  const openedFromQueryRef = useRef<string | null>(null);

  const [query, setQuery] = useState("");
  const [comandaFilter, setComandaFilter] = useState("");
  const [selectedComandaId, setSelectedComandaId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [payFocus, setPayFocus] = useState<PaymentMethod>("dinheiro");
  const [checkoutKey, setCheckoutKey] = useState(0);
  const [receipt, setReceipt] = useState<CompletedSale | null>(null);
  const [printStatus, setPrintStatus] = useState<PrintAttempt | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [comandaRailCollapsed, setComandaRailCollapsed] = useState(false);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem("canela-caixa-comanda-rail");
      if (v === "1") setComandaRailCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleComandaRail = useCallback(() => {
    setComandaRailCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("canela-caixa-comanda-rail", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const session = useAppStore((s) => s.session);
  const auth = useAppStore((s) => s.auth);
  const comandasModule = canAccessModule(
    { role: auth.role, modules: auth.modules },
    "comandas",
  );
  const company = useAppStore((s) => s.company);
  const products = useAppStore((s) => s.products);
  const cart = useAppStore((s) => s.cart);
  const comandas = useAppStore((s) => s.comandas);
  const cashSessions = useAppStore((s) => s.cashSessions);

  const addToCartProduct = useAppStore((s) => s.addToCartProduct);
  const incLine = useAppStore((s) => s.incLine);
  const decLine = useAppStore((s) => s.decLine);
  const removeLine = useAppStore((s) => s.removeLine);
  const clearCart = useAppStore((s) => s.clearCart);
  const finalizeCart = useAppStore((s) => s.finalizeCart);
  const sendCartToComanda = useAppStore((s) => s.sendCartToComanda);
  const addProductToComanda = useAppStore((s) => s.addProductToComanda);
  const incComandaLine = useAppStore((s) => s.incComandaLine);
  const decComandaLine = useAppStore((s) => s.decComandaLine);
  const removeLineFromComanda = useAppStore((s) => s.removeLineFromComanda);
  const finalizeComanda = useAppStore((s) => s.finalizeComanda);
  const finalizeComandaSplitPart = useAppStore((s) => s.finalizeComandaSplitPart);

  const activeSession = useMemo(() => getActiveCashSession(cashSessions), [cashSessions]);
  const caixaAberto = activeSession != null;

  const selectedComanda = useMemo(
    () => (selectedComandaId ? comandas.find((c) => c.id === selectedComandaId) ?? null : null),
    [comandas, selectedComandaId],
  );

  const mode: "balcao" | "comanda" =
    selectedComanda && selectedComanda.status === "aberta" ? "comanda" : "balcao";

  useEffect(() => {
    if (selectedComandaId && (!selectedComanda || selectedComanda.status !== "aberta")) {
      setSelectedComandaId(null);
    }
  }, [selectedComanda, selectedComandaId]);

  useEffect(() => {
    if (!comandasModule && selectedComandaId) setSelectedComandaId(null);
  }, [comandasModule, selectedComandaId]);

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("comanda");
    if (!id || openedFromQueryRef.current === id) return;
    const target = comandas.find((c) => c.id === id && c.status === "aberta");
    if (!target) return;
    openedFromQueryRef.current = id;
    setSelectedComandaId(id);
  }, [comandas]);

  const openComandas = useMemo(() => {
    const q = normalize(comandaFilter.trim());
    return comandas
      .filter((c) => c.status === "aberta")
      .filter((c) => {
        if (!q) return true;
        const blob = normalize(
          `${c.number} ${c.code} ${c.customerName ?? ""} ${c.customerNote ?? ""}`,
        );
        return blob.includes(q);
      })
      .sort((a, b) => a.openedAt.localeCompare(b.openedAt));
  }, [comandas, comandaFilter]);

  const quickProducts = useMemo(() => pickQuickProducts(products), [products]);

  const searchHits = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return [];
    return products
      .filter((p) => isPosProduct(p) && productMatchesTextSearch(p, q))
      .slice(0, 8);
  }, [products, query]);

  const activeLines: CartLine[] = mode === "comanda" ? (selectedComanda?.lines ?? []) : cart;
  const total = activeLines.reduce((s, l) => s + l.subtotal, 0);
  const itemCount = activeLines.reduce((n, l) => n + (l.grams ? 1 : l.quantity), 0);

  const splitPending =
    mode === "comanda" && selectedComanda?.split
      ? selectedComanda.split.parts.find((p) => !p.paid)
      : null;

  const payAmount =
    splitPending != null
      ? selectedComanda?.split?.mode === "valor"
        ? (splitPending.shareTotal ?? 0)
        : splitPending.lines.reduce((s, l) => s + l.subtotal, 0)
      : total;

  const focusSearch = useCallback(() => {
    requestAnimationFrame(() => searchRef.current?.focus());
  }, []);

  useEffect(() => {
    focusSearch();
  }, [focusSearch, mode, selectedComandaId]);

  const pushErr = useCallback((msg: string) => {
    setErr(msg);
    setTimeout(() => setErr(null), 5000);
  }, []);

  const pushHint = useCallback((msg: string) => {
    setHint(msg);
    setTimeout(() => setHint(null), 2500);
  }, []);

  const openReceipt = useCallback(
    (sale: CompletedSale) => {
      setReceipt(sale);
      setPrintStatus(null);
      void trySilentPrint(company, sale).then(setPrintStatus);
    },
    [company],
  );

  const cancelSale = useCallback(() => {
    if (mode === "comanda") {
      setSelectedComandaId(null);
    } else {
      clearCart();
    }
    setQuery("");
    focusSearch();
  }, [clearCart, focusSearch, mode]);

  const saveBalcaoAsComanda = useCallback(() => {
    if (!cart.length) {
      pushErr("Adicione itens antes de abrir a comanda.");
      return;
    }
    const res = sendCartToComanda();
    if (!res.ok) {
      pushErr(res.error);
      return;
    }
    setSelectedComandaId(res.id);
    setCheckoutKey((k) => k + 1);
    pushHint(`Comanda ${res.number} aberta — pode receber ou continuar`);
    focusSearch();
  }, [cart.length, focusSearch, pushErr, pushHint, sendCartToComanda]);

  const selectComanda = useCallback(
    (id: string) => {
      if (cart.length > 0) {
        clearCart();
      }
      setSelectedComandaId(id);
      setQuery("");
      focusSearch();
    },
    [cart.length, clearCart, focusSearch],
  );

  const addProduct = useCallback(
    (productId: string) => {
      if (!caixaAberto) {
        pushErr("Abra um turno em Caixa & turno antes de vender.");
        return;
      }
      if (mode === "comanda" && selectedComandaId) {
        if (selectedComanda?.split) {
          pushErr("Comanda em divisão: ajuste itens na tela de Comandas.");
          return;
        }
        const r = addProductToComanda(selectedComandaId, productId, 1);
        if (!r.ok) pushErr(r.error);
        else pushHint("Item adicionado à comanda");
      } else {
        if (selectedComandaId) setSelectedComandaId(null);
        const r = addToCartProduct(productId, 1);
        if (!r.ok) pushErr(r.error);
      }
      setQuery("");
      focusSearch();
    },
    [
      addProductToComanda,
      addToCartProduct,
      caixaAberto,
      focusSearch,
      mode,
      pushErr,
      pushHint,
      selectedComanda?.split,
      selectedComandaId,
    ],
  );

  const tryResolveInput = useCallback(
    (raw: string) => {
      const code = raw.trim();
      if (!code) return false;

      const now = Date.now();
      if (
        lastScanRef.current.raw === code &&
        now - lastScanRef.current.at < BARCODE_SCAN_COOLDOWN_MS
      ) {
        setQuery("");
        return true;
      }

      const asComanda = comandasModule ? findOpenComandaByScan(comandas, code) : null;
      if (asComanda) {
        lastScanRef.current = { at: now, raw: code };
        selectComanda(asComanda.id);
        pushHint(`Comanda ${asComanda.number} carregada`);
        setQuery("");
        return true;
      }

      const hit = findActiveProductByBarcode(products, code);
      if (hit) {
        lastScanRef.current = { at: now, raw: code };
        addProduct(hit.id);
        return true;
      }

      if (searchHits.length === 1) {
        addProduct(searchHits[0]!.id);
        return true;
      }

      return false;
    },
    [addProduct, comandas, comandasModule, products, pushHint, searchHits, selectComanda],
  );

  useBarcodeScanner({
    debugName: "caixa",
    enabled: true,
    allowedInputIds: ["campo-busca-caixa"],
    onScan: (code) => {
      void tryResolveInput(code);
    },
  });

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!tryResolveInput(query)) {
        if (query.trim()) pushErr("Não encontrado: produto ou comanda.");
      }
    }
  };

  const pay = useCallback(
    async (method: PaymentMethod) => {
      if (!caixaAberto) {
        pushErr("Abra um turno em Caixa & turno antes de receber.");
        return;
      }
      if (payAmount <= 0 && !(mode === "comanda" && selectedComanda?.split)) {
        pushErr("Nada para cobrar.");
        return;
      }
      setBusy(true);
      setErr(null);

      if (mode === "comanda" && selectedComandaId && selectedComanda) {
        if (selectedComanda.split) {
          const part = selectedComanda.split.parts.find((p) => !p.paid);
          if (!part) {
            setBusy(false);
            pushErr("Não há parte pendente nesta divisão.");
            return;
          }
          const res = await finalizeComandaSplitPart(selectedComandaId, part.index, method);
          setBusy(false);
          if (!res.ok) {
            pushErr(res.error);
            return;
          }
          const after = useAppStore.getState().comandas.find((c) => c.id === selectedComandaId);
          if (!after || after.status === "fechada" || !after.split) {
            setSelectedComandaId(null);
            pushHint("Comanda finalizada");
          } else {
            pushHint(`Parte ${part.index} paga · próxima etapa`);
          }
          focusSearch();
          return;
        }

        const res = await finalizeComanda(selectedComandaId, method);
        setBusy(false);
        if (!res.ok) {
          pushErr(res.error);
          return;
        }
        setSelectedComandaId(null);
        pushHint("Comanda paga");
        openReceipt(res.sale);
        focusSearch();
        return;
      }

      const res = await finalizeCart(method, {
        channel: "bancada",
        payments: [{ method, amount: payAmount }],
      });
      setBusy(false);
      if (!res.ok) {
        pushErr(res.error);
        return;
      }
      pushHint("Venda de balcão concluída");
      setCheckoutKey((k) => k + 1);
      openReceipt(res.sale);
      focusSearch();
    },
    [
      caixaAberto,
      finalizeCart,
      finalizeComanda,
      finalizeComandaSplitPart,
      focusSearch,
      mode,
      openReceipt,
      payAmount,
      pushErr,
      pushHint,
      selectedComanda,
      selectedComandaId,
    ],
  );

  const payMixed = useCallback(
    async (opts: {
      payments: { method: PaymentMethod; amount: number; authCode?: string; provider?: string }[];
      discountAmount: number;
      amountTendered?: number;
      changeGiven?: number;
      primary: PaymentMethod;
    }) => {
      if (!caixaAberto) {
        pushErr("Abra um turno em Caixa & turno antes de receber.");
        return;
      }
      setBusy(true);
      setErr(null);

      if (mode === "comanda" && selectedComandaId && selectedComanda && !selectedComanda.split) {
        const res = await finalizeComanda(selectedComandaId, opts.primary, {
          payments: opts.payments,
          discountAmount: opts.discountAmount,
          amountTendered: opts.amountTendered,
          changeGiven: opts.changeGiven,
        });
        setBusy(false);
        if (!res.ok) {
          pushErr(res.error);
          return;
        }
        setSelectedComandaId(null);
        setCheckoutKey((k) => k + 1);
        const troco =
          opts.changeGiven && opts.changeGiven > 0
            ? ` · troco ${formatBRL(opts.changeGiven)}`
            : "";
        pushHint(`Comanda paga${troco}`);
        openReceipt(res.sale);
        focusSearch();
        return;
      }

      const res = await finalizeCart(opts.primary, {
        channel: "bancada",
        payments: opts.payments,
        discountAmount: opts.discountAmount,
        amountTendered: opts.amountTendered,
        changeGiven: opts.changeGiven,
      });
      setBusy(false);
      if (!res.ok) {
        pushErr(res.error);
        return;
      }
      const troco =
        opts.changeGiven && opts.changeGiven > 0
          ? ` · troco ${formatBRL(opts.changeGiven)}`
          : "";
      pushHint(`Venda concluída${troco}`);
      setCheckoutKey((k) => k + 1);
      openReceipt(res.sale);
      focusSearch();
    },
    [
      caixaAberto,
      finalizeCart,
      finalizeComanda,
      focusSearch,
      mode,
      openReceipt,
      pushErr,
      pushHint,
      selectedComanda,
      selectedComandaId,
    ],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelSale();
        return;
      }
      if (e.key === "F1") {
        e.preventDefault();
        setPayFocus("dinheiro");
        void pay("dinheiro");
      } else if (e.key === "F2") {
        e.preventDefault();
        setPayFocus("pix");
        void pay("pix");
      } else if (e.key === "F3") {
        e.preventDefault();
        setPayFocus("cartao_debito");
        void pay("cartao_debito");
      } else if (e.key === "F4") {
        e.preventDefault();
        setPayFocus("cartao_credito");
        void pay("cartao_credito");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelSale, pay]);

  return (
    <div className="relative flex h-[calc(100vh-0px)] flex-col px-4 py-4 sm:px-5">
      <VisualCatalogModal
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        disabled={!caixaAberto}
        onAdded={() => focusSearch()}
      />
      <SaleReceiptModal
        company={company}
        sale={receipt}
        printStatus={printStatus}
        onClose={() => {
          setReceipt(null);
          setPrintStatus(null);
          focusSearch();
        }}
      />
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-zinc-50">Caixa</h1>
          <p className="text-sm text-zinc-500">
            Balcão e comandas na mesma tela
            {caixaAberto ? " · turno aberto" : " · turno fechado"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
              caixaAberto
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-red-500/40 bg-red-500/10 text-red-200",
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                caixaAberto ? "bg-emerald-400" : "bg-red-400",
              )}
            />
            {session?.name ?? "Operador"}
            {!caixaAberto && " · abra o turno"}
          </span>
          <button
            type="button"
            onClick={() => setCatalogOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Catálogo
          </button>
        </div>
      </header>

      {(err || hint) && (
        <div
          className={cn(
            "mb-3 rounded-xl border px-3 py-2 text-sm",
            err
              ? "border-red-500/40 bg-red-950/50 text-red-100"
              : "border-emerald-500/35 bg-emerald-950/40 text-emerald-100",
          )}
        >
          {err ?? hint}
        </div>
      )}

      <div className="relative mb-2">
        <Barcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand" />
        <Input
          ref={searchRef}
          id="campo-busca-caixa"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onSearchKeyDown}
          placeholder="Passe o leitor ou digite o nome / nº da comanda + Enter"
          className="h-9 border-brand/40 bg-zinc-950/60 pl-9 text-sm shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_30%,transparent)]"
          autoComplete="off"
        />
        {searchHits.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
            {searchHits.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-zinc-800"
                  onClick={() => addProduct(p.id)}
                >
                  <ProductThumb imageUrl={p.imageUrl} name={p.name} size={28} />
                  <span className="min-w-0 flex-1 truncate text-zinc-100">{p.name}</span>
                  <span className="font-semibold text-brand-light">
                    {formatBRL(effectiveUnitPrice(p))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {quickProducts.length > 0 && (
        <div className="mb-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin]">
          <div className="flex w-max min-w-full gap-2">
            {quickProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={!caixaAberto || Boolean(selectedComanda?.split)}
                onClick={() => addProduct(p.id)}
                className="shrink-0 rounded-lg border border-white/10 bg-zinc-950/50 px-3 py-1.5 text-left text-xs transition hover:border-brand/50 disabled:opacity-40"
              >
                <span className="whitespace-nowrap font-medium text-zinc-100">{p.name}</span>
                <span className="ml-2 whitespace-nowrap text-brand-light">
                  {p.onPromotion && p.promoPrice != null ? (
                    <>
                      <span className="mr-1 text-zinc-500 line-through">{formatBRL(p.price)}</span>
                      {formatBRL(effectiveUnitPrice(p))}
                    </>
                  ) : (
                    formatBRL(effectiveUnitPrice(p))
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className={cn(
          "grid min-h-0 flex-1 gap-4",
          comandasModule &&
            (comandaRailCollapsed
              ? "lg:grid-cols-[minmax(0,1fr)_3.25rem]"
              : "lg:grid-cols-[minmax(0,1.4fr)_minmax(240px,0.85fr)]"),
        )}
      >
        {/* Painel venda */}
        <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-zinc-900/40">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
            {mode === "comanda" && selectedComanda ? (
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-brand px-2.5 py-1 font-display text-base text-primary-foreground">
                    Comanda {selectedComanda.number}
                  </span>
                  {selectedComanda.split && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                      Divisão {selectedComanda.split.mode}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-zinc-400">
                  {selectedComanda.customerName || "Sem nome"}
                  {" · "}
                  aberta{" "}
                  {format(new Date(selectedComanda.openedAt), "HH:mm", { locale: ptBR })}
                  {" · "}
                  {itemCount} item(ns)
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-zinc-200">
                <ShoppingBag className="h-5 w-5 text-brand" />
                <div>
                  <p className="font-semibold">Venda de balcão</p>
                  <p className="text-xs text-zinc-500">{itemCount} item(ns)</p>
                </div>
              </div>
            )}
            <Button type="button" variant="secondary" size="sm" onClick={cancelSale}>
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {mode === "balcao" ? (
              <BalcaoReceiptList
                lines={cart}
                productById={productById}
                onDec={(id) => {
                  decLine(id);
                  focusSearch();
                }}
                onInc={(id) => {
                  const r = incLine(id);
                  if (!r.ok) pushErr(r.error);
                  focusSearch();
                }}
                onRemove={(id) => {
                  removeLine(id);
                  focusSearch();
                }}
              />
            ) : mode === "comanda" && selectedComanda?.split?.mode === "valor" ? (
              <div className="rounded-xl border border-white/10 bg-zinc-950/35 px-4 py-6 text-sm text-zinc-300">
                <p className="font-semibold text-zinc-100">Divisão por valor</p>
                <p className="mt-2 text-zinc-400">
                  Total da comanda {formatBRL(selectedComanda.split.baselineLines.reduce((s, l) => s + l.subtotal, 0))}{" "}
                  · {selectedComanda.split.people} partes.
                </p>
                {splitPending && (
                  <p className="mt-3 text-brand-light">
                    Agora: parte {splitPending.index}/{selectedComanda.split.people} —{" "}
                    {formatBRL(splitPending.shareTotal ?? 0)}
                  </p>
                )}
              </div>
            ) : !activeLines.length && !(selectedComanda?.split && splitPending) ? (
              <div className="flex h-full min-h-[160px] items-center justify-center rounded-xl border border-dashed border-zinc-700 px-4 text-center text-sm text-zinc-500">
                Comanda sem itens — lance na Rampa/Comandas ou adicione pelo leitor.
              </div>
            ) : (
              <ul className="space-y-2">
                {(selectedComanda?.split?.mode === "itens" && splitPending
                  ? splitPending.lines
                  : activeLines
                ).map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-zinc-950/35 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-zinc-100">{l.name}</p>
                      <p className="text-xs text-zinc-500">{lineUnitLabel(l)}</p>
                    </div>
                    {!selectedComanda?.split ? (
                      <div className="flex items-center gap-1">
                        {!l.grams && !l.weightConfigId && (
                          <>
                            <button
                              type="button"
                              className="rounded-lg border border-zinc-600 p-1 hover:bg-zinc-800"
                              onClick={() => {
                                if (selectedComandaId) decComandaLine(selectedComandaId, l.id);
                                focusSearch();
                              }}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-6 text-center text-sm tabular-nums">{l.quantity}</span>
                            <button
                              type="button"
                              className="rounded-lg border border-zinc-600 p-1 hover:bg-zinc-800"
                              onClick={() => {
                                if (selectedComandaId) {
                                  const r = incComandaLine(selectedComandaId, l.id);
                                  if (!r.ok) pushErr(r.error);
                                }
                                focusSearch();
                              }}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="ml-1 rounded-lg p-1.5 text-zinc-500 hover:bg-red-950/40 hover:text-red-400"
                          onClick={() => {
                            if (selectedComandaId) removeLineFromComanda(selectedComandaId, l.id);
                            focusSearch();
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                    <span className="w-20 text-right text-sm font-semibold text-zinc-100">
                      {formatBRL(l.subtotal)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {splitPending ? (
          <div className="border-t border-white/10 px-4 py-4">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Pagar parte {splitPending.index}
                </p>
                <p className="font-display text-4xl text-brand-light">
                  {formatBRL(payAmount)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PAY_METHODS.map(({ id, hotkey }) => (
                <button
                  key={id}
                  type="button"
                  disabled={busy || !caixaAberto || payAmount <= 0}
                  data-active={payFocus === id}
                  onClick={() => {
                    setPayFocus(id);
                    void pay(id);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-3 text-sm font-semibold transition disabled:opacity-40",
                    PAY_BTN[id],
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <PaymentMethodIcon method={id} className="h-4 w-4" />
                    {paymentMethodLabel(id)}
                  </span>
                  <span className="text-[11px] font-mono opacity-70">{hotkey}</span>
                </button>
              ))}
            </div>
          </div>
          ) : (
            <PaymentCheckoutPanel
              key={checkoutKey}
              total={payAmount}
              busy={busy}
              disabled={!caixaAberto}
              onConfirm={payMixed}
            />
          )}
        </section>

        {comandasModule && (
        <aside
          className={cn(
            "flex min-h-0 flex-col rounded-2xl border border-white/10 bg-zinc-900/40",
            comandaRailCollapsed && "items-center",
          )}
        >
          <div
            className={cn(
              "flex items-center justify-between gap-2 border-b border-white/10 py-3",
              comandaRailCollapsed ? "flex-col px-1" : "px-4",
            )}
          >
            {!comandaRailCollapsed ? (
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg text-zinc-100">Comandas</h2>
                  <span className="rounded-full bg-brand/20 px-2 py-0.5 text-xs font-bold text-brand-light">
                    {openComandas.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleComandaRail}
                  title="Recolher comandas"
                  className="rounded-md border border-white/10 p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <PanelRightClose className="h-4 w-4" />
                </button>
              </div>
            ) : (
            <button
              type="button"
              onClick={toggleComandaRail}
              title={comandaRailCollapsed ? "Expandir comandas" : "Recolher comandas"}
              className="rounded-md border border-white/10 p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <PanelRightOpen className="h-4 w-4" />
            </button>
            )}
          </div>

          {mode === "balcao" && cart.length > 0 && !comandaRailCollapsed && (
            <div className="space-y-2 border-b border-white/10 px-3 py-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Balcão em andamento</span>
                <span className="font-semibold tabular-nums text-brand-light">{formatBRL(total)}</span>
              </div>
              <Button type="button" variant="secondary" size="sm" className="w-full" onClick={saveBalcaoAsComanda}>
                Salvar como comanda
              </Button>
            </div>
          )}

          {comandaRailCollapsed ? (
            <div className="flex min-h-0 flex-1 flex-col items-center gap-1.5 overflow-y-auto py-2">
              {openComandas.length === 0 ? (
                <span className="px-1 text-[10px] text-zinc-600 [writing-mode:vertical-rl]">—</span>
              ) : (
                openComandas.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={`Comanda ${c.number}`}
                    onClick={() => selectComanda(c.id)}
                    className={cn(
                      "w-10 rounded-md border px-1 py-2 font-mono text-xs font-bold transition",
                      selectedComandaId === c.id
                        ? "border-brand bg-brand/20 text-brand-light"
                        : "border-white/10 text-zinc-400 hover:border-brand/40",
                    )}
                  >
                    {c.number}
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              <div className="border-b border-white/10 px-3 py-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                  <Input
                    value={comandaFilter}
                    onChange={(e) => setComandaFilter(e.target.value)}
                    placeholder="Número, nome…"
                    className="h-9 pl-9 text-sm"
                  />
                </div>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {!openComandas.length ? (
                  <p className="px-2 py-8 text-center text-sm text-zinc-500">
                    Nenhuma comanda aberta. Lance na Rampa ou monte uma venda e salve como comanda.
                  </p>
                ) : (
                  openComandas.map((c) => {
                    const sub = c.split
                      ? c.split.baselineLines.reduce((s, l) => s + l.subtotal, 0)
                      : c.lines.reduce((s, l) => s + l.subtotal, 0);
                    const qty = c.split
                      ? c.split.baselineLines.reduce((n, l) => n + (l.grams ? 1 : l.quantity), 0)
                      : c.lines.reduce((n, l) => n + (l.grams ? 1 : l.quantity), 0);
                    const active = c.id === selectedComandaId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectComanda(c.id)}
                        className={cn(
                          "w-full rounded-xl border px-3 py-3 text-left transition",
                          active
                            ? "border-brand bg-brand/15 ring-1 ring-brand/40"
                            : "border-white/10 bg-zinc-950/30 hover:border-brand/40",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-display text-2xl tracking-wide text-zinc-50">
                              {c.number}
                            </p>
                            <p className="truncate text-sm text-zinc-300">
                              {c.customerName || "Sem nome"}
                            </p>
                            <p className="mt-0.5 text-xs text-zinc-500">
                              {format(new Date(c.openedAt), "HH:mm", { locale: ptBR })} · {qty}{" "}
                              item(ns)
                              {c.split ? " · divisão" : ""}
                            </p>
                          </div>
                          <p className="shrink-0 font-display text-lg text-brand-light">
                            {formatBRL(sub)}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              <p className="border-t border-white/10 px-3 py-2 text-center text-[11px] text-zinc-500">
                Clique numa comanda para carregá-la e receber
              </p>
            </>
          )}
        </aside>
        )}
      </div>

      {!caixaAberto && (
        <Link
          href="/caixa"
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/88 p-6 backdrop-blur-[2px]"
          aria-label="Abrir caixa e turno"
        >
          <div className="max-w-lg rounded-2xl border border-amber-500/35 bg-zinc-950/95 px-10 py-12 text-center shadow-2xl transition hover:border-amber-400/55">
            <p className="font-display text-3xl text-zinc-50">Caixa fechado</p>
            <p className="mt-4 text-base leading-relaxed text-zinc-400">
              Abrir caixa e turno para iniciar as vendas
            </p>
            <p className="mt-8 text-sm font-semibold text-brand-light">Toque aqui para abrir o caixa</p>
          </div>
        </Link>
      )}
    </div>
  );
}
