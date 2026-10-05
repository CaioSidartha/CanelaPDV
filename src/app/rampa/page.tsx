"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Minus, Plus, Printer, Scale, Search, Trash2, X } from "lucide-react";
import { ProductThumb } from "@/components/product/ProductThumb";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ComandaTicketPreviewModal } from "@/components/comanda/ComandaTicketPreviewModal";
import type { ComandaSlip } from "@/lib/comanda-print";
import { readScaleWeight } from "@/lib/hardware/scale";
import { newEntityId } from "@/lib/id";
import {
  BARCODE_SCAN_COOLDOWN_MS,
  effectiveUnitPrice,
  findActiveProductByBarcode,
  productMatchesTextSearch,
} from "@/lib/product-catalog";
import { getActiveCashSession } from "@/lib/cash-analytics";
import { isPosProduct } from "@/lib/stock-usage";
import { useBarcodeScanner } from "@/lib/useBarcodeScanner";
import { cn, formatBRL } from "@/lib/utils";
import { qtyInCartForProduct, useAppStore, validateLinesStock } from "@/store/useAppStore";
import type { CartLine, Product } from "@/types";

function mergeDraft(prev: CartLine[], incoming: CartLine): CartLine[] {
  const same = prev.find(
    (l) =>
      l.productId &&
      l.productId === incoming.productId &&
      !l.grams &&
      !l.weightConfigId &&
      !incoming.grams &&
      !incoming.weightConfigId,
  );
  if (same) {
    return prev.map((l) =>
      l.id === same.id
        ? {
            ...l,
            quantity: l.quantity + incoming.quantity,
            subtotal: l.unitPrice * (l.quantity + incoming.quantity),
          }
        : l,
    );
  }
  return [...prev, incoming];
}

