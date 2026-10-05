import { defaultModules } from "@/lib/tenant-access";
import type { TenantCapabilities } from "@/types/platform";
import type { TenantModuleName } from "@/types";

const STORAGE_PREFIX = "canela-tenant-data:";

export type TenantWorkspaceBlob = Record<string, unknown>;

export function tenantStorageKey(tenantId: string) {
  return `${STORAGE_PREFIX}${tenantId}`;
}

export function readTenantWorkspace(tenantId: string): TenantWorkspaceBlob | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(tenantStorageKey(tenantId));
    if (!raw) return null;
    return JSON.parse(raw) as TenantWorkspaceBlob;
  } catch {
    return null;
  }
}

export function writeTenantWorkspace(tenantId: string, blob: TenantWorkspaceBlob) {
  if (typeof window === "undefined") return;
  localStorage.setItem(tenantStorageKey(tenantId), JSON.stringify(blob));
}

export function modulesFromCapabilities(cap: TenantCapabilities): Record<TenantModuleName, boolean> {
  const base = defaultModules(cap.modules);
  if (!cap.fiscalEnabled) base.fiscal = false;
  return base;
}

export function defaultCapabilities(
  patch?: Partial<TenantCapabilities>,
): TenantCapabilities {
  return {
    deployMode: patch?.deployMode ?? "hybrid",
    onlineEnabled: patch?.onlineEnabled ?? true,
    offlineEnabled: patch?.offlineEnabled ?? true,
    fiscalEnabled: patch?.fiscalEnabled ?? true,
    desktopDownloadEnabled: patch?.desktopDownloadEnabled ?? true,
    modules: defaultModules(patch?.modules),
  };
}
