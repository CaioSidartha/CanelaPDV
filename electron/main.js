/**
 * Processo principal Electron — casca do PDV baixável.
 * Dev: carrega http://localhost:3000 (Next)
 * Prod empacotado: servidor Next standalone local (sem Render)
 * Override: PADARIA_APP_URL aponta para URL remota
 */
const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");
const {
  startEmbeddedNextServer,
  stopEmbeddedNextServer,
  standaloneDir,
} = require("./embedded-server");
const fs = require("fs");

const isDev = !app.isPackaged;
const DEV_URL = process.env.PADARIA_DEV_URL || "http://localhost:3000";
const REMOTE_APP_URL = (process.env.PADARIA_APP_URL || "https://canelapdv.onrender.com").replace(
  /\/$/,
  "",
);
/** Manifest de versão / download do .exe — sempre na nuvem. */
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

function shouldUseEmbeddedServer() {
  if (process.env.PADARIA_APP_URL) return false;
  if (process.env.PADARIA_FORCE_REMOTE === "1") return false;
  if (isDev) return process.env.PADARIA_USE_EMBEDDED === "1";
  const serverJs = path.join(standaloneDir(), "server.js");
  return fs.existsSync(serverJs);
}

async function resolveAppBaseUrl() {
  if (isDev) return DEV_URL.replace(/\/$/, "");
  if (!shouldUseEmbeddedServer()) return REMOTE_APP_URL;
  const { baseUrl } = await startEmbeddedNextServer();
  return baseUrl;
}

/** @type {BrowserWindow | null} */
let mainWindow = null;

async function createWindow() {
  if (!appBaseUrl) {
    appBaseUrl = await resolveAppBaseUrl();
  }

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

  await mainWindow.loadURL(`${appBaseUrl}/login`);
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

ipcMain.handle("app:getInfo", () => ({
  version: app.getVersion(),
  isPackaged: app.isPackaged,
  platform: process.platform,
  embedded: shouldUseEmbeddedServer(),
  appBaseUrl: appBaseUrl || REMOTE_APP_URL,
}));

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

/** Balança — simulação no main; trocar pelo conector real depois. */
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

/** Maquininha — simulação no main; trocar pelo SDK da adquirente depois. */
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

/** Cupom — impressão silenciosa se houver impressora no Windows. */
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
