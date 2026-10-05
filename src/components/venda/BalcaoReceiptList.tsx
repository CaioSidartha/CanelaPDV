"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { ProductThumb } from "@/components/product/ProductThumb";
import { formatBRL } from "@/lib/utils";
import type { CartLine, Product } from "@/types";

type Props = {
  lines: CartLine[];
  productById: Map<string, Product>;
  onDec: (lineId: string) => void;
  onInc: (lineId: string) => void;
  onRemove: (lineId: string) => void;
};

export function BalcaoReceiptList({
  lines,
  productById,
  onDec,
  onInc,
  onRemove,
}: Props) {
  if (!lines.length) {
    return (
      <div className="flex h-full min-h-[120px] items-center justify-center rounded-lg border border-dashed border-zinc-700 px-4 text-center text-sm text-zinc-500">
        Passe o leitor, use atalhos ou abra o catálogo visual.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-zinc-950/25">
      <div
        className="grid grid-cols-[minmax(0,1fr)_2.5rem_4.5rem_4.5rem] gap-2 border-b border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
      >
        <span>Produto</span>
        <span className="text-center">Qtd</span>
        <span className="text-right">Unit.</span>
        <span className="text-right">Total</span>
      </div>
      <ul className="divide-y divide-white/5">
        {lines.map((l) => {
          const qty = l.grams ? 1 : l.quantity;
          const unit = l.grams
            ? formatBRL(l.subtotal)
            : formatBRL(l.unitPrice);
          return (
            <li
              key={l.id}
              className="grid grid-cols-[minmax(0,1fr)_2.5rem_4.5rem_4.5rem] items-center gap-2 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <ProductThumb
                  imageUrl={l.productId ? productById.get(l.productId)?.imageUrl : undefined}
                  name={l.name}
                  size={26}
                />
                <p className="truncate text-sm font-medium text-zinc-100">{l.name}</p>
              </div>
              <div className="flex items-center justify-center gap-0.5">
                {!l.grams && !l.weightConfigId ? (
                  <>
                    <button
                      type="button"
                      className="rounded border border-zinc-600 p-0.5 hover:bg-zinc-800"
                      onClick={() => onDec(l.id)}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-4 text-center text-xs tabular-nums">{l.quantity}</span>
                    <button
                      type="button"
                      className="rounded border border-zinc-600 p-0.5 hover:bg-zinc-800"
                      onClick={() => onInc(l.id)}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <span className="text-xs tabular-nums text-zinc-400">{l.grams ? `${l.grams}g` : qty}</span>
                )}
              </div>
              <span className="text-right text-xs tabular-nums text-zinc-400">{unit}</span>
              <div className="flex items-center justify-end gap-1">
                <span className="text-sm font-semibold tabular-nums text-brand-light">
                  {formatBRL(l.subtotal)}
                </span>
                <button
                  type="button"
                  className="rounded p-0.5 text-zinc-500 hover:text-red-400"
                  onClick={() => onRemove(l.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
