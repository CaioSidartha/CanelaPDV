"use client";

import Link from "next/link";
import { CANELA_WORDMARK_SRC } from "@/config/brand-assets";
import { useAppSurface } from "@/hooks/useAppSurface";
import { surfaceLabel } from "@/lib/app-surface";
import { useAppStore } from "@/store/useAppStore";

/** Área inicial — fundo claro só aqui para o wordmark marrom; resto do app mantém o tema escuro. */
export function HomeWatermark() {
  const company = useAppStore((s) => s.company);
  const surface = useAppSurface();
  const wordmark = CANELA_WORDMARK_SRC;

  const subtitle =
    surface === "store-desktop"
      ? "Escolha um módulo no menu — caixa, estoque, comandas e mais."
      : surface === "cloud-portal"
        ? "Plano local: baixe o app Windows para operar o balcão. Este painel é só para download e conta."
        : "Visão gerencial na nuvem — estoque, ponto, equipe e relatórios. PDV e comandas ficam no app da loja.";

  return (
    <div
      className="relative flex min-h-[calc(100vh-3rem)] flex-col items-center justify-center px-6 py-16"
      style={{ background: "linear-gradient(180deg, #F8F1E8 0%, #EDE4D6 45%, #E5D9C8 100%)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 35%, rgba(217,119,6,0.15), transparent 70%)",
        }}
      />
      <div className="relative flex max-w-lg flex-col items-center text-center">
        <div className="relative w-full max-w-[min(380px,88vw)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={wordmark} alt="Canela" className="mx-auto h-auto w-full object-contain" />
        </div>
        <p className="mt-8 font-display text-2xl font-semibold text-[#3d2817]">{company.name}</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-amber-800/90">
          {surfaceLabel(surface)}
        </p>
        <p className="mt-2 max-w-md text-sm text-[#5c4a3a]">{subtitle}</p>
        {surface === "cloud-portal" && (
          <Link
            href="/configuracoes?tab=app"
            className="mt-6 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-light"
          >
            Baixar app para Windows
          </Link>
        )}
      </div>
    </div>
  );
}
