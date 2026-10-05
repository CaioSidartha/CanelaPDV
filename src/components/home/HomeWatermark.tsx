"use client";

import { CANELA_LOGO_SRC } from "@/config/brand-assets";
import { useAppStore } from "@/store/useAppStore";

/** Área inicial sem módulo selecionado — marca d'água da loja / Canela. */
export function HomeWatermark() {
  const company = useAppStore((s) => s.company);
  const logo = company.logoUrl?.trim() || CANELA_LOGO_SRC;

  return (
    <div className="relative flex min-h-[calc(100vh-3rem)] flex-col items-center justify-center px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 40%, rgba(217,119,6,0.9), transparent 70%)",
        }}
      />
      <div className="relative flex max-w-lg flex-col items-center text-center">
        <div className="relative w-full max-w-[min(420px,85vw)] opacity-[0.22] grayscale-[20%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" className="mx-auto h-auto w-full object-contain" />
        </div>
        <p className="mt-8 font-display text-2xl font-semibold text-[var(--foreground)] opacity-90">
          {company.name}
        </p>
        <p className="mt-2 max-w-sm text-sm text-[var(--muted-foreground)]">
          Escolha um módulo no menu ao lado para começar — caixa, estoque, comandas e mais.
        </p>
      </div>
    </div>
  );
}
