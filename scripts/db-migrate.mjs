import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Defina DATABASE_URL (Neon pooled).");
  process.exit(1);
}

const sql = neon(url);
const dir = join(process.cwd(), "drizzle");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of files) {
  const body = readFileSync(join(dir, file), "utf8");
  console.log(`→ ${file}`);
  const chunks = body
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));
  for (const chunk of chunks) {
    await sql.query(chunk);
  }
}

console.log("Migrations aplicadas.");
