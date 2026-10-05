/**
 * Processo principal Electron — casca do PDV baixável.
 * Dev: carrega http://localhost:3000 (Next)
 * Prod: sobe next start ou aponta para out/ (evolução)
 */
const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;
const DEV_URL = process.env.PADARIA_DEV_URL || "http://localhost:3000";

/** @type {BrowserWindow | null} */
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: "#2A2118",
    title: "Canela Store",
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

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
  } else {
    // Produção: por enquanto espera next start na porta 3000 embutida depois.
    // Próximo passo: embutir servidor Node no main ou export estático.
    mainWindow.loadURL("http://127.0.0.1:3000");
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("app:getInfo", () => ({
  version: app.getVersion(),
  isPackaged: app.isPackaged,
  platform: process.platform,
}));

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
