"use client";

import { useEffect, useMemo, useState } from "react";
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

function slugFromName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24) || "loja";
}

export function CreateTenantModal({ kind, onClose, onCreated }: Props) {
  const createTenant = usePlatformStore((s) => s.createTenant);
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPassword2, setAdminPassword2] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [planId, setPlanId] = useState<CommercialPlanId>(kind === "test" ? "essencial" : "completo");
  const [deployMode, setDeployMode] = useState<TenantDeployMode>("hybrid");
  const [fiscalEnabled, setFiscalEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const suggestedEmail = useMemo(() => {
    const slug = slugFromName(name);
    const domain = kind === "test" ? "teste.local" : "loja.local";
    return `admin@${slug}.${domain}`;
  }, [name, kind]);

  useEffect(() => {
    if (!emailTouched && name.trim()) {
      setAdminEmail(suggestedEmail);
    }
  }, [suggestedEmail, emailTouched, name]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword !== adminPassword2) {
      setErr("As senhas não coincidem.");
      return;
    }
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
      adminEmail,
      adminPassword,
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
          Defina o login que a loja usará em <span className="text-stone-300">/login</span>.
        </p>

        <div className="mt-5 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Nome da empresa</label>
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
          <div className="rounded-lg border border-stone-800 bg-stone-950/50 p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600/90">Acesso ao app da loja</p>
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-500">E-mail</label>
              <Input
                type="email"
                value={adminEmail}
                onChange={(e) => {
                  setEmailTouched(true);
                  setAdminEmail(e.target.value);
                }}
                className="border-stone-700 bg-stone-900/80"
                required
                autoComplete="off"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-500">Senha</label>
              <Input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="border-stone-700 bg-stone-900/80"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-500">Confirmar senha</label>
              <Input
                type="password"
                value={adminPassword2}
                onChange={(e) => setAdminPassword2(e.target.value)}
                className="border-stone-700 bg-stone-900/80"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
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
            {busy ? "Criando…" : "Criar conta"}
          </Button>
        </div>
      </form>
    </div>
  );
}
