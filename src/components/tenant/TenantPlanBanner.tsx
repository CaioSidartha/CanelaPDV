"use client";

import { useTenantCapabilities, usePlatformTenant } from "@/hooks/useTenantCapabilities";

export function TenantPlanBanner() {
  const cap = useTenantCapabilities();
  const tenant = usePlatformTenant();

  if (!tenant) return null;

  const modeLabel =
    cap.deployMode === "offline"
      ? "Modo offline/local — sync em nuvem desativado neste contrato."
      : cap.deployMode === "online"
        ? "Modo somente online — download desktop desativado neste contrato."
        : null;

  if (!modeLabel && cap.fiscalEnabled) return null;

  return (
    <div className="border-b border-amber-900/40 bg-amber-950/30 px-4 py-2 text-center text-xs text-amber-100/90">
      {tenant.kind === "test" && <span className="font-semibold">Conta teste · </span>}
      {modeLabel}
      {!cap.fiscalEnabled && <span className={modeLabel ? " · " : ""}>Módulo fiscal desligado no plano.</span>}
    </div>
  );
}
