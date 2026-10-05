"use client";

import { Download, HardDrive, Cloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTenantCapabilities, usePlatformTenant } from "@/hooks/useTenantCapabilities";

export function TenantAppSettings() {
  const cap = useTenantCapabilities();
  const tenant = usePlatformTenant();

  const modeLabel =
    cap.deployMode === "hybrid"
      ? "Online + offline (híbrido)"
      : cap.deployMode === "online"
        ? "Somente online"
        : "Somente offline / local";

  const canDownload = cap.desktopDownloadEnabled && cap.deployMode !== "online";

  return (
    <section className="panel-glass max-w-2xl space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">App e sincronização</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Definido no contrato{tenant ? ` (${tenant.name})` : ""}. O painel master altera estes limites.
        </p>
      </div>

      <dl className="grid gap-3 text-sm">
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3">
          <dt className="text-zinc-400">Modo de uso</dt>
          <dd className="font-medium text-zinc-100">{modeLabel}</dd>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3">
          <dt className="flex items-center gap-2 text-zinc-400">
            <Cloud className="h-4 w-4" />
            Nuvem
          </dt>
          <dd className="font-medium text-zinc-100">{cap.onlineEnabled ? "Ativo" : "Desligado"}</dd>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3">
          <dt className="flex items-center gap-2 text-zinc-400">
            <HardDrive className="h-4 w-4" />
            Dados neste aparelho
          </dt>
          <dd className="font-medium text-zinc-100">{cap.offlineEnabled ? "Ativo" : "Desligado"}</dd>
        </div>
      </dl>

      {canDownload ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
          <p className="text-sm text-amber-100/90">
            O instalador Windows (balança, impressora e caixa sem depender do navegador) está em desenvolvimento.
            Enquanto isso, use o Chrome ou Edge neste link — seus dados já ficam salvos neste computador.
          </p>
          <Button type="button" className="mt-4 gap-2" disabled title="Versão desktop em breve">
            <Download className="h-4 w-4" />
            Baixar Canela para Windows (em breve)
          </Button>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          Seu plano é somente online: não há app para baixar; use sempre pelo navegador com internet.
        </p>
      )}
    </section>
  );
}
