"use client";

import { useEffect, useRef } from "react";
import { fetchLanBundle, fetchLanStoreStatus, pushLanBundlePatch } from "@/lib/local-store/client";
import { mergeByIdAuthoritative, mergeComandas } from "@/lib/local-store/merge";
import type { StoreBundlePatch } from "@/lib/local-store/types";
import { useAppStore } from "@/store/useAppStore";

type StoreState = ReturnType<typeof useAppStore.getState>;

const POLL_MS = 1500;

type SliceKey =
  | "comandas"
  | "categories"
  | "products"
  | "sales"
  | "cashSessions"
  | "cashMovements"
  | "stockLedger";

const SLICES: SliceKey[] = [
  "comandas",
  "categories",
  "products",
  "sales",
  "cashSessions",
  "cashMovements",
  "stockLedger",
];

function applyBundleToStore(server: Awaited<ReturnType<typeof fetchLanBundle>>) {
  if (!server) return;
  const local = useAppStore.getState();
  const next = {
    comandas: mergeComandas(local.comandas, server.comandas),
    categories: mergeByIdAuthoritative(local.categories, server.categories),
    products: mergeByIdAuthoritative(local.products, server.products),
    sales: mergeByIdAuthoritative(local.sales, server.sales),
    cashSessions: mergeByIdAuthoritative(local.cashSessions, server.cashSessions),
    cashMovements: mergeByIdAuthoritative(local.cashMovements, server.cashMovements),
    stockLedger: mergeByIdAuthoritative(local.stockLedger, server.stockLedger),
  };
  useAppStore.setState(next);
}

function buildPatch(prev: StoreState, curr: StoreState): StoreBundlePatch {
  const patch: StoreBundlePatch = {};
  if (prev.comandas !== curr.comandas) {
    patch.comandas = diffArray(prev.comandas, curr.comandas);
  }
  if (prev.categories !== curr.categories) {
    patch.categories = diffArray(prev.categories, curr.categories);
  }
  if (prev.products !== curr.products) {
    patch.products = diffArray(prev.products, curr.products);
  }
  if (prev.sales !== curr.sales) {
    patch.sales = diffArray(prev.sales, curr.sales);
  }
  if (prev.cashSessions !== curr.cashSessions) {
    patch.cashSessions = diffArray(prev.cashSessions, curr.cashSessions);
  }
  if (prev.cashMovements !== curr.cashMovements) {
    patch.cashMovements = diffArray(prev.cashMovements, curr.cashMovements);
  }
  if (prev.stockLedger !== curr.stockLedger) {
    patch.stockLedger = diffArray(prev.stockLedger, curr.stockLedger);
  }
  return patch;
}

function diffArray<T extends { id: string }>(prev: T[], curr: T[]): T[] {
  const prevMap = new Map(prev.map((x) => [x.id, x]));
  const out: T[] = [];
  for (const c of curr) {
    const p = prevMap.get(c.id);
    if (!p || JSON.stringify(p) !== JSON.stringify(c)) out.push(c);
  }
  return out;
}

function patchEmpty(patch: StoreBundlePatch): boolean {
  return SLICES.every((k) => !patch[k]?.length);
}

/**
 * Sincroniza comandas, catálogo, vendas, caixa e estoque via SQLite no servidor (LAN).
 */
export function LanStoreSync() {
  const lanEnabled = useRef(false);
  const syncingRef = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      if (!active || !lanEnabled.current || syncingRef.current) return;
      syncingRef.current = true;
      try {
        const server = await fetchLanBundle();
        applyBundleToStore(server);
      } finally {
        syncingRef.current = false;
      }
    };

    fetchLanStoreStatus().then((enabled) => {
      if (!active) return;
      lanEnabled.current = enabled;
      if (!enabled) return;
      void poll();
      interval = setInterval(() => void poll(), POLL_MS);
    });

    const unsub = useAppStore.subscribe((state, prev) => {
      if (!lanEnabled.current) return;
      const changed = SLICES.some((k) => state[k] !== prev[k]);
      if (!changed) return;
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(() => {
        const patch = buildPatch(prev, state);
        if (!patchEmpty(patch)) void pushLanBundlePatch(patch);
      }, 400);
    });

    return () => {
      active = false;
      if (interval) clearInterval(interval);
      if (pushTimer.current) clearTimeout(pushTimer.current);
      unsub();
    };
  }, []);

  return null;
}
