import type { ComandaState } from "@/types";

type WithStoreMeta = { id: string; storeRevision?: number };

export function mergeByIdAuthoritative<T extends WithStoreMeta>(local: T[], server: T[]): T[] {
  const map = new Map(local.map((x) => [x.id, x]));
  for (const s of server) {
    const l = map.get(s.id);
    if (!l || (s.storeRevision ?? 0) >= (l.storeRevision ?? 0)) {
      map.set(s.id, s);
    }
  }
  return Array.from(map.values());
}

/** Comandas: servidor + abertas locais ainda não replicadas. */
export function mergeComandas(local: ComandaState[], server: ComandaState[]): ComandaState[] {
  const serverIds = new Set(server.map((s) => s.id));
  const pendingLocal = local.filter((c) => !serverIds.has(c.id) && c.status === "aberta");
  const merged = mergeByIdAuthoritative(local.filter((c) => serverIds.has(c.id)), server);
  const byId = new Map(merged.map((c) => [c.id, c]));
  for (const p of pendingLocal) byId.set(p.id, p);
  return Array.from(byId.values());
}
