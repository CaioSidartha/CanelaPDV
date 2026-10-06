"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Eye, EyeOff, Network, RefreshCw, Server, Wifi } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CANELA_LAN_SERVER_PORT, maskServerUrl, normalizeServerBaseUrl } from "@/lib/lan-server";
import {
  fetchDeviceConfig,
  patchDeviceConfig,
  reloadDesktopApp,
  type DeviceConfigSnapshot,
  type DeviceInstallRole,
} from "@/lib/desktop-device";
import { isDesktopApp } from "@/lib/desktop-client";
import { isRoleAtLeast } from "@/lib/tenant-access";
import { useAppStore } from "@/store/useAppStore";

export function TerminalsSettingsPanel() {
  const authRole = useAppStore((s) => s.auth.role);
  const isAdmin = isRoleAtLeast(authRole, "gerente");
  const desktop = isDesktopApp();

  const [cfg, setCfg] = useState<DeviceConfigSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealUrl, setRevealUrl] = useState(false);
  const [terminalUrl, setTerminalUrl] = useState("");
  const [terminalLabel, setTerminalLabel] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [testOk, setTestOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!desktop) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await fetchDeviceConfig();
    setCfg(data);
    setTerminalUrl(data?.terminalServerUrl || "");
    setTerminalLabel(data?.terminalLabel || "");
    setLoading(false);
  }, [desktop]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!desktop) {
    return (
      <section className="panel-glass max-w-2xl p-6">
        <p className="text-sm text-zinc-400">
          Terminais e servidor local estão disponíveis no <strong className="text-zinc-200">app Windows</strong>{" "}
          (instalador Servidor ou Terminal).
        </p>
      </section>
    );
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Carregando configuração do aparelho…</p>;
  }

  const role = cfg?.installRole;
  const publicUrl =
    cfg?.serverPublicUrl ||
    cfg?.networkHints?.terminalBaseUrl ||
    (cfg?.networkHints?.suggestedIp
      ? `http://${cfg.networkHints.suggestedIp}:${cfg?.serverPort || CANELA_LAN_SERVER_PORT}`
      : "");

  const runTest = async (url: string) => {
    setBusy(true);
    setTestMsg(null);
    setTestOk(false);
    const normalized = normalizeServerBaseUrl(url);
    const viaMain = window.padariaDesktop?.testServerUrl;
    let result: { ok: true; latencyMs: number } | { ok: false; error: string };
    if (viaMain) {
      result = await viaMain(normalized);
    } else {
      try {
        const started = Date.now();
        const res = await fetch(`${normalized}/api/health`, { cache: "no-store" });
        result = res.ok
          ? { ok: true, latencyMs: Date.now() - started }
          : { ok: false, error: `Servidor respondeu com erro (${res.status}).` };
      } catch (e) {
        result = { ok: false, error: e instanceof Error ? e.message : "Falha na conexão." };
      }
    }
    setBusy(false);
    if (result.ok) {
      setTestOk(true);
      setTestMsg(`Conexão OK${"latencyMs" in result && result.latencyMs ? ` (${result.latencyMs} ms)` : ""}.`);
    } else {
      setTestMsg(result.error || "Falha na conexão.");
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setTestMsg("Copiado para a área de transferência.");
      setTestOk(true);
    } catch {
      setTestMsg("Não foi possível copiar.");
      setTestOk(false);
    }
  };

  const saveTerminal = async () => {
    setBusy(true);
    const url = normalizeServerBaseUrl(terminalUrl);
    if (!url) {
      setTestMsg("Informe o endereço do servidor.");
      setBusy(false);
      return;
    }
    await patchDeviceConfig({
      terminalServerUrl: url,
      terminalLabel: terminalLabel.trim() || "Terminal",
      setupCompleted: true,
    });
    if (pairingCode.trim() && window.padariaDesktop?.registerTerminal) {
      const reg = await window.padariaDesktop.registerTerminal({
        pairingCode: pairingCode.trim(),
        label: terminalLabel.trim() || "Terminal",
      });
      if (!reg.ok) {
        setTestMsg(reg.error);
        setBusy(false);
        return;
      }
    }
    setBusy(false);
    setTestMsg("Salvo. Reiniciando conexão com o servidor…");
    await reloadDesktopApp();
  };

  const setRole = async (installRole: DeviceInstallRole) => {
    if (!isAdmin) return;
    setBusy(true);
    await patchDeviceConfig({ installRole, setupCompleted: true });
    setBusy(false);
    await reloadDesktopApp();
  };

  const generateCode = async () => {
    if (!window.padariaDesktop?.generatePairingCode) return;
    const r = await window.padariaDesktop.generatePairingCode();
    setTestMsg(`Código para o terminal: ${r.code} (válido por 15 min)`);
    setTestOk(true);
    refresh();
  };

  return (
    <section className="space-y-6">
      {isAdmin && !role && (
        <div className="panel-glass p-6">
          <h2 className="text-lg font-semibold text-zinc-100">Papel deste computador</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Escolha se este PC é o servidor da loja ou um terminal de operação.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" disabled={busy} onClick={() => setRole("server")}>
              <Server className="mr-2 h-4 w-4" />
              Servidor da loja
            </Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => setRole("terminal")}>
              <Wifi className="mr-2 h-4 w-4" />
              Terminal
            </Button>
          </div>
        </div>
      )}

      {role === "server" && (
        <div className="panel-glass p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Endereço para os terminais</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Use este endereço em cada terminal em &quot;Conectar ao servidor&quot;. Porta padrão:{" "}
                {cfg?.serverPort || CANELA_LAN_SERVER_PORT}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => refresh()}
              className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:bg-white/5"
              title="Atualizar rede"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-brand/30 bg-brand/5 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Endereço de uso</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="font-mono text-sm text-zinc-100">
                {revealUrl ? publicUrl || "—" : maskServerUrl(publicUrl)}
              </p>
              <button
                type="button"
                onClick={() => setRevealUrl((v) => !v)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10"
                aria-label={revealUrl ? "Ocultar" : "Mostrar"}
              >
                {revealUrl ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                type="button"
                disabled={!publicUrl}
                onClick={() => copyText(publicUrl)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10"
                title="Copiar"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          {cfg?.networkHints?.dhcpWarning && (
            <p className="mt-3 text-xs text-amber-200/90">{cfg.networkHints.dhcpWarning}</p>
          )}

          {(cfg?.networkHints?.addresses?.length ?? 0) > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase text-zinc-500">Interfaces detectadas</p>
              <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                {cfg?.networkHints?.addresses.map((a) => (
                  <li key={`${a.interface}-${a.address}`} className="font-mono">
                    <Network className="mr-1 inline h-3.5 w-3.5" />
                    {a.interface}: {a.address}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isAdmin && (
            <div className="mt-6 border-t border-white/10 pt-4">
              <h3 className="text-sm font-semibold text-zinc-200">Pareamento (opcional)</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Gere um código e digite no terminal ao conectar, para registrar o posto.
              </p>
              <Button type="button" className="mt-3" variant="secondary" size="sm" onClick={generateCode}>
                Gerar código de pareamento
              </Button>
              {cfg?.pairingCode && (
                <p className="mt-2 font-mono text-lg text-brand">{cfg.pairingCode}</p>
              )}
              {(cfg?.pairedTerminals?.length ?? 0) > 0 && (
                <ul className="mt-3 text-sm text-zinc-400">
                  {cfg?.pairedTerminals?.map((t) => (
                    <li key={t.id}>
                      {t.label} — {new Date(t.pairedAt).toLocaleString("pt-BR")}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {role === "terminal" && (
        <div className="panel-glass p-6">
          <h2 className="text-lg font-semibold text-zinc-100">Conectar ao servidor</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Cole o endereço exibido no servidor (Configurações → Terminais). O teste usa a API de saúde do Canela.
          </p>
          <div className="mt-4 space-y-3 max-w-lg">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Endereço do servidor</label>
              <Input
                value={terminalUrl}
                onChange={(e) => setTerminalUrl(e.target.value)}
                placeholder={`http://192.168.0.10:${CANELA_LAN_SERVER_PORT}`}
                className="font-mono text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Nome deste posto (opcional)</label>
              <Input
                value={terminalLabel}
                onChange={(e) => setTerminalLabel(e.target.value)}
                placeholder="Ex.: Caixa 1, Rampa"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Código de pareamento (opcional)</label>
              <Input
                value={pairingCode}
                onChange={(e) => setPairingCode(e.target.value)}
                placeholder="6 dígitos"
                className="font-mono"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" disabled={busy} onClick={() => runTest(terminalUrl)}>
                Testar conexão
              </Button>
              <Button type="button" disabled={busy} onClick={saveTerminal}>
                Salvar e conectar
              </Button>
            </div>
          </div>
        </div>
      )}

      {testMsg && (
        <p
          className={`text-sm ${testOk ? "text-emerald-300" : "text-amber-200"}`}
          role="status"
        >
          {testMsg}
        </p>
      )}

      {isAdmin && role && (
        <p className="text-xs text-zinc-600">
          Este aparelho está como <strong className="text-zinc-400">{role === "server" ? "Servidor" : "Terminal"}</strong>.
          Para trocar o papel, reinstale ou ajuste em suporte avançado.
        </p>
      )}
    </section>
  );
}
