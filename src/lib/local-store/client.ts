"use client";

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

export async function fetchLanComandas(): Promise<ComandaState[]> {
  const res = await fetch("/api/store/comandas", { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as { comandas?: ComandaState[] };
  return data.comandas ?? [];
}

export async function pushLanComanda(comanda: ComandaState): Promise<ComandaState | null> {
  const res = await fetch("/api/store/comandas", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comanda }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { comanda?: ComandaState };
  return data.comanda ?? null;
}
