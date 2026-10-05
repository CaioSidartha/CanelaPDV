import { readFileSync } from "fs";
import path from "path";
import { readLeadSettingsDb } from "@/lib/platform-settings-db";
import type { DesktopReleaseInfo } from "@/types/platform";

export type DesktopReleaseManifest = {
  /** Versão do painel web (deploy Render / package.json). */
  webVersion: string;
  desktop: DesktopReleaseInfo;
};

function readPackageVersion(): string {
  try {
    const file = path.join(process.cwd(), "package.json");
    const pkg = JSON.parse(readFileSync(file, "utf8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function envDesktopDefaults(): DesktopReleaseInfo {
  const version =
    process.env.DESKTOP_APP_VERSION?.trim() ||
    process.env.NEXT_PUBLIC_DESKTOP_APP_VERSION?.trim() ||
    readPackageVersion();
  const windowsDownloadUrl =
    process.env.DESKTOP_WINDOWS_URL?.trim() ||
    process.env.NEXT_PUBLIC_DESKTOP_WINDOWS_URL?.trim() ||
    "";
  return {
    version,
    windowsDownloadUrl,
    releaseNotes: process.env.DESKTOP_RELEASE_NOTES?.trim() || undefined,
    publishedAt: process.env.DESKTOP_PUBLISHED_AT?.trim() || undefined,
  };
}

export async function getDesktopReleaseManifest(): Promise<DesktopReleaseManifest> {
  const webVersion =
    process.env.NEXT_PUBLIC_APP_VERSION?.trim() ||
    process.env.APP_VERSION?.trim() ||
    readPackageVersion();

  const envDefaults = envDesktopDefaults();
  try {
    const settings = await readLeadSettingsDb();
    const fromDb = settings.desktopRelease;
    const desktop: DesktopReleaseInfo = {
      version: fromDb?.version?.trim() || envDefaults.version,
      windowsDownloadUrl: fromDb?.windowsDownloadUrl?.trim() || envDefaults.windowsDownloadUrl,
      releaseNotes: fromDb?.releaseNotes?.trim() || envDefaults.releaseNotes,
      publishedAt: fromDb?.publishedAt || envDefaults.publishedAt,
    };
    return { webVersion, desktop };
  } catch {
    return { webVersion, desktop: envDefaults };
  }
}
