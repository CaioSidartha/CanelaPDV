/**
 * Sobe o Next.js standalone embutido no instalador (Fase C — PDV sem depender do Render).
 */
const { spawn } = require("child_process");
const http = require("http");
const net = require("net");
const path = require("path");
const { app } = require("electron");
const { CANELA_LAN_SERVER_PORT } = require("./lan-constants");

/** @type {import('child_process').ChildProcess | null} */
let serverChild = null;
/** @type {number | null} */
let boundPort = null;

function standaloneDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "standalone");
  }
  return path.join(__dirname, "..", ".next", "standalone");
}

function pickPort(preferred) {
  if (preferred) {
    return Promise.resolve(preferred);
  }
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
 * @param {{ hostname?: string; port?: number; lanMode?: boolean }} opts
 * @returns {Promise<{ baseUrl: string; port: number; hostname: string }>}
 */
async function startEmbeddedNextServer(opts = {}) {
  const fs = require("fs");
  const dir = standaloneDir();
  const serverPath = path.join(dir, "server.js");
  if (!fs.existsSync(serverPath)) {
    throw new Error(`Bundle local ausente (${serverPath}). Gere o instalador com npm run release:win.`);
  }

  const lanMode = Boolean(opts.lanMode);
  const hostname = opts.hostname || (lanMode ? "0.0.0.0" : "127.0.0.1");
  const port = await pickPort(opts.port || (lanMode ? CANELA_LAN_SERVER_PORT : undefined));
  const healthHost = hostname === "0.0.0.0" ? "127.0.0.1" : hostname;
  const baseUrl = `http://${healthHost}:${port}`;

  const storeDbPath = path.join(app.getPath("userData"), "canela-store.db");
  fs.mkdirSync(path.dirname(storeDbPath), { recursive: true });

  serverChild = spawn(process.execPath, [serverPath], {
    cwd: dir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      HOSTNAME: hostname,
      PORT: String(port),
      CANELA_EMBEDDED: "1",
      CANELA_STORE_DB_PATH: storeDbPath,
    },
    stdio: "pipe",
  });

  boundPort = port;

  serverChild.on("error", (err) => {
    console.error("[embedded-server]", err);
  });
  serverChild.stdout?.on("data", (d) => process.stdout.write(d));
  serverChild.stderr?.on("data", (d) => process.stderr.write(d));

  await waitForHealth(baseUrl);
  return { baseUrl, port, hostname };
}

function stopEmbeddedNextServer() {
  if (!serverChild) return;
  try {
    serverChild.kill();
  } catch {
    /* ignore */
  }
  serverChild = null;
  boundPort = null;
}

function getBoundPort() {
  return boundPort;
}

module.exports = {
  startEmbeddedNextServer,
  stopEmbeddedNextServer,
  standaloneDir,
  getBoundPort,
};
