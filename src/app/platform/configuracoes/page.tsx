"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePlatformStore } from "@/store/usePlatformStore";

export default function PlatformSettingsPage() {
  const settings = usePlatformStore((s) => s.settings);
  const setLeadNotifyEmail = usePlatformStore((s) => s.setLeadNotifyEmail);
  const [email, setEmail] = useState(settings.leadNotifyEmail);

  useEffect(() => {
    setEmail(settings.leadNotifyEmail);
  }, [settings.leadNotifyEmail]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    const res = await setLeadNotifyEmail(email);
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setMsg("Salvo. Solicitações do site com opção de e-mail vão para este endereço.");
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-stone-50">Configurações</h1>
        <p className="mt-1 text-sm text-stone-400">
          Leads do site e notificações por e-mail.
        </p>
      </div>

      <form
        onSubmit={(e) => void save(e)}
        className="rounded-xl border border-stone-800 bg-[#141210] p-6 space-y-4"
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-stone-500">
            E-mail para receber solicitações
          </label>
          <Input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-stone-700 bg-stone-900/80 text-stone-100"
          />
          <p className="mt-2 text-xs text-stone-500">
            Quando o visitante marcar &quot;enviar também por e-mail&quot; no site, os dados vão para este endereço.
          </p>
        </div>

        {err && <p className="text-sm text-red-400">{err}</p>}
        {msg && <p className="text-sm text-emerald-500/90">{msg}</p>}

        <Button type="submit" disabled={busy}>
          {busy ? "Salvando…" : "Salvar"}
        </Button>
      </form>

      <div className="rounded-xl border border-stone-800 bg-stone-950/50 p-4 text-xs text-stone-500 leading-relaxed">
        <p className="font-semibold text-stone-400">Envio real (servidor)</p>
        <p className="mt-2">
          Em desenvolvimento, sem SMTP/Resend, o e-mail aparece no terminal do <code className="text-stone-400">npm run dev</code>.
        </p>
        <p className="mt-2">
          Produção: configure no <code className="text-stone-400">.env</code>{" "}
          <code className="text-stone-400">RESEND_API_KEY</code> + <code className="text-stone-400">LEAD_EMAIL_FROM</code>, ou{" "}
          <code className="text-stone-400">SMTP_HOST</code>, <code className="text-stone-400">SMTP_PORT</code>,{" "}
          <code className="text-stone-400">SMTP_USER</code>, <code className="text-stone-400">SMTP_PASS</code>.
        </p>
      </div>
    </div>
  );
}
