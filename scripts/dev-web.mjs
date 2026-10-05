/**
 * Sobe só o Next.js na porta 3000 (sem Electron, sem APIs extras).
 * Mata listener antigo na porta para evitar cache corrompido / CSS quebrado.
 *
 * Uso: npm run dev
 *      npm run dev:clean   (apaga .next antes)
 */
import { execSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 3000);
const clean = process.argv.includes("--clean");

function killPortWindows(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid)) pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F /T`, { stdio: "ignore" });
        console.log(`[dev-web] Encerrado processo ${pid} na porta ${port}.`);
      } catch {
        /* já morreu */
      }
    }
  } catch {
    /* porta livre */
  }
}

function killPort(port) {
  if (process.platform === "win32") killPortWindows(port);
}

if (clean) {
  try {
    rmSync(join(ROOT, ".next"), { recursive: true, force: true });
    console.log("[dev-web] Pasta .next removida.");
  } catch {
    /* ok */
  }
}

killPort(PORT);

const env = {
  ...process.env,
  ...(clean ? { PADARIA_NO_WEBPACK_CACHE: "1" } : {}),
};

const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(cmd, ["next", "dev", "-p", String(PORT)], {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
  env,
});

child.on("exit", (code) => process.exit(code ?? 0));

process.on("SIGINT", () => {
  child.kill("SIGINT");
});
