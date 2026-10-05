"use client";

import { useState } from "react";
import { PackageCheck, X } from "lucide-react";
import { PackageToStockFields } from "@/components/estoque/PackageToStockFields";
import { UsageSelect } from "@/components/estoque/UsageSelect";
import { Button } from "@/components/ui/Button";
import {
  parseUnitsPerPackage,
  stockQtyFromPackages,
  suggestUnitsPerNfUnit,
} from "@/lib/stock-package-entry";
import { STOCK_USAGE_LABEL, productUsage } from "@/lib/stock-usage";
import { useAppStore } from "@/store/useAppStore";
import type { GoodsReceipt, StockUsage } from "@/types";

export function PostReceiptModal({
  receipt,
  supplierName,
  onClose,
}: {
  receipt: GoodsReceipt;
  supplierName: string;
  onClose: () => void;
}) {
  const postGoodsReceipt = useAppStore((s) => s.postGoodsReceipt);
  const products = useAppStore((s) => s.products);
  const [unitsPer, setUnitsPer] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      receipt.itens.map((item) => [
        item.id,
        String(
          item.unitsPerNfUnit ??
            suggestUnitsPerNfUnit(item.descricaoNota, undefined, item.unidade),
        ),
      ]),
    ),
  );
  const [stockQty, setStockQty] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      receipt.itens.map((item) => {
        const factor = item.unitsPerNfUnit ?? 1;
        const expected = stockQtyFromPackages(item.quantidade, factor);
        return [item.id, String(expected)];
      }),
    ),
  );
  const [usage, setUsage] = useState<Record<string, StockUsage>>(() =>
    Object.fromEntries(
      receipt.itens.map((item) => {
        const product = products.find((row) => row.id === item.productId);
        return [item.id, item.usage ?? productUsage(product ?? {})];
      }),
    ),
  );
  const [err, setErr] = useState<string | null>(null);

  const onUnitsChange = (itemId: string, itemQty: number, value: string) => {
    setUnitsPer((prev) => ({ ...prev, [itemId]: value }));
    const factor = parseUnitsPerPackage(value, 1);
    setStockQty((prev) => ({ ...prev, [itemId]: String(stockQtyFromPackages(itemQty, factor)) }));
  };

  const confirm = () => {
    const received = receipt.itens.map((item) => ({
      itemId: item.id,
      quantidade: Number(String(stockQty[item.id] ?? "").replace(",", ".")),
      usage: usage[item.id],
      unitsPerNfUnit: parseUnitsPerPackage(unitsPer[item.id] ?? "1", 1),
    }));
    const res = postGoodsReceipt(receipt.id, received);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-3 px-5 py-4">
          <div>
            <h2 className="font-display text-2xl text-zinc-50">Dar baixa na nota</h2>
            <p className="text-xs text-zinc-500">
              NF-e {receipt.nfeNumero ?? "—"} · {supplierName}
            </p>
          </div>
          <button type="button" className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10" onClick={onClose} aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          <p className="rounded-xl border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
            A NF não muda — ajuste só quantas <strong>unidades de venda</strong> entram no estoque (ex.: 15 PCT × 10
            caixas = 150 un.).
          </p>
          {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
          <div className="mt-4 space-y-4">
            {receipt.itens.map((item) => {
              const factor = parseUnitsPerPackage(unitsPer[item.id] ?? "1", 1);
              const expected = stockQtyFromPackages(item.quantidade, factor);
              const received = Number(String(stockQty[item.id] ?? "").replace(",", "."));
              const diff = Number.isFinite(received) ? received - expected : null;
              const current = usage[item.id] ?? "revenda";
              return (
                <div key={item.id} className="rounded-xl border border-white/10 bg-zinc-900/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-zinc-100">{item.productName}</p>
                      <p className="text-[11px] text-zinc-500">
                        {item.cfop ? `CFOP ${item.cfop}` : "Sem CFOP"}
                        {item.usage ? ` · veio como ${STOCK_USAGE_LABEL[item.usage]}` : ""}
                      </p>
                    </div>
                    <UsageSelect
                      ariaLabel={`Finalidade de ${item.productName}`}
                      value={current}
                      onChange={(next) => setUsage((prev) => ({ ...prev, [item.id]: next }))}
                    />
                  </div>
                  <div className="mt-3">
                    <PackageToStockFields
                      nfUnitLabel={item.unidade}
                      packageQty={item.quantidade}
                      unitsPerPackage={unitsPer[item.id] ?? "1"}
                      onUnitsPerPackageChange={(v) => onUnitsChange(item.id, item.quantidade, v)}
                      nfUnitCost={item.valorUnitario}
                      stockQty={stockQty[item.id]}
                      onStockQtyChange={(v) => setStockQty((prev) => ({ ...prev, [item.id]: v }))}
                    />
                  </div>
                  {diff != null && diff !== 0 ? (
                    <p className="mt-2 text-[11px] text-amber-200/90">
                      Diferença em relação à conversão padrão: {diff > 0 ? `+${diff}` : diff} un.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2 border-t border-white/10 px-5 py-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={confirm}>
            <PackageCheck className="h-4 w-4" />
            Confirmar baixa
          </Button>
        </div>
      </div>
    </div>
  );
}
