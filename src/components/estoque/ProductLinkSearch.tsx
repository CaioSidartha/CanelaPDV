"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { formatBRL } from "@/lib/utils";
import type { Product } from "@/types";

type Props = {
  products: Product[];
  selectedId: string;
  onSelect: (productId: string) => void;
};

export function ProductLinkSearch({ products, selectedId, onSelect }: Props) {
  const [q, setQ] = useState("");
  const active = useMemo(
    () => products.filter((p) => p.active).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [products],
  );

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return active.slice(0, 8);
    return active
      .filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.barcode?.includes(term) ?? false),
      )
      .slice(0, 12);
  }, [active, q]);

  const selected = selectedId ? products.find((p) => p.id === selectedId) : undefined;

  return (
    <div className="relative">
      <Input
        className="h-8 text-xs"
        placeholder="Nome ou EAN — resultados ao digitar…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {selected && !q ? (
        <p className="mt-1 truncate text-[11px] text-emerald-300/90">
          Vinculado: {selected.name}
        </p>
      ) : null}
      <ul
        className="mt-1 max-h-[140px] overflow-y-auto rounded-lg border border-white/15 bg-zinc-950 shadow-lg"
        role="listbox"
      >
        <li>
          <button
            type="button"
            className={`w-full px-2 py-1.5 text-left text-xs hover:bg-white/10 ${
              !selectedId ? "bg-brand/15 text-zinc-100" : "text-zinc-400"
            }`}
            onClick={() => onSelect("")}
          >
            — Sem vínculo —
          </button>
        </li>
        {results.length === 0 ? (
          <li className="px-2 py-2 text-[11px] text-zinc-500">Nenhum produto encontrado.</li>
        ) : (
          results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={`w-full px-2 py-1.5 text-left text-xs hover:bg-white/10 ${
                  p.id === selectedId ? "bg-brand/20 ring-1 ring-brand/40" : ""
                }`}
                onClick={() => {
                  onSelect(p.id);
                  setQ("");
                }}
              >
                <span className="block truncate font-medium text-zinc-100">{p.name}</span>
                <span className="text-[10px] text-zinc-500">
                  {p.barcode ? `EAN ${p.barcode}` : "sem EAN"}
                  {p.price > 0 ? ` · ${formatBRL(p.price)}` : ""}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
