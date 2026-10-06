/**
 * Sobe o Next.js standalone embutido no instalador (Fase C — PDV sem depender do Render).
 */
const { spawn } = require("child_process");
const http = require("http");
const net = require("net");
const path = require("path");
const { app } = require("electron");

/** @type {import('child_process').ChildProcess | null} */
let serverChild = null;

function standaloneDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "standalone");
  }
  return path.join(__dirname, "..", ".next", "standalone");
}

function pickPort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close(() => (port ? resolve(port) : reject(new Error("Porta inválida"))));
    });
    srv.on("error", reject);
  });
}

function waitForHealth(baseUrl, attempts = 90) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const tick = () => {
      n += 1;
      const req = http.get(`${baseUrl}/api/health`, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) resolve(true);
        else if (n >= attempts) reject(new Error("Servidor local não respondeu."));
        else setTimeout(tick, 500);
      });
      req.on("error", () => {
        if (n >= attempts) reject(new Error("Servidor local não subiu a tempo."));
        else setTimeout(tick, 500);
      });
      req.setTimeout(2000, () => {
        req.destroy();
      });
    };
    tick();
  });
}

/**
 * @returns {Promise<{ baseUrl: string }>}
 */
async function startEmbeddedNextServer() {
  const dir = standaloneDir();
  const serverPath = path.join(dir, "server.js");
  const fs = require("fs");
  if (!fs.existsSync(serverPath)) {
    throw new Error(`Bundle local ausente (${serverPath}). Gere o instalador com npm run release:win.`);
  }

  const port = await pickPort();
  const baseUrl = `http://127.0.0.1:${port}`;

  serverChild = spawn(process.execPath, [serverPath], {
    cwd: dir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      CANELA_EMBEDDED: "1",
    },
    stdio: "pipe",
  });

  serverChild.on("error", (err) => {
    console.error("[embedded-server]", err);
  });
  serverChild.stdout?.on("data", (d) => process.stdout.write(d));
  serverChild.stderr?.on("data", (d) => process.stderr.write(d));

  await waitForHealth(baseUrl);
  return { baseUrl };
}

function stopEmbeddedNextServer() {
  if (!serverChild) return;
  try {
    serverChild.kill();
  } catch {
    /* ignore */
  }
  serverChild = null;
}

module.exports = {
  startEmbeddedNextServer,
  stopEmbeddedNextServer,
  standaloneDir,
};
