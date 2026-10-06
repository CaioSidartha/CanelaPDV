/** Porta padrão do servidor Canela na LAN (instalador / terminais). */
export const CANELA_LAN_SERVER_PORT = 3847;

export function normalizeServerBaseUrl(input: string, defaultPort = CANELA_LAN_SERVER_PORT): string {
  const raw = input.trim();
  if (!raw) return "";
  let url = raw;
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }
  try {
    const u = new URL(url);
    if (!u.port && defaultPort) u.port = String(defaultPort);
    u.pathname = "";
    u.search = "";
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

export async function testServerConnection(baseUrl: string): Promise<{ ok: true; latencyMs: number } | { ok: false; error: string }> {
  const base = normalizeServerBaseUrl(baseUrl);
  if (!base) return { ok: false, error: "Informe um endereço válido." };
  const started = Date.now();
  try {
    const res = await fetch(`${base}/api/health`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { ok: false, error: `Servidor respondeu com erro (${res.status}).` };
    return { ok: true, latencyMs: Date.now() - started };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível conectar.";
    return { ok: false, error: msg };
  }
}

export function maskServerUrl(url: string): string {
  if (!url) return "—";
  try {
    const u = new URL(url.startsWith("http") ? url : `http://${url}`);
    const host = u.hostname;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      const parts = host.split(".");
      return `http://${parts[0]}.***.***.${parts[3]}:${u.port || CANELA_LAN_SERVER_PORT}`;
    }
    return `${u.protocol}//${host.slice(0, 2)}***${host.slice(-2)}:${u.port || CANELA_LAN_SERVER_PORT}`;
  } catch {
    return "••••••••";
  }
}
