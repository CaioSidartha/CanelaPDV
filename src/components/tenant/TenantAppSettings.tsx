"use client";

import { useEffect, useState } from "react";
import { Download, HardDrive, Cloud } from "lucide-react";
import { fetchDesktopReleaseManifest, getInstalledDesktopVersion } from "@/lib/desktop-client";
import { useTenantCapabilities, usePlatformTenant } from "@/hooks/useTenantCapabilities";

export function TenantAppSettings() {
  const cap = useTenantCapabilities();
  const tenant = usePlatformTenant();
  const [manifest, setManifest] = useState<Awaited<ReturnType<typeof fetchDesktopReleaseManifest>>>(null);
  const [installed, setInstalled] = useState<string | null>(null);

  useEffect(() => {
    void fetchDesktopReleaseManifest().then(setManifest);
    void getInstalledDesktopVersion().then(setInstalled);
  }, []);

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

      {manifest && (
        <p className="text-xs text-zinc-500">
          Painel online v{manifest.webVersion}
          {installed ? ` · App instalado v${installed}` : ""}
          {manifest.desktop.version ? ` · Último instalador v${manifest.desktop.version}` : ""}
        </p>
      )}

      {canDownload ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
          <p className="text-sm text-amber-100/90">
            Use o botão <strong>Baixar para Windows</strong> no canto superior da tela (barra do app).
            No app instalado, use <strong>Buscar atualizações</strong> quando a Canela publicar uma versão nova.
          </p>
          {manifest?.desktop.windowsDownloadUrl ? (
            <a
              href={manifest.desktop.windowsDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-light"
            >
              <Download className="h-4 w-4" />
              Baixar v{manifest.desktop.version}
            </a>
          ) : (
            <p className="mt-3 text-xs text-amber-200/70">Aguardando link do instalador no painel master.</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          Seu plano é somente online: não há app para baixar; use sempre pelo navegador com internet.
        </p>
      )}
    </section>
  );
}
