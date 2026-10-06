"use client";

import { useMemo } from "react";
import { resolveAppSurface, type AppSurface } from "@/lib/app-surface";
import { useTenantCapabilities } from "@/hooks/useTenantCapabilities";

export function useAppSurface(): AppSurface {
  const cap = useTenantCapabilities();
  return useMemo(() => resolveAppSurface(cap), [cap]);
}
