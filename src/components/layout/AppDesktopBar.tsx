"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Monitor, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  checkDesktopUpdatesFromBrowser,
  fetchDesktopReleaseManifest,
  getInstalledDesktopVersion,
  isDesktopApp,
} from "@/lib/desktop-client";
import { compareSemver } from "@/lib/semver";
import { useTenantCapabilities } from "@/hooks/useTenantCapabilities";

export function AppDesktopBar() {
  const cap = useTenantCapabilities();
  const [webVersion, setWebVersion] = useState<string | null>(null);
  const [desktopVersion, setDesktopVersion] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [installedVersion, setInstalledVersion] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const isDesktop = isDesktopApp();
  const showDownload = !isDesktop && cap.desktopDownloadEnabled && cap.deployMode !== "online";

  const refresh = useCallback(async () => {
    const manifest = await fetchDesktopReleaseManifest();
    if (manifest) {
      setWebVersion(manifest.webVersion);
      setDesktopVersion(manifest.desktop.version);
      setDownloadUrl(manifest.desktop.windowsDownloadUrl);
    }
    const installed = await getInstalledDesktopVersion();
    setInstalledVersion(installed);
    if (installed && manifest) {
      setUpdateAvailable(compareSemver(installed, manifest.desktop.version) < 0);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onCheckUpdates = async () => {
    setBusy(true);
    setMsg(null);
    const result = await checkDesktopUpdatesFromBrowser();
    setBusy(false);
    if (!result) {
      setMsg("Não foi possível consultar atualizações.");
      return;
    }
    setWebVersion(result.webVersion);
    setDesktopVersion(result.latestDesktopVersion);
    setInstalledVersion(result.installedVersion);
    setUpdateAvailable(result.updateAvailable);
    setDownloadUrl(result.downloadUrl);
    if (result.updateAvailable && result.downloadUrl) {
      setMsg(`Nova versão ${result.latestDesktopVersion} disponível. Abrindo download…`);
      window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
    } else if (result.updateAvailable) {
      setMsg(`Nova versão ${result.latestDesktopVersion} no servidor. Configure o link do instalador no painel master.`);
    } else {
      setMsg("Você está na versão mais recente do app.");
    }
  };

  if (!showDownload && !isDesktop) return null;

  return (
    <div className="sticky top-0 z-30 flex flex-wrap items-center justify-end gap-2 border-b border-white/10 bg-zinc-950/80 px-4 py-2 text-xs backdrop-blur-md print:hidden">
      {webVersion && (
        <span className="inline-flex items-center gap-1 text-zinc-400">
          <Monitor className="h-3.5 w-3.5" />
          Painel online v{webVersion}
        </span>
      )}
      {isDesktop && installedVersion && (
        <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 font-medium text-zinc-200">
          App instalado v{installedVersion}
          {updateAvailable && desktopVersion && (
            <span className="ml-1 text-amber-400">→ v{desktopVersion} disponível</span>
          )}
        </span>
      )}
      {!isDesktop && desktopVersion && (
        <span className="text-zinc-500">App Windows v{desktopVersion}</span>
      )}
      {showDownload && downloadUrl && (
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 font-semibold text-white hover:bg-brand-light"
        >
          <Download className="h-3.5 w-3.5" />
          Baixar para Windows
        </a>
      )}
      {showDownload && !downloadUrl && (
        <span className="text-zinc-500">Instalador em preparação (painel master)</span>
      )}
      {isDesktop && (
        <Button type="button" size="sm" variant="secondary" className="h-7 gap-1 text-xs" disabled={busy} onClick={() => void onCheckUpdates()}>
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
          Buscar atualizações
        </Button>
      )}
      {msg && <span className="w-full text-center text-zinc-400 sm:w-auto">{msg}</span>}
    </div>
  );
}
