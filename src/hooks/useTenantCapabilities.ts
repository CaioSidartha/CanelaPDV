"use client";

import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { usePlatformStore } from "@/store/usePlatformStore";
import { defaultCapabilities } from "@/lib/tenant-snapshot";

export function useTenantCapabilities() {
  const tenantId = useAppStore((s) => s.auth.tenantId);
  const fromWorkspace = useAppStore((s) => s.tenantCapabilities);
  const tenant = usePlatformStore((s) => s.tenants.find((t) => t.id === tenantId));
  return useMemo(
    () => tenant?.capabilities ?? fromWorkspace ?? defaultCapabilities(),
    [tenant, fromWorkspace],
  );
}

export function usePlatformTenant() {
  const tenantId = useAppStore((s) => s.auth.tenantId);
  return usePlatformStore((s) => s.tenants.find((t) => t.id === tenantId));
}
