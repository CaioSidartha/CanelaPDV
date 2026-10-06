import { and, eq } from "drizzle-orm";
import { getLocalStoreDb } from "@/db/local";
import { storeEntities } from "@/db/local/schema";

export type StoreEntityKind =
  | "category"
  | "product"
  | "sale"
  | "cash_session"
  | "cash_movement"
  | "stock_movement";

type WithId = { id: string; storeRevision?: number; storeUpdatedAt?: string };

function stamp<T extends WithId>(item: T, revision: number): T {
  const now = new Date().toISOString();
  return { ...item, storeRevision: revision, storeUpdatedAt: now };
}

export function listEntitiesByKind<T extends WithId>(kind: StoreEntityKind): T[] {
  const db = getLocalStoreDb();
  const rows = db.select().from(storeEntities).where(eq(storeEntities.kind, kind)).all();
  return rows
    .map((r) => {
      try {
        return JSON.parse(r.payload) as T;
      } catch {
        return null;
      }
    })
    .filter((x): x is T => x != null);
}

export function upsertEntity<T extends WithId>(kind: StoreEntityKind, item: T): T {
  const db = getLocalStoreDb();
  const existing = db
    .select()
    .from(storeEntities)
    .where(and(eq(storeEntities.kind, kind), eq(storeEntities.id, item.id)))
    .get();
  const revision = (existing?.revision ?? 0) + 1;
  const stamped = stamp(item, revision);
  const row = {
    kind,
    id: item.id,
    payload: JSON.stringify(stamped),
    updatedAt: stamped.storeUpdatedAt!,
    revision,
  };
  if (existing) {
    db.update(storeEntities)
      .set(row)
      .where(and(eq(storeEntities.kind, kind), eq(storeEntities.id, item.id)))
      .run();
  } else {
    db.insert(storeEntities).values(row).run();
  }
  return stamped;
}

export function upsertEntityList<T extends WithId>(kind: StoreEntityKind, items: T[]): T[] {
  return items.map((item) => upsertEntity(kind, item));
}
