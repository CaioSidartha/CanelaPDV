"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { ProductThumb } from "@/components/product/ProductThumb";
import { Input } from "@/components/ui/Input";
import {
  effectiveUnitPrice,
  productMatchesTextSearch,
} from "@/lib/product-catalog";
import { isProductSoldByKg, resolveSaleUnit } from "@/lib/product-sale-unit";
import { isPosProduct } from "@/lib/stock-usage";
import { cn, formatBRL } from "@/lib/utils";
import { qtyInCartForProduct, useAppStore } from "@/store/useAppStore";

type FilterMode = "todos" | "peso";

type Props = {
  open: boolean;
  onClose: () => void;
  disabled?: boolean;
  onAdded?: () => void;
};

export function VisualCatalogModal({ open, onClose, disabled, onAdded }: Props) {
  const products = useAppStore((s) => s.products);
  const cart = useAppStore((s) => s.cart);
  const addToCartProduct = useAppStore((s) => s.addToCartProduct);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("todos");
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim();
    return products.filter((p) => {
      if (!isPosProduct(p)) return false;
      if (filter === "peso" && !isProductSoldByKg(p)) return false;
      return productMatchesTextSearch(p, q);
    });
  }, [products, search, filter]);

  if (!open) return null;

  const pushErr = (msg: string) => {
    setErr(msg);
    setTimeout(() => setErr(null), 5000);
  };

  const addProduct = (productId: string) => {
    const r = addToCartProduct(productId, 1);
    if (!r.ok) pushErr(r.error);
    else onAdded?.();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-stretch justify-center bg-black/75 p-2 sm:p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Catálogo visual"
    >
      <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div>
            <p className="font-display text-lg text-[var(--foreground)]">Catálogo</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Toque no produto para adicionar ao caixa
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-4 py-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nome ou código…"
            className="h-9 max-w-xs flex-1 border-[var(--border)] bg-[var(--input)]"
            autoFocus
          />
          <div className="flex rounded-md border border-[var(--border)] p-0.5">
            {(
              [
                ["todos", "Todos"],
                ["peso", "Por kilo"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={cn(
                  "rounded px-3 py-1.5 text-xs font-medium transition",
                  filter === id
                    ? "bg-brand text-primary-foreground"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filter === "peso" && (
          <p className="border-b border-[var(--border)] bg-[var(--background)] px-4 py-2 text-xs text-[var(--muted-foreground)]">
            Produtos cadastrados com forma de venda <strong>Quilo (kg)</strong>. Na venda por peso, use
            balança ou informe gramas no caixa.
          </p>
        )}

        {err && (
          <p className="border-b border-red-500/30 bg-red-950/40 px-4 py-2 text-sm text-red-100">
            {err}
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {filtered.map((p) => {
              const avail =
                p.trackStock === false
                  ? null
                  : Math.max(0, (p.stockQty ?? 0) - qtyInCartForProduct(cart, p.id));
              const byKg = resolveSaleUnit(p) === "kg";
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => addProduct(p.id)}
                  className="group relative flex flex-col rounded-lg border border-[var(--border)] bg-[var(--background)] p-2 text-left transition hover:border-brand/50 disabled:opacity-40"
                >
                  <div className="relative mb-2 aspect-[4/3] w-full overflow-hidden rounded-md bg-zinc-950/50">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ProductThumb imageUrl={null} name={p.name} size={40} className="border-0 bg-transparent" />
                      </div>
                    )}
                    <span className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-md bg-brand text-white opacity-0 shadow transition group-hover:opacity-100">
                      <Plus className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs font-medium text-[var(--foreground)]">{p.name}</p>
                  <p className="mt-0.5 text-sm font-semibold text-brand-light tabular-nums">
                    {formatBRL(effectiveUnitPrice(p))}
                    {byKg && (
                      <span className="ml-1 text-[10px] font-normal text-[var(--muted-foreground)]">
                        / kg
                      </span>
                    )}
                  </p>
                  {avail != null && (
                    <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">Disp. {avail}</p>
                  )}
                </button>
              );
            })}
          </div>
          {!filtered.length && (
            <p className="py-12 text-center text-sm text-[var(--muted-foreground)]">
              Nenhum produto neste filtro.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
