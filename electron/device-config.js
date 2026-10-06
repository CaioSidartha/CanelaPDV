/**
 * Configuração local do instalador: servidor vs terminal, URL LAN, pareamento.
 */
const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const { CANELA_LAN_SERVER_PORT } = require("./lan-constants");

const CONFIG_VERSION = 1;

function configPath() {
  return path.join(app.getPath("userData"), "device-config.json");
}

function installRoleSeedPath() {
  return path.join(app.getPath("userData"), "install-role.txt");
}

function legacyInstallRolePath() {
  const appData = process.env.APPDATA;
  if (!appData) return null;
  return path.join(appData, "Canela", "install-role.txt");
}

function defaultConfig() {
  return {
    version: CONFIG_VERSION,
    installRole: null,
    serverPort: CANELA_LAN_SERVER_PORT,
    terminalServerUrl: "",
    terminalLabel: "",
    terminalDeviceId: "",
    pairingCode: "",
    pairingExpiresAt: null,
    pairedTerminals: [],
    setupCompleted: false,
  };
}

function readInstallRoleSeed() {
  const paths = [installRoleSeedPath(), legacyInstallRolePath()].filter(Boolean);
  for (const p of paths) {
    try {
      if (!fs.existsSync(p)) continue;
      const role = fs.readFileSync(p, "utf8").trim().toLowerCase();
      if (role === "server" || role === "terminal") return role;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function readDeviceConfig() {
  const base = defaultConfig();
  try {
    const raw = fs.readFileSync(configPath(), "utf8");
    const parsed = JSON.parse(raw);
    return { ...base, ...parsed, version: CONFIG_VERSION };
  } catch {
    const seed = readInstallRoleSeed();
    if (seed) {
      return { ...base, installRole: seed, setupCompleted: false };
    }
    return base;
  }
}

function writeDeviceConfig(patch) {
  const current = readDeviceConfig();
  const next = { ...current, ...patch, version: CONFIG_VERSION };
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}

function generatePairingCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

module.exports = {
  readDeviceConfig,
  writeDeviceConfig,
  generatePairingCode,
  configPath,
};
