"use client";

import { useEffect, useRef } from "react";
import {
  fetchLanComandas,
  fetchLanStoreStatus,
  pushLanComanda,
} from "@/lib/local-store/client";
import { useAppStore } from "@/store/useAppStore";
import type { ComandaState } from "@/types";

const POLL_MS = 1500;

/** Servidor manda; mantém comandas abertas só locais até o primeiro push. */
function mergeComandasAuthoritative(local: ComandaState[], server: ComandaState[]): ComandaState[] {
  const serverIds = new Set(server.map((s) => s.id));
  const extras = local.filter((c) => !serverIds.has(c.id) && c.status === "aberta");
  return [...server, ...extras];
}

export function LanComandaSync() {
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
        const server = await fetchLanComandas();
        const local = useAppStore.getState().comandas;
        const merged = mergeComandasAuthoritative(local, server);
        if (JSON.stringify(merged) !== JSON.stringify(local)) {
          useAppStore.setState({ comandas: merged });
        }
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
      if (!lanEnabled.current || state.comandas === prev.comandas) return;
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(() => {
        void pushChangedComandas(state.comandas, prev.comandas);
      }, 350);
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

async function pushChangedComandas(current: ComandaState[], previous: ComandaState[]) {
  const prevById = new Map(previous.map((c) => [c.id, c]));
  for (const c of current) {
    const prev = prevById.get(c.id);
    if (prev && JSON.stringify(prev) === JSON.stringify(c)) continue;
    await pushLanComanda(c);
  }
}
