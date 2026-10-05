"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NEAR_EXPIRY_DAYS } from "@/lib/stock-validity";
import type { Product } from "@/types";

type RemessaDraft = { barcode: string; expiresAt?: string };

export function QuickReceiveModal({
  open,
  products,
  categories,
  onClose,
  onConfirm,
}: {
  open: boolean;
  products: Product[];
  categories: { id: string; name: string }[];
  onClose: () => void;
  onConfirm: (
    productId: string,
    entries: { barcode: string; qty: number; expiresAt?: string }[],
    note?: string,
  ) => void;
}) {
  const tracked = useMemo(
    () => products.filter((p) => p.trackStock !== false).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [products],
  );
  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const [productId, setProductId] = useState("");
  const [supplier, setSupplier] = useState("");
  const [qtyPerRemessa, setQtyPerRemessa] = useState("12");
  const [numRemessas, setNumRemessas] = useState("1");
  const [remessas, setRemessas] = useState<RemessaDraft[]>([{ barcode: "", expiresAt: "" }]);
  const [err, setErr] = useState<string | null>(null);

  const reset = useCallback(() => {
    setProductId(tracked[0]?.id ?? "");
    setSupplier("");
    setQtyPerRemessa("12");
    setNumRemessas("1");
    setRemessas([{ barcode: "", expiresAt: "" }]);
    setErr(null);
  }, [tracked]);

  useEffect(() => {
    if (!open) return;
    reset();
  }, [open, reset]);

  const nRem = Math.max(1, Math.min(50, Math.floor(Number(numRemessas) || 1)));
  const qtyEach = Math.max(1, Math.floor(Number(String(qtyPerRemessa).replace(",", ".")) || 1));

  useEffect(() => {
    setRemessas((prev) => {
      const next = [...prev];
      while (next.length < nRem) next.push({ barcode: "", expiresAt: "" });
      while (next.length > nRem) next.pop();
      return next;
    });
  }, [nRem]);

  const product = tracked.find((p) => p.id === productId);

  const updateRemessa = (idx: number, patch: Partial<RemessaDraft>) => {
    setRemessas((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
  };

  const submit = () => {
    setErr(null);
    if (!productId) {
      setErr("Selecione um produto contabilizado.");
      return;
    }
    const entries = remessas
      .map((r) => ({
        barcode: (r.barcode ?? "").trim(),
        qty: qtyEach,
        expiresAt: r.expiresAt?.trim() || undefined,
      }))
      .filter((r) => r.barcode.length > 0);
    if (entries.length !== nRem) {
      setErr("Preencha o código de barras de todas as remessas.");
      return;
    }
    const dup = new Set<string>();
    for (const e of entries) {
      if (dup.has(e.barcode)) {
        setErr("Há códigos de barras repetidos nesta entrada. Cada remessa deve ter um código único.");
        return;
      }
      dup.add(e.barcode);
    }
    const note = [supplier.trim() ? `Fornecedor: ${supplier.trim()}` : null]
      .filter(Boolean)
      .join(" · ");
    onConfirm(productId, entries, note || undefined);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="panel-glass max-h-[92vh] w-full max-w-lg overflow-y-auto p-6 shadow-2xl">
        <div className="panel-glass-inner">
          <h2 className="font-display text-xl font-semibold text-zinc-100">Adição rápida — remessas</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Entrada no formato de nota: selecione o produto, informe quantas remessas chegaram e preencha
            1 código (EAN) + validade por remessa. Fornecedor é opcional.
          </p>

          {err && (
            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-100">
              {err}
            </div>
          )}

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-500">Produto (com estoque)</label>
              <select
                className="w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-brand focus:ring-2 focus:ring-orange-500/25"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                {tracked.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {catName.get(p.categoryId) ?? "—"}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-500">Unidades por remessa</label>
                <Input
                  inputMode="numeric"
                  value={qtyPerRemessa}
                  onChange={(e) => setQtyPerRemessa(e.target.value)}
                  placeholder="ex: 12"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-500">Qtd de remessas</label>
                <Input
                  inputMode="numeric"
                  value={numRemessas}
                  onChange={(e) => setNumRemessas(e.target.value)}
                  placeholder="ex: 2"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-500">Fornecedor (opcional)</label>
              <Input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Ex.: Frigorífico X / Distribuidora Y"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">
                    Remessas {product ? `— ${product.name}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Preencha 1 código por remessa (use leitor no campo) e a validade (se aplicável). Alerta
                    de “próximo a vencer” usa {NEAR_EXPIRY_DAYS} dias.
                  </p>
                </div>
                <div className="shrink-0 rounded-xl border border-white/10 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-300">
                  <span className="font-semibold">{qtyEach}</span> un./remessa
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {remessas.map((r, idx) => (
                  <div
                    key={idx}
                    className="grid gap-2 rounded-xl border border-white/10 bg-zinc-950/40 p-3 sm:grid-cols-3"
                  >
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        Código de barras (remessa {idx + 1})
                      </label>
                      <Input
                        className="font-mono"
                        value={r.barcode ?? ""}
                        onChange={(e) => updateRemessa(idx, { barcode: e.target.value })}
                        placeholder="EAN da caixa / lote…"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        Validade (opcional)
                      </label>
                      <Input
                        type="date"
                        value={r.expiresAt ?? ""}
                        onChange={(e) => updateRemessa(idx, { expiresAt: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" onClick={submit} disabled={!tracked.length}>
                Confirmar entrada
              </Button>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
