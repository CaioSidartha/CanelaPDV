/**
 * Preload — bridge segura renderer ↔ main (sem nodeIntegration).
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("padariaDesktop", {
  getInfo: () => ipcRenderer.invoke("app:getInfo"),
  isDesktop: true,
  readScale: () => ipcRenderer.invoke("hardware:scale:read"),
  startPayment: (payload) => ipcRenderer.invoke("hardware:payment:start", payload),
  printHtml: (html) => ipcRenderer.invoke("hardware:print:html", html),
});
