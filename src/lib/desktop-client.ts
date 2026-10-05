import { compareSemver } from "@/lib/semver";
import type { DesktopReleaseManifest } from "@/lib/desktop-release";

export function isDesktopApp(): boolean {
  return typeof window !== "undefined" && Boolean(window.padariaDesktop?.isDesktop);
}

export async function fetchDesktopReleaseManifest(): Promise<DesktopReleaseManifest | null> {
  try {
    const res = await fetch("/api/desktop/release", { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as DesktopReleaseManifest;
  } catch {
    return null;
  }
}

export async function getInstalledDesktopVersion(): Promise<string | null> {
  if (!isDesktopApp() || !window.padariaDesktop?.getInfo) return null;
  try {
    const info = await window.padariaDesktop.getInfo();
    return info.version;
  } catch {
    return null;
  }
}

export type UpdateCheckResult = {
  installedVersion: string;
  latestDesktopVersion: string;
  webVersion: string;
  updateAvailable: boolean;
  downloadUrl: string;
  releaseNotes?: string;
};

export async function checkDesktopUpdatesFromBrowser(): Promise<UpdateCheckResult | null> {
  if (!isDesktopApp() || !window.padariaDesktop?.checkForUpdates) {
    const manifest = await fetchDesktopReleaseManifest();
    const installed = await getInstalledDesktopVersion();
    if (!manifest || !installed) return null;
    const latest = manifest.desktop.version;
    return {
      installedVersion: installed,
      latestDesktopVersion: latest,
      webVersion: manifest.webVersion,
      updateAvailable: compareSemver(installed, latest) < 0,
      downloadUrl: manifest.desktop.windowsDownloadUrl,
      releaseNotes: manifest.desktop.releaseNotes,
    };
  }
  try {
    const raw = await window.padariaDesktop.checkForUpdates();
    if (!raw || "error" in raw) return null;
    return raw;
  } catch {
    return null;
  }
}
