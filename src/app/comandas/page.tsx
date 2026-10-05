"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, formatDistanceStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowUpRight,
  ChefHat,
  Clock,
  Minus,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import {
  PaymentMethodIcon,
  paymentMethodLabel,
} from "@/components/payment/PaymentMethodDisplay";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getActiveCashSession } from "@/lib/cash-analytics";
import { printComandaSlip } from "@/lib/comanda-print";
import {
  effectiveUnitPrice,
  productMatchesTextSearch,
} from "@/lib/product-catalog";
import { isPosProduct } from "@/lib/stock-usage";
import { cn, formatBRL } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { ComandaState, PaymentMethod } from "@/types";

const PAY_METHODS: PaymentMethod[] = [
  "dinheiro",
  "pix",
  "cartao_credito",
  "cartao_debito",
];

const PAY_BTN: Record<PaymentMethod, string> = {
  dinheiro:
    "border-emerald-500/45 bg-emerald-500/15 text-emerald-50 hover:border-emerald-400/70 hover:bg-emerald-500/25",
  pix: "border-[#32BCAD]/50 bg-[#32BCAD]/15 text-[#dffaf6] hover:border-[#32BCAD] hover:bg-[#32BCAD]/25",
  cartao_credito:
    "border-sky-500/45 bg-sky-500/12 text-sky-50 hover:border-sky-400/65 hover:bg-sky-500/22",
  cartao_debito:
    "border-sky-500/45 bg-sky-500/12 text-sky-50 hover:border-sky-400/65 hover:bg-sky-500/22",
};

type ViewMode = "abertas" | "historico";
type SortMode = "tempo" | "valor" | "numero";

type DisplayLine = {
  id: string;
  name: string;
  subtotal: number;
  /** Prefixo curto no card: "2×" ou "350g" */
  prefix?: string;
  /** Detalhe no drawer: "2× R$ 5,00" */
  detail?: string;
};

function activeLines(c: ComandaState) {
  if (c.split) return c.split.baselineLines;
  return c.lines;
}

function snapshotLines(c: ComandaState) {
  if (c.status === "fechada") {
    if (c.lastClosedLines?.length) return c.lastClosedLines;
    if (c.lines.length) return c.lines;
    return [];
  }
  if (c.status === "cancelada") return c.lines;
  return activeLines(c);
}

function comandaTotal(c: ComandaState) {
  if (c.status === "fechada" && c.lastClosedTotal != null) return c.lastClosedTotal;
  return snapshotLines(c).reduce((s, l) => s + l.subtotal, 0);
}

function comandaItemCount(c: ComandaState) {
  if (c.status === "fechada" && c.lastItemCount != null) return c.lastItemCount;
  return snapshotLines(c).reduce((n, l) => n + (l.grams ? 1 : l.quantity), 0);
}

function toDisplayLines(c: ComandaState): DisplayLine[] {
  return snapshotLines(c).map((l) => ({
    id: l.id,
    name: l.name,
    subtotal: l.subtotal,
    prefix: l.grams ? `${l.grams}g` : `${l.quantity}×`,
    detail: l.grams ? `${l.grams}g` : `${l.quantity}× ${formatBRL(l.unitPrice)}`,
  }));
}

function salesForComanda(
  c: ComandaState,
  sales: {
    comandaId?: string;
    comandaCode?: string;
    comandaNumber?: string;
    lines: {
      name: string;
      subtotal: number;
      quantity?: number;
      unitPrice?: number;
      grams?: number;
    }[];
  }[],
) {
  return sales.filter(
    (s) =>
      s.comandaId === c.id ||
      (Boolean(s.comandaCode) && s.comandaCode === c.code) ||
      (Boolean(s.comandaNumber) && s.comandaNumber === c.number && s.comandaCode === c.code),
  );
}

