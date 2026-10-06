/**
 * Após `next build` com output standalone, copia static/public para o bundle do servidor embutido.
 */
import { cpSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const standaloneDir = path.join(root, ".next", "standalone");
const serverJs = path.join(standaloneDir, "server.js");

if (!existsSync(serverJs)) {
  console.error("Standalone não encontrado. Rode `npm run build` com output: 'standalone' no next.config.");
  process.exit(1);
}

const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(standaloneDir, ".next", "static");
const publicSrc = path.join(root, "public");
const publicDest = path.join(standaloneDir, "public");

mkdirSync(path.dirname(staticDest), { recursive: true });
cpSync(staticSrc, staticDest, { recursive: true });
cpSync(publicSrc, publicDest, { recursive: true });

console.log("Electron standalone preparado em", standaloneDir);
