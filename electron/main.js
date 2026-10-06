/**
 * Processo principal Electron — casca do PDV baixável.
 * Dev: carrega http://localhost:3000 (Next)
 * Servidor empacotado: Next standalone em 0.0.0.0 (LAN)
 * Terminal empacotado: carrega URL do servidor salva
 */
const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");
const http = require("http");
const {
  startEmbeddedNextServer,
  stopEmbeddedNextServer,
  standaloneDir,
  getBoundPort,
} = require("./embedded-server");
const {
  readDeviceConfig,
  writeDeviceConfig,
  generatePairingCode,
} = require("./device-config");
const { buildNetworkHints } = require("./network-hints");
const { CANELA_LAN_SERVER_PORT } = require("./lan-constants");
const fs = require("fs");

const isDev = !app.isPackaged;
const DEV_URL = process.env.PADARIA_DEV_URL || "http://localhost:3000";
const REMOTE_APP_URL = (process.env.PADARIA_APP_URL || "https://canelapdv.onrender.com").replace(
  /\/$/,
  "",
);
const RELEASE_CHECK_URL = (
  process.env.PADARIA_RELEASE_URL || "https://canelapdv.onrender.com"
).replace(/\/$/, "");

/** @type {string | null} */
let appBaseUrl = null;

function compareSemver(a, b) {
  const pa = String(a).split(".").map((x) => parseInt(x, 10) || 0);
  const pb = String(b).split(".").map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

function normalizeServerUrl(input, port = CANELA_LAN_SERVER_PORT) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  let url = raw;
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  try {
    const u = new URL(url);
    if (!u.port) u.port = String(port);
    u.pathname = "";
    u.search = "";
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function getInstallRole() {
  const cfg = readDeviceConfig();
  return cfg.installRole;
}

function shouldUseEmbeddedServer() {
  if (process.env.PADARIA_APP_URL) return false;
  if (process.env.PADARIA_FORCE_REMOTE === "1") return false;
  const role = getInstallRole();
  if (role === "terminal") return false;
  if (isDev) return process.env.PADARIA_USE_EMBEDDED === "1" || role === "server";
  const serverJs = path.join(standaloneDir(), "server.js");
  if (!fs.existsSync(serverJs)) return false;
  if (role === "server") return true;
  if (!role) return true;
  return false;
}

function testServerHealth(baseUrl) {
  return new Promise((resolve) => {
    const started = Date.now();
    const url = `${normalizeServerUrl(baseUrl)}/api/health`;
    if (!url) {
      resolve({ ok: false, error: "Endereço inválido." });
      return;
    }
    const req = http.get(url, (res) => {
      res.resume();
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
        resolve({ ok: true, latencyMs: Date.now() - started });
      } else {
        resolve({ ok: false, error: `Resposta ${res.statusCode}` });
      }
    });
    req.on("error", (e) => {
      resolve({ ok: false, error: e.message || "Falha na conexão." });
    });
    req.setTimeout(8000, () => {
      req.destroy();
      resolve({ ok: false, error: "Tempo esgotado." });
    });
  });
}

async function resolveAppBaseUrl() {
  if (isDev && !process.env.PADARIA_USE_EMBEDDED) {
    return DEV_URL.replace(/\/$/, "");
  }

  const cfg = readDeviceConfig();
  if (cfg.installRole === "terminal") {
    const url = normalizeServerUrl(cfg.terminalServerUrl);
    if (url) return url;
    if (isDev) return DEV_URL.replace(/\/$/, "");
    return REMOTE_APP_URL;
  }

  if (!shouldUseEmbeddedServer()) return REMOTE_APP_URL;

  const lanMode = cfg.installRole === "server" || !cfg.installRole || app.isPackaged;
  const { baseUrl, port } = await startEmbeddedNextServer({
    lanMode,
    port: cfg.serverPort || CANELA_LAN_SERVER_PORT,
    hostname: lanMode ? "0.0.0.0" : "127.0.0.1",
  });
  writeDeviceConfig({ serverPort: port });
  return baseUrl;
}

function buildPublicServerUrl() {
  const cfg = readDeviceConfig();
  const port = getBoundPort() || cfg.serverPort || CANELA_LAN_SERVER_PORT;
  const hints = buildNetworkHints(port);
  return hints.terminalBaseUrl || `http://127.0.0.1:${port}`;
}

/** @type {BrowserWindow | null} */
let mainWindow = null;

async function createWindow() {
  if (!appBaseUrl) {
    appBaseUrl = await resolveAppBaseUrl();
  }

  const cfg = readDeviceConfig();
  const startPath =
    cfg.installRole === "terminal" && !normalizeServerUrl(cfg.terminalServerUrl)
      ? "/configuracoes?tab=terminais"
      : "/login";

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: "#2A2118",
    title: "Canela",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    if (isDev) mainWindow?.webContents.openDevTools({ mode: "detach" });
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  await mainWindow.loadURL(`${appBaseUrl}${startPath}`);
}

app.whenReady().then(() => {
  createWindow().catch((err) => {
    console.error(err);
    app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch((err) => {
        console.error(err);
        app.quit();
      });
    }
  });
});

