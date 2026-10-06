"use client";

import type { StoreBundle, StoreBundlePatch } from "@/lib/local-store/types";
import type { ComandaState } from "@/types";

let _lanStoreEnabled: boolean | null = null;

export async function fetchLanStoreStatus(): Promise<boolean> {
  try {
    const res = await fetch("/api/store/status", { cache: "no-store" });
    if (!res.ok) {
      _lanStoreEnabled = false;
      return false;
    }
    const data = (await res.json()) as { enabled?: boolean };
    _lanStoreEnabled = Boolean(data.enabled);
    return _lanStoreEnabled;
  } catch {
    _lanStoreEnabled = false;
    return false;
  }
}

export function isLanStoreCached(): boolean {
  return _lanStoreEnabled === true;
}

export async function fetchLanBundle(): Promise<StoreBundle | null> {
  const res = await fetch("/api/store/bundle", { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as StoreBundle;
}

export async function pushLanBundlePatch(patch: StoreBundlePatch): Promise<StoreBundle | null> {
  const res = await fetch("/api/store/bundle", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) return null;
  return (await res.json()) as StoreBundle;
}

/** Legado — preferir bundle. */
export async function fetchLanComandas(): Promise<ComandaState[]> {
  const bundle = await fetchLanBundle();
  return bundle?.comandas ?? [];
}

export async function pushLanComanda(comanda: ComandaState): Promise<ComandaState | null> {
  const bundle = await pushLanBundlePatch({ comandas: [comanda] });
  return bundle?.comandas.find((c) => c.id === comanda.id) ?? null;
}
