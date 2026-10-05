"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { CANELA_LOGO_SRC, CANELA_ICON_SRC } from "@/config/brand-assets";

type Props = {
  variant?: "full" | "icon";
  className?: string;
  priority?: boolean;
};

export function CanelaLogo({ variant = "full", className, priority }: Props) {
  const src = variant === "icon" ? CANELA_ICON_SRC : CANELA_LOGO_SRC;
  const w = variant === "icon" ? 120 : 280;
  const h = variant === "icon" ? 120 : 200;

  return (
    <Image
      src={src}
      alt="Canela"
      width={w}
      height={h}
      priority={priority}
      className={cn("h-auto w-auto object-contain", className)}
    />
  );
}
