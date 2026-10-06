import { eq } from "drizzle-orm";
import { getLocalStoreDb, isLocalStoreEnabled } from "@/db/local";
import { storeComandas } from "@/db/local/schema";
import type { ComandaState } from "@/types";

export function localStoreComandasEnabled() {
  return isLocalStoreEnabled();
}

export function listComandasFromLocalStore(): ComandaState[] {
  const db = getLocalStoreDb();
  const rows = db.select().from(storeComandas).all();
  return rows
    .map((r) => {
      try {
        return JSON.parse(r.payload) as ComandaState;
      } catch {
        return null;
      }
    })
    .filter((c): c is ComandaState => c != null);
}

export function upsertComandaInLocalStore(comanda: ComandaState): ComandaState {
  const db = getLocalStoreDb();
  const now = new Date().toISOString();
  const existing = db.select().from(storeComandas).where(eq(storeComandas.id, comanda.id)).get();
  const revision = (existing?.revision ?? 0) + 1;
  const withMeta: ComandaState = {
    ...comanda,
    storeUpdatedAt: now,
    storeRevision: revision,
  };
  const row = {
    id: comanda.id,
    status: comanda.status,
    payload: JSON.stringify(withMeta),
    updatedAt: now,
    revision,
  };
  if (existing) {
    db.update(storeComandas).set(row).where(eq(storeComandas.id, comanda.id)).run();
  } else {
    db.insert(storeComandas).values(row).run();
  }
  return withMeta;
}

export function deleteComandaFromLocalStore(id: string) {
  const db = getLocalStoreDb();
  db.delete(storeComandas).where(eq(storeComandas.id, id)).run();
}
