"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePlatformStore } from "@/store/usePlatformStore";
import type { CommercialPlanId, PlatformTenantKind, TenantDeployMode } from "@/types/platform";
import { defaultCapabilities } from "@/lib/tenant-snapshot";

type Props = {
  kind: PlatformTenantKind;
  onClose: () => void;
  onCreated?: (info: { tenantId: string; adminEmail: string; adminPassword: string }) => void;
};

export function CreateTenantModal({ kind, onClose, onCreated }: Props) {
  const createTenant = usePlatformStore((s) => s.createTenant);
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [planId, setPlanId] = useState<CommercialPlanId>(kind === "test" ? "essencial" : "completo");
  const [deployMode, setDeployMode] = useState<TenantDeployMode>("hybrid");
  const [fiscalEnabled, setFiscalEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const cap = defaultCapabilities({
      deployMode,
      fiscalEnabled,
      onlineEnabled: deployMode !== "offline",
      offlineEnabled: deployMode !== "online",
      desktopDownloadEnabled: deployMode !== "online",
    });
    const res = await createTenant({
      kind,
      name,
      document,
      planId,
      capabilities: cap,
    });
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    onCreated?.({
      tenantId: res.tenant.id,
      adminEmail: res.tenant.adminEmail,
      adminPassword: res.adminPassword,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form
        onSubmit={(e) => void submit(e)}
        className="w-full max-w-md rounded-xl border border-stone-700 bg-[#1a1714] p-6 shadow-2xl"
      >
        <h2 className="font-display text-xl font-semibold text-stone-50">
          {kind === "test" ? "Nova empresa teste" : "Nova conta cliente"}
        </h2>
        <p className="mt-1 text-sm text-stone-400">
          Nome e CPF/CNPJ bastam; o app completo fica disponível conforme os limites abaixo.
        </p>

        <div className="mt-5 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Nome</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="border-stone-700 bg-stone-900/80" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">CPF ou CNPJ</label>
            <Input
              value={document}
              onChange={(e) => setDocument(e.target.value)}
              placeholder="Somente números ou formatado"
              className="border-stone-700 bg-stone-900/80"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Plano</label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value as CommercialPlanId)}
              className="w-full rounded-xl border border-stone-700 bg-stone-900/80 px-3 py-2 text-sm text-stone-100"
            >
              <option value="essencial">Essencial — R$ 500/mês</option>
              <option value="completo">Completo — R$ 650/mês</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Modo de uso</label>
            <select
              value={deployMode}
              onChange={(e) => setDeployMode(e.target.value as TenantDeployMode)}
              className="w-full rounded-xl border border-stone-700 bg-stone-900/80 px-3 py-2 text-sm text-stone-100"
            >
              <option value="hybrid">Online + offline (padrão)</option>
              <option value="online">Somente online</option>
              <option value="offline">Somente offline / local</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-300">
            <input type="checkbox" checked={fiscalEnabled} onChange={(e) => setFiscalEnabled(e.target.checked)} />
            Módulo fiscal (NFC-e / XML)
          </label>
        </div>

        {err && <p className="mt-3 text-sm text-red-400">{err}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Criando…" : "Criar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
