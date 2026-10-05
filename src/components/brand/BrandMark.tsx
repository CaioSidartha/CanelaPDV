"use client";

import { cn } from "@/lib/utils";
import { CANELA_ICON_SRC } from "@/config/brand-assets";

type Props = {
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/** Marca no menu/login — logo do cliente ou símbolo Canela até enviar o arquivo. */
export function BrandMark({ logoUrl, size = "md", className }: Props) {
  const box =
    size === "sm"
      ? "h-8 w-8 rounded-md"
      : size === "lg"
        ? "h-24 w-24 rounded-xl"
        : "h-9 w-9 rounded-lg";

  if (logoUrl?.trim()) {
    return (
      <div
        className={cn(
          "relative shrink-0 overflow-hidden border border-[var(--border)] bg-[var(--surface)]",
          box,
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="" className="h-full w-full object-contain p-0.5" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden border border-[var(--border)] bg-[#FAF6F1]",
        box,
        className,
      )}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={CANELA_ICON_SRC} alt="" className="h-full w-full object-contain p-0.5" />
    </div>
  );
}