app.on("before-quit", () => {
  stopEmbeddedNextServer();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("app:getInfo", () => {
  const cfg = readDeviceConfig();
  return {
    version: app.getVersion(),
    isPackaged: app.isPackaged,
    platform: process.platform,
    embedded: shouldUseEmbeddedServer(),
    appBaseUrl: appBaseUrl || REMOTE_APP_URL,
    installRole: cfg.installRole,
    setupCompleted: cfg.setupCompleted,
    serverPublicUrl: cfg.installRole === "server" ? buildPublicServerUrl() : "",
    terminalServerUrl: cfg.terminalServerUrl || "",
  };
});

ipcMain.handle("device:getConfig", () => {
  const cfg = readDeviceConfig();
  const port = getBoundPort() || cfg.serverPort || CANELA_LAN_SERVER_PORT;
  const hints = buildNetworkHints(port);
  return {
    ...cfg,
    serverPublicUrl: cfg.installRole === "server" ? hints.terminalBaseUrl : "",
    networkHints: hints,
  };
});

ipcMain.handle("device:setConfig", (_evt, patch) => {
  const safe = { ...patch };
  if (safe.terminalServerUrl) {
    safe.terminalServerUrl = normalizeServerUrl(safe.terminalServerUrl);
  }
  if (safe.serverPort) {
    safe.serverPort = Number(safe.serverPort) || CANELA_LAN_SERVER_PORT;
  }
  const next = writeDeviceConfig(safe);
  return next;
});

ipcMain.handle("device:getNetworkHints", () => {
  const cfg = readDeviceConfig();
  const port = getBoundPort() || cfg.serverPort || CANELA_LAN_SERVER_PORT;
  return buildNetworkHints(port);
});

ipcMain.handle("device:testServerUrl", async (_evt, url) => testServerHealth(url));

ipcMain.handle("device:generatePairingCode", () => {
  const code = generatePairingCode();
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  writeDeviceConfig({ pairingCode: code, pairingExpiresAt: expires });
  return { code, expiresAt: expires };
});

ipcMain.handle("device:registerTerminal", (_evt, payload) => {
  const cfg = readDeviceConfig();
  const code = String(payload?.pairingCode || "").trim();
  const label = String(payload?.label || "Terminal").trim() || "Terminal";
  if (!cfg.pairingCode || cfg.pairingCode !== code) {
    return { ok: false, error: "Código de pareamento inválido." };
  }
  if (cfg.pairingExpiresAt && new Date(cfg.pairingExpiresAt).getTime() < Date.now()) {
    return { ok: false, error: "Código expirado. Gere outro no servidor." };
  }
  const entry = {
    id: `term-${Date.now()}`,
    label,
    deviceId: String(payload?.deviceId || ""),
    pairedAt: new Date().toISOString(),
  };
  const paired = [...(cfg.pairedTerminals || []), entry];
  writeDeviceConfig({
    pairedTerminals: paired,
    pairingCode: "",
    pairingExpiresAt: null,
    terminalDeviceId: entry.id,
    terminalLabel: label,
  });
  return { ok: true, terminal: entry };
});

ipcMain.handle("device:reloadApp", async () => {
  appBaseUrl = null;
  stopEmbeddedNextServer();
  appBaseUrl = await resolveAppBaseUrl();
  if (mainWindow) {
    const cfg = readDeviceConfig();
    const startPath =
      cfg.installRole === "terminal" && !normalizeServerUrl(cfg.terminalServerUrl)
        ? "/configuracoes?tab=terminais"
        : "/login";
    await mainWindow.loadURL(`${appBaseUrl}${startPath}`);
  }
  return { ok: true, appBaseUrl };
});

ipcMain.handle("app:checkForUpdates", async () => {
  const installedVersion = app.getVersion();
  try {
    const res = await fetch(`${RELEASE_CHECK_URL}/api/desktop/release`, { cache: "no-store" });
    if (!res.ok) {
      return { error: "Não foi possível consultar o servidor de versões." };
    }
    const manifest = await res.json();
    const latestDesktopVersion = manifest?.desktop?.version ?? installedVersion;
    const webVersion = manifest?.webVersion ?? installedVersion;
    const downloadUrl = manifest?.desktop?.windowsDownloadUrl ?? "";
    const updateAvailable = compareSemver(installedVersion, latestDesktopVersion) < 0;
    return {
      installedVersion,
      latestDesktopVersion,
      webVersion,
      updateAvailable,
      downloadUrl,
      releaseNotes: manifest?.desktop?.releaseNotes,
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Falha ao buscar atualizações.",
    };
  }
});

ipcMain.handle("hardware:scale:read", async () => {
  await new Promise((r) => setTimeout(r, 300));
  const grams = Math.round(80 + Math.random() * 820);
  return {
    ok: true,
    grams,
    kg: grams / 1000,
    stable: true,
    provider: "simulacao",
    simulated: true,
  };
});

ipcMain.handle("hardware:payment:start", async (_evt, payload) => {
  const amount = Number(payload?.amount) || 0;
  const type = payload?.type || "debito";
  await new Promise((r) => setTimeout(r, 1500));
  if (amount <= 0) return { ok: false, error: "Valor inválido." };
  if (Math.random() < 0.08) {
    return {
      ok: true,
      approved: false,
      reason: "Pagamento recusado (simulação desktop).",
      provider: "simulacao",
      simulated: true,
    };
  }
  const method =
    type === "pix" ? "pix" : type === "credito" ? "cartao_credito" : "cartao_debito";
  const code = () => Math.random().toString(36).slice(2, 8).toUpperCase();
  return {
    ok: true,
    approved: true,
    authCode: `AUTH${code()}`,
    nsu: `NSU${code()}`,
    provider: "simulacao",
    simulated: true,
    method,
  };
});

ipcMain.handle("hardware:print:html", async (_evt, html) => {
  const source = typeof html === "string" ? html : "";
  if (!source.trim()) return { printed: false, reason: "Cupom vazio." };

  let printers = [];
  try {
    printers = mainWindow ? await mainWindow.webContents.getPrintersAsync() : [];
  } catch {
    printers = [];
  }
  const device = printers.find((p) => p.isDefault) || printers[0];
  if (!device) {
    return { printed: false, reason: "Nenhuma impressora encontrada neste computador." };
  }

  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, contextIsolation: true },
  });
  try {
    await win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(source));
    const printed = await new Promise((resolve) => {
      win.webContents.print(
        { silent: true, deviceName: device.name, printBackground: true },
        (success) => resolve(success),
      );
    });
    return printed
      ? { printed: true, printer: device.name }
      : { printed: false, reason: "A impressora recusou o cupom.", printer: device.name };
  } catch (e) {
    return { printed: false, reason: e instanceof Error ? e.message : "Falha na impressão." };
  } finally {
    if (!win.isDestroyed()) win.close();
  }
});
