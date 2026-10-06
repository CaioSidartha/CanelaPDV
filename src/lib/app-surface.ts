import { isDesktopApp } from "@/lib/desktop-client";
import type { TenantCapabilities } from "@/types/platform";

/** Onde o usuário está rodando o produto da loja (não site / não platform master). */
export type AppSurface = "store-desktop" | "cloud-management" | "cloud-portal";

export function resolveAppSurface(capabilities: TenantCapabilities): AppSurface {
  if (isDesktopApp()) return "store-desktop";
  if (capabilities.deployMode === "offline" || (!capabilities.onlineEnabled && capabilities.offlineEnabled)) {
    return "cloud-portal";
  }
  return "cloud-management";
}

export function surfaceLabel(surface: AppSurface): string {
  switch (surface) {
    case "store-desktop":
      return "Loja (app instalado)";
    case "cloud-management":
      return "Gestão na nuvem";
    case "cloud-portal":
      return "Portal — baixe o app";
  }
}

/** Rotas de balcão: só no app da loja instalado. */
export const STORE_ONLY_PATH_PREFIXES = [
  "/venda",
  "/rampa",
  "/comandas",
  "/caixa",
  "/telas",
  "/delivery",
];

export function isStoreOnlyPath(pathname: string): boolean {
  return STORE_ONLY_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Portal offline: só início e configurações (download). */
export const CLOUD_PORTAL_PATHS = new Set(["/inicio", "/configuracoes"]);

export function isPathAllowedForSurface(pathname: string, surface: AppSurface): boolean {
  if (surface === "store-desktop") return true;
  if (surface === "cloud-portal") {
    return CLOUD_PORTAL_PATHS.has(pathname) || pathname.startsWith("/configuracoes");
  }
  if (isStoreOnlyPath(pathname)) return false;
  return true;
}
