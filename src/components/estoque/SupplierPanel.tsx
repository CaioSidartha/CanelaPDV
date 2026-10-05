"use client";

import { useMemo } from "react";
import { buildSupplierBoard } from "@/lib/supplier-insights";
import { formatBRL } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

export function SupplierPanel() {
  const suppliers = useAppStore((s) => s.suppliers);
  const receipts = useAppStore((s) => s.goodsReceipts);
  const products = useAppStore((s) => s.products);
  const sales = useAppStore((s) => s.sales);
  const board = useMemo(
    () => buildSupplierBoard(suppliers, receipts, products, sales),
    [suppliers, receipts, products, sales],
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Operação · Fornecedores</p>
        <h2 className="font-display text-2xl text-zinc-50">Painel de compras</h2>
        <p className="text-xs text-zinc-500">
          Conta só o que já foi lançado no estoque. Nota a caminho ou a ser lançada fica de fora.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-zinc-950/40 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Quem você mais compra</p>
        {board.ranking.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Ainda não há nota lançada para montar o ranking.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {board.ranking.map((row, index) => (
              <li key={row.supplierId} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-zinc-100">
                  <span className="mr-2 font-mono text-xs text-primary">{index + 1}</span>
                  {row.name}
                  <span className="ml-2 text-[11px] text-zinc-500">
                    {row.noteCount} nota{row.noteCount === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="font-medium text-zinc-100">{formatBRL(row.total)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-zinc-950/40 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">O produto que mais sai</p>
        {board.fast ? (
          <p className="mt-3 text-sm text-zinc-200">
            <span className="font-medium text-zinc-50">{board.fast.productName}</span>
            {" saiu "}
            {board.fast.soldQty.toLocaleString("pt-BR")}
            {". Desse item, a maior compra lançada é da "}
            <span className="text-primary">{board.fast.supplierName}</span>
            {` (${board.fast.boughtQty.toLocaleString("pt-BR")} no total).`}
          </p>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">
            Quando uma venda de revenda tiver nota lançada do mesmo item, a origem aparece aqui.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Vale chamar</p>
        {board.tips.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">Nenhum item no mínimo com fornecedor conhecido.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {board.tips.map((tip) => (
              <li key={tip.productName} className="text-sm text-zinc-100">
                {tip.productName} está acabando ({tip.stockLabel}). Vale chamar {tip.supplierName}
                {tip.phone ? ` · ${tip.phone}` : ""}.
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
