"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { buildDisplayFrames } from "@/lib/display-schedule";
import { formatBRL } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

export default function MonitorPrecosPage() {
  const params = useParams();
  const tvId = typeof params.tvId === "string" ? params.tvId : "";

  const displayTvs = useAppStore((s) => s.displayTvs);
  const categories = useAppStore((s) => s.categories);
  const products = useAppStore((s) => s.products);

  const tv = useMemo(() => displayTvs.find((t) => t.id === tvId), [displayTvs, tvId]);

  const frames = useMemo(() => {
    if (!tv) return [];
    return buildDisplayFrames(tv, categories, products);
  }, [tv, categories, products]);

  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    setFrameIndex(0);
  }, [tvId, frames.length]);

  useEffect(() => {
    if (!frames.length) return;
    const idx = frameIndex % frames.length;
    const frame = frames[idx]!;
    const ms = Math.max(800, frame.durationMs);
    const t = window.setTimeout(() => {
      setFrameIndex((i) => (i + 1) % frames.length);
    }, ms);
    return () => window.clearTimeout(t);
  }, [frames, frameIndex]);

  const frame = frames.length ? frames[frameIndex % frames.length]! : null;

  if (!tv) {
    return (
      <div className="fixed inset-0 z-[400] flex items-center justify-center bg-stone-950 text-white">
        <p className="text-xl">TV não encontrada.</p>
      </div>
    );
  }

  if (!tv.slots.length) {
    return (
      <div className="fixed inset-0 z-[400] flex flex-col items-center justify-center bg-stone-950 px-6 text-center text-white">
        <p className="text-2xl font-semibold">Nenhuma categoria configurada</p>
        <p className="mt-3 max-w-md text-sm text-stone-400">
          Abra Telas no sistema, escolha esta TV e adicione categorias com itens.
        </p>
      </div>
    );
  }

  const rowCount = frame?.rows.length ?? 0;

  return (
    <div className="fixed inset-0 z-[400] flex h-dvh max-h-dvh flex-col overflow-hidden bg-gradient-to-b from-stone-900 via-stone-950 to-black text-white">
      <header className="shrink-0 border-b border-white/10 px-4 py-3 sm:px-8 sm:py-4">
        <p className="text-xs font-medium uppercase tracking-widest text-amber-400/90 sm:text-sm">
          Preços
        </p>
        <h1 className="mt-0.5 truncate font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
          {frame?.categoryTitle ?? "—"}
        </h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-2 pt-1 sm:px-6 sm:pb-3 sm:pt-2">
        <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-white/20 pb-2 text-[10px] font-semibold uppercase tracking-wide text-stone-400 sm:gap-x-4 sm:pb-2.5 sm:text-xs">
          <span className="min-w-0 pl-1 sm:pl-2">Produto</span>
          <span className="pr-1 text-right sm:pr-2">Valor</span>
        </div>

        {/* Itens colados no topo (altura natural); espaço vazio fica embaixo — não esticar linhas com 1fr */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full min-h-0 flex-col items-stretch justify-start overflow-hidden">
            {rowCount > 0 ? (
              frame!.rows.map((row) => (
                <div
                  key={row.productId}
                  className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-white/5 py-3 sm:gap-x-4 sm:py-4"
                >
                  <div className="flex min-w-0 items-center gap-2 pl-1 text-base font-medium leading-snug sm:pl-2 sm:text-xl lg:text-2xl lg:leading-tight">
                    <span className="min-w-0 flex-1 truncate">{row.name}</span>
                    {row.onPromotion && (
                      <span className="shrink-0 rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300 sm:text-sm">
                        Promo
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-end pr-1 text-right text-lg font-bold tabular-nums text-amber-400 sm:pr-2 sm:text-2xl lg:text-3xl">
                    {formatBRL(row.unitPrice)}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-1 items-center justify-center text-stone-500">
                Nenhum item nesta lista.
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="shrink-0 border-t border-white/10 px-3 py-1.5 text-center text-[10px] text-stone-600 sm:text-xs">
        {tv.label} · atualização automática · use F11 para tela cheia
      </footer>
    </div>
  );
}
