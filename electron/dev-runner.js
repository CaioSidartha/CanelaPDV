/**
 * Sobe Next e, quando a porta 3000 responder, abre o Electron.
 * Uso: npm run desktop:dev
 */
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DEV_URL = "http://127.0.0.1:3000";

function waitForServer(url, attempts = 60) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const tick = () => {
      n += 1;
      const req = http.get(url, (res) => {
        res.resume();
        resolve(true);
      });
      req.on("error", () => {
        if (n >= attempts) reject(new Error("Next não subiu a tempo (porta 3000)."));
        else setTimeout(tick, 1000);
      });
    };
    tick();
  });
}

const next = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["next", "dev", "-p", "3000"],
  { cwd: ROOT, stdio: "inherit", shell: true },
);

waitForServer(DEV_URL)
  .then(() => {
    const electronBin = require("electron");
    const elec = spawn(electronBin, ["."], {
      cwd: ROOT,
      stdio: "inherit",
      env: { ...process.env, PADARIA_DEV_URL: DEV_URL },
    });
    elec.on("exit", (code) => {
      next.kill();
      process.exit(code ?? 0);
    });
  })
  .catch((err) => {
    console.error(err);
    next.kill();
    process.exit(1);
  });

process.on("SIGINT", () => {
  next.kill();
  process.exit(0);
});
