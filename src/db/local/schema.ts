import { integer, sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";

/** Comanda operacional — payload JSON completo (fonte da verdade na LAN). */
export const storeComandas = sqliteTable("store_comandas", {
  id: text("id").primaryKey(),
  status: text("status").notNull(),
  payload: text("payload").notNull(),
  updatedAt: text("updated_at").notNull(),
  revision: integer("revision").notNull().default(0),
});

/** Entidades PDV (produto, venda, caixa, estoque…). */
export const storeEntities = sqliteTable(
  "store_entities",
  {
    kind: text("kind").notNull(),
    id: text("id").notNull(),
    payload: text("payload").notNull(),
    updatedAt: text("updated_at").notNull(),
    revision: integer("revision").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.kind, t.id] })],
);