export default function RampaPage() {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const lastScanRef = useRef<{ at: number; raw: string }>({ at: 0, raw: "" });
  const openedFromQueryRef = useRef<string | null>(null);

  const [search, setSearch] = useState("");
  const [grams, setGrams] = useState("");
  const [weightId, setWeightId] = useState("");
  const [scaleReading, setScaleReading] = useState(false);
  const [scaleHint, setScaleHint] = useState<string | null>(null);
  const [draft, setDraft] = useState<CartLine[]>([]);
  const [editingComandaId, setEditingComandaId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [comandaFilter, setComandaFilter] = useState("");
  const [ticketPreview, setTicketPreview] = useState<ComandaSlip | null>(null);

  const company = useAppStore((s) => s.company);
  const products = useAppStore((s) => s.products);
  const weightPrices = useAppStore((s) => s.weightPrices);
  const hardware = useAppStore((s) => s.hardware);
  const comandas = useAppStore((s) => s.comandas);
  const cashSessions = useAppStore((s) => s.cashSessions);
  const caixaAberto = useMemo(
    () => getActiveCashSession(cashSessions) != null,
    [cashSessions],
  );
  const sendLinesToComanda = useAppStore((s) => s.sendLinesToComanda);
  const addProductToComanda = useAppStore((s) => s.addProductToComanda);
  const incComandaLine = useAppStore((s) => s.incComandaLine);
  const decComandaLine = useAppStore((s) => s.decComandaLine);
  const removeLineFromComanda = useAppStore((s) => s.removeLineFromComanda);
  const importCartLines = useAppStore((s) => s.importCartLines);

  const activeWeights = weightPrices.filter((w) => w.active);
  const selectedWeight = activeWeights.find((w) => w.id === weightId) ?? activeWeights[0];

  useEffect(() => {
    if (!weightId && selectedWeight) setWeightId(selectedWeight.id);
  }, [selectedWeight, weightId]);

  const editing = useMemo(
    () => (editingComandaId ? comandas.find((c) => c.id === editingComandaId) ?? null : null),
    [comandas, editingComandaId],
  );

  useEffect(() => {
    if (editingComandaId && (!editing || editing.status !== "aberta")) {
      setEditingComandaId(null);
    }
  }, [editing, editingComandaId]);

  useEffect(() => {
    if (editing) setCustomerName(editing.customerName ?? "");
  }, [editing?.id]);

  const gramsNum = Number(grams.replace(",", ".")) || 0;
  const previewWeight =
    selectedWeight && gramsNum > 0 ? (gramsNum / 1000) * selectedWeight.pricePerKg : 0;

  const filtered = useMemo(() => {
    const q = search.trim();
    return products.filter(
      (p) => isPosProduct(p) && productMatchesTextSearch(p, q),
    );
  }, [products, search]);

  const openComandas = useMemo(() => {
    const q = comandaFilter.trim().toLowerCase();
    return comandas
      .filter((c) => c.status === "aberta" && !c.split)
      .filter((c) => {
        if (!q) return true;
        return (
          c.number.includes(q) ||
          c.code.toLowerCase().includes(q) ||
          (c.customerName ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  }, [comandas, comandaFilter]);

  const draftTotal = draft.reduce((s, l) => s + l.subtotal, 0);
  const draftCount = draft.reduce((n, l) => n + (l.grams ? 1 : l.quantity), 0);
  const editingTotal = editing?.lines.reduce((s, l) => s + l.subtotal, 0) ?? 0;

  const pushErr = useCallback((msg: string) => {
    setErr(msg);
    setTimeout(() => setErr(null), 5000);
  }, []);

  const pushOk = useCallback((msg: string) => {
    setOkMsg(msg);
    setTimeout(() => setOkMsg(null), 4000);
  }, []);

  const goToCaixa = useCallback(() => {
    if (!draft.length) {
      router.push("/venda");
      return;
    }
    const res = importCartLines(draft);
    if (!res.ok) {
      pushErr(res.error ?? "Não foi possível enviar os itens ao caixa.");
      return;
    }
    setDraft([]);
    router.push("/venda");
  }, [draft, importCartLines, pushErr, router]);

  const focusSearch = useCallback(() => {
    requestAnimationFrame(() => searchRef.current?.focus());
  }, []);

  const clearDraft = useCallback(() => {
    setDraft([]);
    setGrams("");
    setCustomerName(editing ? editing.customerName ?? "" : "");
    focusSearch();
  }, [editing, focusSearch]);

  const stopEditing = useCallback(() => {
    setEditingComandaId(null);
    setCustomerName("");
    setDraft([]);
    openedFromQueryRef.current = null;
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("comanda")) {
        url.searchParams.delete("comanda");
        window.history.replaceState({}, "", `${url.pathname}${url.search}`);
      }
    }
    focusSearch();
  }, [focusSearch]);

  const startEditing = useCallback(
    (id: string) => {
      setEditingComandaId(id);
      setDraft([]);
      focusSearch();
    },
    [focusSearch],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("comanda");
    if (!id || openedFromQueryRef.current === id) return;
    const target = comandas.find((c) => c.id === id && c.status === "aberta");
    if (!target) return;
    openedFromQueryRef.current = id;
    startEditing(id);
  }, [comandas, startEditing]);

  const addProductUnit = useCallback(
    (product: Product, qty = 1) => {
      if (editing) {
        if (editing.split) {
          pushErr("Comanda em divisão — use a tela de Comandas.");
          return;
        }
        const r = addProductToComanda(editing.id, product.id, qty);
        if (!r.ok) pushErr(r.error);
        else pushOk(`+ ${product.name} na comanda ${editing.number}`);
        focusSearch();
        return;
      }

      if (product.trackStock !== false) {
        const inDraft = qtyInCartForProduct(draft, product.id);
        if (inDraft + qty > (product.stockQty ?? 0)) {
          pushErr(`Estoque insuficiente para "${product.name}".`);
          return;
        }
      }
      const unit = effectiveUnitPrice(product);
      const incoming: CartLine = {
        id: newEntityId(),
        productId: product.id,
        name: product.name,
        unitPrice: unit,
        quantity: qty,
        subtotal: unit * qty,
      };
      const next = mergeDraft(draft, incoming);
      const v = validateLinesStock(products, next);
      if (v) {
        pushErr(v);
        return;
      }
      setDraft(next);
      focusSearch();
    },
    [addProductToComanda, draft, editing, focusSearch, products, pushErr, pushOk],
  );

  const addWeightLine = useCallback(() => {
    if (!selectedWeight || gramsNum <= 0) {
      pushErr("Informe o peso em gramas.");
      return;
    }
    const subtotal = Math.round((gramsNum / 1000) * selectedWeight.pricePerKg * 100) / 100;
    const line: CartLine = {
      id: newEntityId(),
      weightConfigId: selectedWeight.id,
      name: selectedWeight.label,
      unitPrice: selectedWeight.pricePerKg,
      quantity: 1,
      grams: gramsNum,
      subtotal,
    };

    if (editing) {
      const r = sendLinesToComanda([line], { comandaId: editing.id });
      if (!r.ok) pushErr(r.error);
      else {
        pushOk(`Peso lançado na comanda ${editing.number}`);
        setGrams("");
        setScaleHint(null);
      }
      focusSearch();
      return;
    }

    setDraft((prev) => [...prev, line]);
    setGrams("");
    setScaleHint(null);
    focusSearch();
  }, [editing, focusSearch, gramsNum, pushErr, pushOk, selectedWeight, sendLinesToComanda]);

  const readFromScale = useCallback(async () => {
    if (!selectedWeight) {
      pushErr("Escolha a tarifa (produto no peso) antes.");
      return;
    }
    setScaleReading(true);
    setScaleHint("Esperando estabilizar…");
    setErr(null);
    const res = await readScaleWeight(hardware);
    setScaleReading(false);
    if (!res.ok) {
      setScaleHint(null);
      pushErr(res.error);
      return;
    }
    setGrams(String(res.grams));
    setScaleHint(
      res.simulated
        ? `Simulação · ${res.grams} g — confira e toque em OK`
        : `Balança · ${res.grams} g${res.stable ? " estável" : ""} — OK para lançar`,
    );
  }, [hardware, pushErr, selectedWeight]);

  const tryBarcode = useCallback(
    (raw: string) => {
      const code = raw.trim();
      if (!code) return false;
      const now = Date.now();
      if (
        lastScanRef.current.raw === code &&
        now - lastScanRef.current.at < BARCODE_SCAN_COOLDOWN_MS
      ) {
        setSearch("");
        return true;
      }
      const hit = findActiveProductByBarcode(products, code);
      if (!hit) {
        pushErr(`Código sem produto: ${code}`);
        return false;
      }
      lastScanRef.current = { at: now, raw: code };
      addProductUnit(hit, 1);
      setSearch("");
      return true;
    },
    [addProductUnit, products, pushErr],
  );

  useBarcodeScanner({
    debugName: "rampa",
    enabled: caixaAberto,
    allowedInputIds: ["campo-busca-rampa"],
    onScan: (code) => {
      void tryBarcode(code);
    },
  });

  const emitOrUpdate = useCallback(() => {
    if (editing) {
      if (draft.length) {
        const r = sendLinesToComanda(draft, {
          comandaId: editing.id,
          customerName: customerName || undefined,
        });
        if (!r.ok) {
          pushErr(r.error);
          return;
        }
        pushOk(`Itens adicionados na comanda ${r.number}. Lançamento concluído.`);
      } else {
        if (customerName.trim() && customerName.trim() !== (editing.customerName ?? "")) {
          useAppStore.getState().setComandaCustomerName(editing.id, customerName);
        }
        pushOk(
          `Comanda ${editing.number} atualizada. Cliente pode ir à mesa ou ao caixa.`,
        );
      }
      // Sai do modo edição pra não continuar lançando na mesma comanda sem querer
      stopEditing();
      return;
    }

    if (!draft.length) {
      pushErr("Adicione itens antes de emitir a comanda.");
      return;
    }
    const r = sendLinesToComanda(draft, { customerName: customerName || undefined });
    if (!r.ok) {
      pushErr(r.error);
      return;
    }
    setDraft([]);
    setCustomerName("");
    setEditingComandaId(null);
    setTicketPreview({
      code: r.code,
      number: r.number,
      createdAtISO: new Date().toISOString(),
      customerName: customerName || undefined,
    });
    pushOk(`Comanda ${r.number} emitida`);
    focusSearch();
  }, [
    customerName,
    draft,
    editing,
    focusSearch,
    pushErr,
    pushOk,
    sendLinesToComanda,
    stopEditing,
  ]);

  const reprint = useCallback(() => {
    if (!editing) return;
    setTicketPreview({
      code: editing.code,
      number: editing.number,
      createdAtISO: editing.openedAt,
      customerName: editing.customerName,
    });
  }, [editing]);

  return (
    <div className="relative flex h-screen flex-col lg:flex-row">
      <ComandaTicketPreviewModal
        open={ticketPreview != null}
        company={company}
        slip={ticketPreview}
        onClose={() => setTicketPreview(null)}
      />
      {/* Catálogo */}
      <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5 lg:p-6">
        <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl text-zinc-50">Rampa</h1>
            <p className="text-sm text-zinc-500">
              Pesar, contar e emitir comanda · pagamento no Caixa
            </p>
          </div>
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              id="campo-busca-rampa"
              ref={searchRef}
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (tryBarcode(search)) return;
                const q = search.trim();
                if (!q) return;
                const hits = filtered;
                if (hits.length === 1) addProductUnit(hits[0]!, 1);
                else if (!hits.length) pushErr("Nenhum produto encontrado.");
              }}
              placeholder="Buscar ou código de barras + Enter"
              className="pl-10"
            />
          </div>
        </header>

        {(err || okMsg) && (
          <div
            className={cn(
              "mb-3 rounded-xl border px-3 py-2 text-sm",
              err
                ? "border-red-500/40 bg-red-950/45 text-red-100"
                : "border-emerald-500/35 bg-emerald-950/40 text-emerald-100",
            )}
          >
            {err ?? okMsg}
          </div>
        )}

        <section className="mb-4 rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-zinc-100">Itens por peso</p>
            <p className="text-[11px] text-zinc-500">
              1) tarifa · 2) esvaziar balança · 3) ler · 4) OK
            </p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-zinc-500">Tarifa</label>
              <select
                className="w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-brand/50"
                value={selectedWeight?.id ?? ""}
                onChange={(e) => {
                  setWeightId(e.target.value);
                  setGrams("");
                  setScaleHint(null);
                }}
              >
                {activeWeights.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label} — {formatBRL(w.pricePerKg)}/kg
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full md:w-40">
              <label className="mb-1 block text-xs text-zinc-500">Peso (g)</label>
              <Input
                inputMode="decimal"
                value={grams}
                onChange={(e) => {
                  setGrams(e.target.value);
                  setScaleHint(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addWeightLine();
                  }
                }}
                placeholder="—"
              />
            </div>
            <div>
              <span className="text-xs text-zinc-500">Prévia</span>
              <p className="text-lg font-semibold text-brand-light">{formatBRL(previewWeight)}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={scaleReading || !hardware.scale.enabled}
              onClick={() => void readFromScale()}
              title={
                hardware.scale.enabled
                  ? "Ler peso da balança"
                  : "Ative a balança em Configurações → Hardwares"
              }
            >
              {scaleReading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Scale className="h-4 w-4" />
              )}
              {scaleReading ? "Lendo…" : "Ler balança"}
            </Button>
            <Button type="button" onClick={addWeightLine} disabled={gramsNum <= 0}>
              OK · Adicionar
            </Button>
          </div>
          {scaleHint && (
            <p className="mt-3 rounded-xl border border-brand/25 bg-brand/10 px-3 py-2 text-sm text-brand-light">
              {scaleHint}
            </p>
          )}
        </section>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => {
              const avail =
                p.trackStock === false
                  ? null
                  : (p.stockQty ?? 0) - qtyInCartForProduct(draft, p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addProductUnit(p, 1)}
                  className="relative flex min-h-[88px] flex-col rounded-lg border border-white/10 bg-zinc-900/45 p-3 pr-12 text-left transition hover:border-brand/50 hover:bg-zinc-800/50 active:scale-[0.99]"
                >
                  <div className="absolute right-2 top-2">
                    <ProductThumb imageUrl={p.imageUrl} name={p.name} size={34} />
                  </div>
                  <span className="line-clamp-2 text-sm font-medium text-zinc-100">{p.name}</span>
                  <span className="mt-2 font-semibold text-brand-light">
                    {formatBRL(effectiveUnitPrice(p))}
                  </span>
                  {avail != null && (
                    <span className="mt-1 text-[11px] text-zinc-500">Disp: {avail}</span>
                  )}
                </button>
              );
            })}
          </div>
          {!filtered.length && (
            <p className="py-10 text-center text-sm text-zinc-500">Nenhum produto encontrado.</p>
          )}
        </div>
      </div>

      {/* Painel direito */}
      <aside className="flex w-full shrink-0 flex-col border-t border-zinc-800 bg-[#141619] lg:w-[380px] lg:border-l lg:border-t-0">
        <div className="border-b border-zinc-800 px-4 py-3">
          {editing ? (
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                  Editando comanda
                </p>
                <p className="font-mono text-2xl font-bold text-zinc-50">{editing.number}</p>
                <p className="text-xs text-zinc-500">
                  {format(new Date(editing.openedAt), "HH:mm", { locale: ptBR })} ·{" "}
                  {formatBRL(editingTotal)}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                onClick={stopEditing}
                title="Voltar para nova comanda"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Nova comanda
              </p>
              <p className="text-sm text-zinc-300">Monte os itens e emita o ticket</p>
            </div>
          )}
          <Input
            className="mt-2 h-9 bg-zinc-950/40 text-sm"
            placeholder="Nome do cliente (opcional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            onBlur={() => {
              if (editing && customerName.trim() !== (editing.customerName ?? "")) {
                useAppStore.getState().setComandaCustomerName(editing.id, customerName);
              }
            }}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {editing && (
            <div className="mb-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Já na comanda
              </p>
              {!editing.lines.length ? (
                <p className="text-xs text-zinc-500">Sem itens ainda.</p>
              ) : (
                <ul className="space-y-1.5">
                  {editing.lines.map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-zinc-100">{l.name}</p>
                        <p className="text-[11px] text-zinc-500">
                          {l.grams ? `${l.grams}g` : `${l.quantity}×`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {!l.grams && !l.weightConfigId && (
                          <>
                            <button
                              type="button"
                              className="rounded border border-zinc-600 p-0.5"
                              onClick={() => decComandaLine(editing.id, l.id)}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              className="rounded border border-zinc-600 p-0.5"
                              onClick={() => {
                                const r = incComandaLine(editing.id, l.id);
                                if (!r.ok) pushErr(r.error);
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="rounded p-1 text-zinc-500 hover:text-red-400"
                          onClick={() => removeLineFromComanda(editing.id, l.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-14 text-right text-xs font-semibold">
                          {formatBRL(l.subtotal)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              {editing ? "Pendentes de enviar" : "Itens"}
            </p>
            <span className="text-xs text-zinc-500">{draftCount} item(ns)</span>
          </div>
          {!draft.length ? (
            <p className="rounded-xl border border-dashed border-zinc-700 px-3 py-6 text-center text-xs text-zinc-500">
              {editing
                ? "Clique nos cards ou pese itens — entram direto na comanda (unidade) ou aqui (peso em lote)."
                : "Clique nos produtos ou adicione peso para montar a comanda."}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {draft.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-brand/25 bg-brand/10 px-2.5 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate text-zinc-100">{l.name}</p>
                    <p className="text-[11px] text-zinc-400">
                      {l.grams ? `${l.grams}g` : `${l.quantity}× ${formatBRL(l.unitPrice)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!l.grams && (
                      <>
                        <button
                          type="button"
                          className="rounded border border-zinc-600 p-0.5"
                          onClick={() =>
                            setDraft((prev) =>
                              prev
                                .map((x) => {
                                  if (x.id !== l.id) return x;
                                  const q = x.quantity - 1;
                                  if (q <= 0) return null;
                                  return { ...x, quantity: q, subtotal: x.unitPrice * q };
                                })
                                .filter(Boolean) as CartLine[],
                            )
                          }
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          className="rounded border border-zinc-600 p-0.5"
                          onClick={() => {
                            const p = l.productId
                              ? products.find((x) => x.id === l.productId)
                              : undefined;
                            if (p) addProductUnit(p, 1);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="rounded p-1 text-zinc-500 hover:text-red-400"
                      onClick={() => setDraft((prev) => prev.filter((x) => x.id !== l.id))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-14 text-right text-xs font-semibold">
                      {formatBRL(l.subtotal)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-zinc-800 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-zinc-400">
              {editing ? "Total comanda" : "Subtotal"}
            </span>
            <span className="font-display text-2xl font-bold text-brand-light">
              {formatBRL(editing ? editingTotal + draftTotal : draftTotal)}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="w-full bg-brand hover:bg-brand-light"
              onClick={emitOrUpdate}
              disabled={!caixaAberto || (!editing && !draft.length)}
            >
              {editing
                ? draft.length
                  ? "Enviar itens à comanda"
                  : "Concluir lançamento"
                : "Emitir comanda + imprimir"}
            </Button>
            <div className="flex gap-2">
              {editing ? (
                <Button type="button" variant="secondary" className="flex-1" onClick={reprint}>
                  <Printer className="h-4 w-4" />
                  Reimprimir
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={clearDraft}
                  disabled={!draft.length}
                >
                  Limpar
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={goToCaixa}
              >
                Ir ao Caixa
              </Button>
            </div>
          </div>
        </div>

        <div className="max-h-[34vh] border-t border-zinc-800">
          <div className="flex items-center justify-between px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Comandas abertas
            </p>
            <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[11px] font-bold text-brand-light">
              {openComandas.length}
            </span>
          </div>
          <div className="px-3 pb-2">
            <Input
              value={comandaFilter}
              onChange={(e) => setComandaFilter(e.target.value)}
              placeholder="Buscar nº ou nome…"
              className="h-8 text-xs"
            />
          </div>
          <div className="max-h-[22vh] space-y-1.5 overflow-y-auto px-3 pb-3">
            {openComandas.map((c) => {
              const sub = c.lines.reduce((s, l) => s + l.subtotal, 0);
              const active = c.id === editingComandaId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => startEditing(c.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-left transition",
                    active
                      ? "border-brand bg-brand/15"
                      : "border-white/10 bg-zinc-950/30 hover:border-brand/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold text-zinc-50">{c.number}</p>
                      <p className="truncate text-xs text-zinc-400">
                        {c.customerName || "Sem nome"} ·{" "}
                        {format(new Date(c.openedAt), "HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-brand-light">{formatBRL(sub)}</p>
                  </div>
                </button>
              );
            })}
            {!openComandas.length && (
              <p className="py-4 text-center text-xs text-zinc-500">Nenhuma aberta agora.</p>
            )}
          </div>
        </div>
      </aside>

      {!caixaAberto && (
        <Link
          href="/caixa"
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/88 p-6 backdrop-blur-[2px]"
          aria-label="Abrir turno para emitir comandas"
        >
          <div className="max-w-lg rounded-2xl border border-amber-500/35 bg-zinc-950/95 px-10 py-12 text-center shadow-2xl transition hover:border-amber-400/55">
            <p className="font-display text-3xl text-zinc-50">Turno fechado</p>
            <p className="mt-4 text-base leading-relaxed text-zinc-400">
              Abra o caixa em Turno para emitir ou alterar comandas na rampa.
            </p>
            <p className="mt-8 text-sm font-semibold text-brand-light">Toque aqui para abrir o turno</p>
          </div>
        </Link>
      )}
    </div>
  );
}
