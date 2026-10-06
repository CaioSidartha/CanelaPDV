import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Comanda operacional — payload JSON completo (fonte da verdade na LAN). */
export const storeComandas = sqliteTable("store_comandas", {
  id: text("id").primaryKey(),
  status: text("status").notNull(),
  payload: text("payload").notNull(),
  updatedAt: text("updated_at").notNull(),
  revision: integer("revision").notNull().default(0),
});
