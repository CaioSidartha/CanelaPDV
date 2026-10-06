/**
 * Preload — bridge segura renderer ↔ main (sem nodeIntegration).
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("padariaDesktop", {
  getInfo: () => ipcRenderer.invoke("app:getInfo"),
  checkForUpdates: () => ipcRenderer.invoke("app:checkForUpdates"),
  isDesktop: true,
  readScale: () => ipcRenderer.invoke("hardware:scale:read"),
  startPayment: (payload) => ipcRenderer.invoke("hardware:payment:start", payload),
  printHtml: (html) => ipcRenderer.invoke("hardware:print:html", html),
  getDeviceConfig: () => ipcRenderer.invoke("device:getConfig"),
  setDeviceConfig: (patch) => ipcRenderer.invoke("device:setConfig", patch),
  getNetworkHints: () => ipcRenderer.invoke("device:getNetworkHints"),
  testServerUrl: (url) => ipcRenderer.invoke("device:testServerUrl", url),
  generatePairingCode: () => ipcRenderer.invoke("device:generatePairingCode"),
  registerTerminal: (payload) => ipcRenderer.invoke("device:registerTerminal", payload),
  reloadDesktopApp: () => ipcRenderer.invoke("device:reloadApp"),
});
