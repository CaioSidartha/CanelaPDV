import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/local/schema";

let _sqlite: Database.Database | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getLocalStoreDbPath(): string | null {
  const fromEnv = process.env.CANELA_STORE_DB_PATH?.trim();
  if (fromEnv) return fromEnv;
  return null;
}

export function isLocalStoreEnabled(): boolean {
  return Boolean(getLocalStoreDbPath());
}

function ensureSchema(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS store_comandas (
      id TEXT PRIMARY KEY NOT NULL,
      status TEXT NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      revision INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS store_comandas_status_idx ON store_comandas(status);
  `);
}

export function getLocalStoreDb() {
  const dbPath = getLocalStoreDbPath();
  if (!dbPath) {
    throw new Error("CANELA_STORE_DB_PATH não configurado.");
  }
  if (!_db) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    _sqlite = new Database(dbPath);
    _sqlite.pragma("journal_mode = WAL");
    ensureSchema(_sqlite);
    _db = drizzle(_sqlite, { schema });
  }
  return _db;
}

export { schema as localStoreSchema };
