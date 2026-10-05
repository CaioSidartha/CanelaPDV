"use client";

import { cn } from "@/lib/utils";

type Props = {
  imageUrl?: string | null;
  name?: string;
  size?: number;
  className?: string;
};

/** Miniatura quadrada para listas do caixa/rampa (não altera altura da linha). */
export function ProductThumb({ imageUrl, name, size = 28, className }: Props) {
  const px = `${size}px`;
  const initial = (name?.trim()[0] ?? "?").toUpperCase();

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-zinc-950/60 text-[10px] font-semibold text-[var(--muted-foreground)]",
        className,
      )}
      style={{ width: px, height: px }}
    >
      {imageUrl?.trim() ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}
