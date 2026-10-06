"use client";

import { useEffect, useState } from "react";
import { Server, Wifi } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { isDesktopApp } from "@/lib/desktop-client";
import {
  fetchDeviceConfig,
  patchDeviceConfig,
  reloadDesktopApp,
  type DeviceInstallRole,
} from "@/lib/desktop-device";
import { CANELA_LAN_SERVER_PORT } from "@/lib/lan-server";

export function DesktopDeviceSetupWizard() {
  const [open, setOpen] = useState(false);
  const [hints, setHints] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isDesktopApp()) return;
    fetchDeviceConfig().then((cfg) => {
      if (!cfg) return;
      if (!cfg.installRole || !cfg.setupCompleted) {
        setOpen(true);
        const url = cfg.networkHints?.terminalBaseUrl;
        const warn = cfg.networkHints?.dhcpWarning;
        setHints(
          [url ? `Nos terminais, use: ${url}` : "", warn].filter(Boolean).join("\n\n"),
        );
      }
    });
  }, []);

  const choose = async (role: DeviceInstallRole) => {
    setBusy(true);
    await patchDeviceConfig({ installRole: role, setupCompleted: true });
    setBusy(false);
    setOpen(false);
    await reloadDesktopApp();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
        <h2 className="font-display text-xl font-semibold text-zinc-50">Configurar este computador</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Como você instalou no assistente do Windows, confirme o papel deste PC na loja.
        </p>
        <div className="mt-6 grid gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => choose("server")}
            className="flex items-start gap-3 rounded-xl border border-white/10 bg-zinc-950/50 p-4 text-left hover:border-brand/40"
          >
            <Server className="mt-0.5 h-5 w-5 text-brand" />
            <div>
              <p className="font-semibold text-zinc-100">Servidor da loja</p>
              <p className="mt-1 text-xs text-zinc-500">
                Banco e PDV na rede local. Porta sugerida: {CANELA_LAN_SERVER_PORT}.
              </p>
            </div>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => choose("terminal")}
            className="flex items-start gap-3 rounded-xl border border-white/10 bg-zinc-950/50 p-4 text-left hover:border-brand/40"
          >
            <Wifi className="mt-0.5 h-5 w-5 text-brand" />
            <div>
              <p className="font-semibold text-zinc-100">Terminal</p>
              <p className="mt-1 text-xs text-zinc-500">Caixa, rampa ou outro posto — conecta ao servidor.</p>
            </div>
          </button>
        </div>
        {hints && (
          <p className="mt-4 whitespace-pre-line rounded-lg bg-brand/10 px-3 py-2 text-xs text-zinc-300">{hints}</p>
        )}
        <Button type="button" variant="secondary" className="mt-4 w-full" disabled={busy} onClick={() => setOpen(false)}>
          Decidir depois em Configurações
        </Button>
      </div>
    </div>
  );
}
