"use client";

import Link from "next/link";
import { Download, Wifi, WifiOff } from "lucide-react";
import { useTenantCapabilities, usePlatformTenant } from "@/hooks/useTenantCapabilities";

export function TenantPlanBanner() {
  const cap = useTenantCapabilities();
  const tenant = usePlatformTenant();

  const parts: string[] = [];
  if (tenant?.kind === "test") parts.push("Conta teste");

  if (cap.deployMode === "offline") {
    parts.push("Modo somente local — dados neste aparelho; nuvem desligada no contrato.");
  } else if (cap.deployMode === "online") {
    parts.push("Modo somente online — sem app para baixar no PC.");
  } else {
    parts.push("Híbrido: balcão no app Windows; gestão pode usar este painel na nuvem.");
  }

  if (!cap.fiscalEnabled) parts.push("Módulo fiscal desligado no plano.");

  const showDesktopCta = cap.desktopDownloadEnabled && cap.deployMode !== "online";

  if (!parts.length && !showDesktopCta) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-b border-amber-900/40 bg-amber-950/30 px-4 py-2 text-center text-xs text-amber-100/90">
      <span>{parts.join(" · ")}</span>
      {showDesktopCta && (
        <Link
          href="/configuracoes?tab=app"
          className="inline-flex items-center gap-1 rounded-md bg-amber-600/25 px-2 py-1 font-semibold text-amber-50 ring-1 ring-amber-500/40 hover:bg-amber-600/35"
        >
          <Download className="h-3.5 w-3.5" />
          App para PC
        </Link>
      )}
      {cap.onlineEnabled && cap.offlineEnabled && (
        <span className="inline-flex items-center gap-1 text-amber-200/70">
          <Wifi className="h-3 w-3" />
          <WifiOff className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}