function displayLinesForComanda(
  c: ComandaState,
  sales: {
    comandaId?: string;
    comandaCode?: string;
    comandaNumber?: string;
    lines: {
      name: string;
      subtotal: number;
      quantity?: number;
      unitPrice?: number;
      grams?: number;
    }[];
  }[],
): DisplayLine[] {
  const fromSnapshot = toDisplayLines(c);
  if (fromSnapshot.length) return fromSnapshot;
  if (c.status !== "fechada" && c.status !== "cancelada") return [];
  return salesForComanda(c, sales).flatMap((s, si) =>
    s.lines.map((l, li) => {
      const prefix = l.grams
        ? `${l.grams}g`
        : l.quantity
          ? `${l.quantity}×`
          : undefined;
      const detail = l.grams
        ? `${l.grams}g`
        : l.quantity && l.unitPrice != null
          ? `${l.quantity}× ${formatBRL(l.unitPrice)}`
          : prefix;
      return {
        id: `${c.id}-${si}-${li}`,
        name: l.name,
        subtotal: l.subtotal,
        prefix,
        detail,
      };
    }),
  );
}

function elapsedLabel(openedAt: string, now: number) {
  try {
    return formatDistanceStrict(new Date(openedAt), new Date(now), {
      locale: ptBR,
      addSuffix: false,
    });
  } catch {
    return "—";
  }
}

function ageMinutes(openedAt: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(openedAt).getTime()) / 60000));
}

function ageTone(mins: number) {
  if (mins >= 90) return "text-red-300 border-red-500/40 bg-red-950/40";
  if (mins >= 45) return "text-amber-200 border-amber-500/35 bg-amber-950/35";
  return "text-emerald-200 border-emerald-500/30 bg-emerald-950/30";
}

export default function ComandasPage() {
  const company = useAppStore((s) => s.company);
  const comandas = useAppStore((s) => s.comandas);
  const sales = useAppStore((s) => s.sales);
  const products = useAppStore((s) => s.products);
  const cashSessions = useAppStore((s) => s.cashSessions);
  const createComanda = useAppStore((s) => s.createComanda);
  const finalizeComanda = useAppStore((s) => s.finalizeComanda);
  const addProductToComanda = useAppStore((s) => s.addProductToComanda);
  const removeLineFromComanda = useAppStore((s) => s.removeLineFromComanda);
  const incComandaLine = useAppStore((s) => s.incComandaLine);
  const decComandaLine = useAppStore((s) => s.decComandaLine);
  const setComandaCustomerName = useAppStore((s) => s.setComandaCustomerName);
  const cancelComanda = useAppStore((s) => s.cancelComanda);

  const [now, setNow] = useState(() => Date.now());
  const [view, setView] = useState<ViewMode>("abertas");
  const [sort, setSort] = useState<SortMode>("tempo");
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addQuery, setAddQuery] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Repara histórico já carregado (sem itens no snapshot) a partir das vendas
  useEffect(() => {
    const broken = comandas.filter(
      (c) =>
        c.status === "fechada" &&
        !(c.lastClosedLines?.length || c.lines.length) &&
        sales.some(
          (s) =>
            s.comandaId === c.id ||
            (s.comandaCode === c.code && s.comandaNumber === c.number),
        ),
    );
    if (!broken.length) return;
    useAppStore.setState((state) => ({
      comandas: state.comandas.map((c) => {
        if (c.status !== "fechada") return c;
        if ((c.lastClosedLines?.length ?? 0) > 0 || c.lines.length > 0) return c;
        const sale = state.sales.find(
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
      }),
    }));
  }, [comandas, sales]);

  const activeSession = useMemo(() => getActiveCashSession(cashSessions), [cashSessions]);
  const caixaAberto = activeSession != null;

  const abertas = useMemo(
    () => comandas.filter((c) => c.status === "aberta"),
    [comandas],
  );

  const historico = useMemo(
    () =>
      comandas
        .filter((c) => c.status === "fechada" || c.status === "cancelada")
        .slice()
        .sort((a, b) =>
          (b.closedAt ?? b.cancelledAt ?? b.openedAt).localeCompare(
            a.closedAt ?? a.cancelledAt ?? a.openedAt,
          ),
        ),
    [comandas],
  );

  const metrics = useMemo(() => {
    const totals = abertas.map((c) => comandaTotal(c));
    const ages = abertas.map((c) => ageMinutes(c.openedAt, now));
    const valorAberto = totals.reduce((s, n) => s + n, 0);
    const tempoMedio =
      ages.length > 0 ? Math.round(ages.reduce((s, n) => s + n, 0) / ages.length) : 0;
    const maisAntiga = ages.length ? Math.max(...ages) : 0;
    const vazias = abertas.filter((c) => comandaItemCount(c) === 0).length;
    return {
      count: abertas.length,
      valorAberto,
      tempoMedio,
      maisAntiga,
      vazias,
      ticketMedio: abertas.length ? valorAberto / abertas.length : 0,
    };
  }, [abertas, now]);

  const closedAvgMinutes = useMemo(() => {
    const closed = historico.filter((c) => c.status === "fechada" && c.closedAt);
    if (!closed.length) return null;
    const mins = closed.map((c) =>
      Math.max(
        0,
        Math.floor(
          (new Date(c.closedAt!).getTime() - new Date(c.openedAt).getTime()) / 60000,
        ),
      ),
    );
    return Math.round(mins.reduce((s, n) => s + n, 0) / mins.length);
  }, [historico]);

  const list = useMemo(() => {
    const base = view === "abertas" ? abertas : historico;
    const q = filter.trim().toLowerCase();
    const filtered = !q
      ? base
      : base.filter((c) => {
          const blob = `${c.number} ${c.code} ${c.customerName ?? ""}`.toLowerCase();
          return blob.includes(q);
        });

    const sorted = filtered.slice();
    if (view === "abertas") {
      if (sort === "tempo") {
        sorted.sort((a, b) => a.openedAt.localeCompare(b.openedAt));
      } else if (sort === "valor") {
        sorted.sort((a, b) => comandaTotal(b) - comandaTotal(a));
      } else {
        sorted.sort((a, b) => a.number.localeCompare(b.number));
      }
    }
    return sorted;
  }, [abertas, filter, historico, sort, view]);

  const selected = useMemo(
    () => (selectedId ? comandas.find((c) => c.id === selectedId) ?? null : null),
    [comandas, selectedId],
  );

  useEffect(() => {
    setEditName(selected?.customerName ?? "");
  }, [selected?.id, selected?.customerName]);

  const addHits = useMemo(() => {
    const q = addQuery.trim();
    if (q.length < 1) return [];
    return products
      .filter((p) => isPosProduct(p) && productMatchesTextSearch(p, q))
      .slice(0, 8);
  }, [addQuery, products]);

  const pushErr = useCallback((msg: string) => {
    setErr(msg);
    setTimeout(() => setErr(null), 5000);
  }, []);

  const openDetail = (id: string) => {
    setSelectedId(id);
    setPayOpen(false);
    setCancelOpen(false);
    setAddQuery("");
  };

  const novaComanda = () => {
    if (!caixaAberto) {
      pushErr("Abra o turno em Turno antes de criar comandas.");
      return;
    }
    const r = createComanda();
    if (!r.ok) {
      pushErr(r.error);
      return;
    }
    printComandaSlip(company, {
      code: r.code,
      number: r.number,
      createdAtISO: r.openedAt,
      customerName: r.customerName,
    });
    openDetail(r.id);
  };

  const pay = async (method: PaymentMethod) => {
    if (!selected || selected.status !== "aberta") return;
    if (selected.split) {
      pushErr("Comanda em divisão — finalize as partes no Caixa.");
      return;
    }
    if (!caixaAberto) {
      pushErr("Abra o turno em Turno antes de receber.");
      return;
    }
    setBusy(true);
    const res = await finalizeComanda(selected.id, method);
    setBusy(false);
    if (!res.ok) {
      pushErr(res.error);
      return;
    }
    setPayOpen(false);
    setSelectedId(null);
  };

  const doCancel = () => {
    if (!selected) return;
    const r = cancelComanda(selected.id, cancelReason.trim() || undefined);
    if (!r.ok) {
      pushErr(r.error);
      return;
    }
    setCancelOpen(false);
    setCancelReason("");
    setSelectedId(null);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-zinc-50">Comandas</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Painel só de tickets · lançamento na Rampa · recebimento no Caixa
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={novaComanda} disabled={!caixaAberto}>
            Nova comanda
          </Button>
          <Link
            href="/rampa"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/10"
          >
            <ChefHat className="h-4 w-4" />
            Ir à Rampa
          </Link>
          <Link
            href="/venda"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/10"
          >
            <ShoppingCart className="h-4 w-4" />
            Ir ao Caixa
          </Link>
        </div>
      </header>

      {/* KPIs */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/45 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Abertas agora
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-zinc-50">{metrics.count}</p>
          <p className="text-xs text-zinc-500">
            {metrics.vazias ? `${metrics.vazias} sem itens` : "todas com itens"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-900/45 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Valor em aberto
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-brand-light">
            {formatBRL(metrics.valorAberto)}
          </p>
          <p className="text-xs text-zinc-500">
            ticket médio {formatBRL(metrics.ticketMedio)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-900/45 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Tempo médio aberto
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-zinc-50">
            {metrics.tempoMedio}
            <span className="ml-1 text-base font-sans font-medium text-zinc-500">min</span>
          </p>
          <p className="text-xs text-zinc-500">
            mais antiga: {metrics.maisAntiga ? `${metrics.maisAntiga} min` : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-900/45 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Permanência (fechadas)
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-zinc-50">
            {closedAvgMinutes ?? "—"}
            {closedAvgMinutes != null && (
              <span className="ml-1 text-base font-sans font-medium text-zinc-500">min</span>
            )}
          </p>
          <p className="text-xs text-zinc-500">média do histórico recente</p>
        </div>
      </div>

      {!caixaAberto && (
        <div className="mb-4 rounded-xl border border-amber-500/35 bg-amber-950/35 px-3 py-2 text-sm text-amber-100">
          Turno fechado — não é possível criar comandas nem receber. Abra em{" "}
          <Link href="/caixa" className="font-semibold underline">
            Turno
          </Link>
          .
        </div>
      )}
      {err && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/45 px-3 py-2 text-sm text-red-100">
          {err}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-white/10 bg-zinc-950/40 p-1">
          <button
            type="button"
            onClick={() => setView("abertas")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
              view === "abertas" ? "bg-brand text-white" : "text-zinc-400 hover:text-zinc-200",
            )}
          >
            Abertas ({metrics.count})
          </button>
          <button
            type="button"
            onClick={() => setView("historico")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
              view === "historico" ? "bg-brand text-white" : "text-zinc-400 hover:text-zinc-200",
            )}
          >
            Histórico
          </button>
        </div>

        {view === "abertas" && (
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="h-9 rounded-xl border border-white/10 bg-zinc-950/50 px-3 text-sm text-zinc-200 outline-none"
          >
            <option value="tempo">Ordenar: mais antiga</option>
            <option value="valor">Ordenar: maior valor</option>
            <option value="numero">Ordenar: número</option>
          </select>
        )}

        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar nº, código ou nome…"
            className="h-9 pl-9"
          />
        </div>
      </div>

      {!list.length ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 px-6 py-16 text-center text-sm text-zinc-500">
          {view === "abertas" ? (
            <>
              Nenhuma comanda aberta. Crie em{" "}
              <button type="button" className="font-semibold text-brand-light" onClick={novaComanda}>
                Nova comanda
              </button>{" "}
              ou lance na{" "}
              <Link href="/rampa" className="font-semibold text-brand-light">
                Rampa
              </Link>
              .
            </>
          ) : (
            "Sem histórico ainda."
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => {
            const total = comandaTotal(c);
            const qty = comandaItemCount(c);
            const mins = ageMinutes(c.openedAt, now);
            const lines = displayLinesForComanda(c, sales).slice(0, 3);
            const lineCount = displayLinesForComanda(c, sales).length;
            const open = c.status === "aberta";

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => openDetail(c.id)}
                className={cn(
                  "rounded-2xl border p-4 text-left transition hover:border-brand/50",
                  selectedId === c.id
                    ? "border-brand bg-brand/10 ring-1 ring-brand/30"
                    : "border-white/10 bg-zinc-900/40",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-2xl tracking-wide text-zinc-50">
                      {c.number}
                    </p>
                    <p className="truncate text-sm text-zinc-300">
                      {c.customerName || "Sem nome"}
                    </p>
                  </div>
                  <div className="text-right">
                    {open ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                          ageTone(mins),
                        )}
                      >
                        <Clock className="h-3 w-3" />
                        {elapsedLabel(c.openedAt, now)}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          c.status === "cancelada"
                            ? "bg-red-500/15 text-red-200"
                            : "bg-zinc-800 text-zinc-300",
                        )}
                      >
                        {c.status === "cancelada" ? "Cancelada" : "Fechada"}
                      </span>
                    )}
                    <p className="mt-2 font-semibold text-brand-light">{formatBRL(total)}</p>
                  </div>
                </div>

                <p className="mt-2 text-xs text-zinc-500">
                  {format(new Date(c.openedAt), "HH:mm", { locale: ptBR })} · {qty} item(ns)
                  {c.split ? " · divisão" : ""}
                  {c.lastPaymentMethod ? ` · ${paymentMethodLabel(c.lastPaymentMethod)}` : ""}
                  <span className="ml-1 font-mono text-zinc-600">{c.code}</span>
                </p>

                <ul className="mt-3 space-y-1 border-t border-white/5 pt-3">
                  {lines.length ? (
                    lines.map((l) => (
                      <li
                        key={l.id}
                        className="flex justify-between gap-2 text-xs text-zinc-400"
                      >
                        <span className="truncate">
                          {l.prefix ? `${l.prefix} ` : ""}
                          {l.name}
                        </span>
                        <span className="shrink-0 tabular-nums">{formatBRL(l.subtotal)}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-zinc-600">
                      {open ? "Sem itens — lance na Rampa" : "Sem detalhe de itens"}
                    </li>
                  )}
                  {lineCount > 3 && (
                    <li className="text-[11px] text-zinc-600">+{lineCount - 3} itens…</li>
                  )}
                </ul>
              </button>
            );
          })}
        </div>
      )}

      {/* Drawer detalhe */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/50">
          <button
            type="button"
            className="h-full flex-1 cursor-default"
            aria-label="Fechar"
            onClick={() => setSelectedId(null)}
          />
          <aside className="flex h-full w-full max-w-md flex-col border-l border-zinc-700 bg-[#141619] shadow-2xl">
            <div className="flex items-start justify-between gap-2 border-b border-zinc-800 px-4 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                  Comanda
                </p>
                <p className="font-mono text-3xl font-bold text-zinc-50">{selected.number}</p>
                <p className="font-mono text-xs text-zinc-500">{selected.code}</p>
                {selected.status === "aberta" && (
                  <p className="mt-1 text-xs text-zinc-400">
                    Aberta há {elapsedLabel(selected.openedAt, now)} ·{" "}
                    {format(new Date(selected.openedAt), "HH:mm", { locale: ptBR })}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800"
                onClick={() => setSelectedId(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 border-b border-zinc-800 px-4 py-3">
              <Input
                value={editName}
                disabled={selected.status !== "aberta"}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => {
                  if (selected.status === "aberta") {
                    setComandaCustomerName(selected.id, editName);
                  }
                }}
                placeholder="Nome do cliente (opcional)"
                className="h-9"
              />

              {selected.status === "aberta" && (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/rampa?comanda=${selected.id}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand/40 bg-brand/15 px-3 py-2 text-sm font-semibold text-brand-light hover:bg-brand/25"
                  >
                    <ChefHat className="h-4 w-4" />
                    Lançar na Rampa
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href={`/venda?comanda=${selected.id}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/10"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Receber no Caixa
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {(() => {
                const lines = displayLinesForComanda(selected, sales);
                const total = comandaTotal(selected);
                const isOpen = selected.status === "aberta";
                return (
                  <>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {isOpen ? "Itens" : "Produtos consumidos"} · {formatBRL(total)}
              </p>
              {!lines.length ? (
                <p className="rounded-xl border border-dashed border-zinc-700 px-3 py-8 text-center text-xs text-zinc-500">
                  {isOpen
                    ? "Sem itens. Use a Rampa ou adicione abaixo."
                    : "Não há registro dos itens desta comanda."}
                </p>
              ) : (
                <ul className="space-y-2">
                  {lines.map((l) => {
                    const cartLine = isOpen
                      ? activeLines(selected).find((x) => x.id === l.id)
                      : snapshotLines(selected).find((x) => x.id === l.id);
                    return (
                    <li
                      key={l.id}
                      className="rounded-xl border border-white/10 bg-zinc-950/35 px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-100">{l.name}</p>
                          <p className="text-[11px] text-zinc-500">
                            {l.detail ?? (l.prefix ?? "—")}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-zinc-100">
                          {formatBRL(l.subtotal)}
                        </span>
                      </div>
                      {isOpen && !selected.split && cartLine && !cartLine.grams && (
                        <div className="mt-2 flex items-center gap-1">
                          <button
                            type="button"
                            className="rounded border border-zinc-600 p-1"
                            onClick={() => decComandaLine(selected.id, cartLine.id)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-xs">{cartLine.quantity}</span>
                          <button
                            type="button"
                            className="rounded border border-zinc-600 p-1"
                            onClick={() => {
                              const r = incComandaLine(selected.id, cartLine.id);
                              if (!r.ok) pushErr(r.error);
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="ml-auto rounded p-1 text-zinc-500 hover:text-red-400"
                            onClick={() => removeLineFromComanda(selected.id, cartLine.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </li>
                    );
                  })}
                </ul>
              )}

              {isOpen && !selected.split && (
                <div className="mt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Adicionar item rápido
                  </p>
                  <Input
                    value={addQuery}
                    onChange={(e) => setAddQuery(e.target.value)}
                    placeholder="Buscar produto…"
                    className="h-9"
                  />
                  {addHits.length > 0 && (
                    <ul className="mt-1 max-h-40 overflow-auto rounded-xl border border-zinc-700 bg-zinc-900">
                      {addHits.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-800"
                            onClick={() => {
                              const r = addProductToComanda(selected.id, p.id, 1);
                              if (!r.ok) pushErr(r.error);
                              else setAddQuery("");
                            }}
                          >
                            <span>{p.name}</span>
                            <span className="text-brand-light">
                              {formatBRL(effectiveUnitPrice(p))}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {selected.status === "fechada" && selected.lastPaymentMethod && (
                <p className="mt-4 rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-300">
                  Pago com {paymentMethodLabel(selected.lastPaymentMethod)}
                  {selected.closedAt
                    ? ` · ${format(new Date(selected.closedAt), "dd/MM HH:mm", { locale: ptBR })}`
                    : ""}
                </p>
              )}

              {selected.status === "cancelada" && (
                <p className="mt-4 rounded-xl border border-red-500/30 bg-red-950/30 px-3 py-2 text-xs text-red-100">
                  Cancelada
                  {selected.cancelledByName ? ` por ${selected.cancelledByName}` : ""}
                  {selected.cancelReason ? ` · ${selected.cancelReason}` : ""}
                </p>
              )}
                  </>
                );
              })()}
            </div>

            {selected.status === "aberta" && (
              <div className="space-y-2 border-t border-zinc-800 px-4 py-3">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() =>
                      printComandaSlip(company, {
                        code: selected.code,
                        number: selected.number,
                        createdAtISO: selected.openedAt,
                        customerName: selected.customerName,
                      })
                    }
                  >
                    <Printer className="h-4 w-4" />
                    Ticket
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-brand hover:bg-brand-light"
                    disabled={!caixaAberto || !activeLines(selected).length || Boolean(selected.split)}
                    onClick={() => setPayOpen(true)}
                  >
                    Receber aqui
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="danger"
                  className="w-full"
                  onClick={() => setCancelOpen(true)}
                >
                  Excluir comanda (registrado)
                </Button>
              </div>
            )}
          </aside>
        </div>
      )}

      {payOpen && selected?.status === "aberta" && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-600 bg-zinc-900 p-5">
            <h3 className="font-display text-lg font-semibold text-zinc-50">
              Receber comanda {selected.number}
            </h3>
            <p className="mt-2 font-display text-3xl font-bold text-brand-light">
              {formatBRL(comandaTotal(selected))}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {PAY_METHODS.map((id) => (
                <button
                  key={id}
                  type="button"
                  disabled={busy}
                  onClick={() => void pay(id)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-2xl border-2 px-3 py-3 text-sm font-medium disabled:opacity-50",
                    PAY_BTN[id],
                  )}
                >
                  <PaymentMethodIcon method={id} className="h-4 w-4" />
                  {paymentMethodLabel(id)}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              className="mt-3 w-full text-zinc-400"
              onClick={() => setPayOpen(false)}
            >
              Voltar
            </Button>
          </div>
        </div>
      )}

      {cancelOpen && selected?.status === "aberta" && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-600 bg-zinc-900 p-5">
            <h3 className="font-display text-lg font-semibold text-zinc-50">
              Excluir comanda {selected.number}?
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              A comanda sai das abertas, mas fica no histórico com quem excluiu e o motivo.
            </p>
            <Input
              className="mt-3"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Motivo (opcional)"
            />
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setCancelOpen(false)}
              >
                Voltar
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-500" onClick={doCancel}>
                Confirmar exclusão
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
