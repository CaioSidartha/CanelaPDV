"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePlatformStore } from "@/store/usePlatformStore";

export default function PlatformSettingsPage() {
  const settings = usePlatformStore((s) => s.settings);
  const setLeadNotifyEmail = usePlatformStore((s) => s.setLeadNotifyEmail);
  const savePlatformSettings = usePlatformStore((s) => s.savePlatformSettings);
  const [email, setEmail] = useState(settings.leadNotifyEmail);
  const [desktopVersion, setDesktopVersion] = useState(settings.desktopRelease?.version ?? "");
  const [desktopUrl, setDesktopUrl] = useState(settings.desktopRelease?.windowsDownloadUrl ?? "");
  const [desktopNotes, setDesktopNotes] = useState(settings.desktopRelease?.releaseNotes ?? "");

  useEffect(() => {
    setEmail(settings.leadNotifyEmail);
    setDesktopVersion(settings.desktopRelease?.version ?? "");
    setDesktopUrl(settings.desktopRelease?.windowsDownloadUrl ?? "");
    setDesktopNotes(settings.desktopRelease?.releaseNotes ?? "");
  }, [settings]);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const saveLeads = async (e: React.FormEvent) => {
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
    setMsg("E-mail de leads salvo.");
  };

  const saveDesktop = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    const res = await savePlatformSettings({
      desktopRelease: {
        version: desktopVersion.trim(),
        windowsDownloadUrl: desktopUrl.trim(),
        releaseNotes: desktopNotes.trim() || undefined,
      },
    });
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setMsg(
      "Versão desktop publicada. Lojas com modo híbrido/offline verão «Baixar para Windows» e o app instalado poderá buscar atualizações.",
    );
  };

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-stone-50">Configurações</h1>
        <p className="mt-1 text-sm text-stone-400">Leads do site, app Windows e versões.</p>
      </div>

      <form
        onSubmit={(e) => void saveLeads(e)}
        className="rounded-xl border border-stone-800 bg-[#141210] p-6 space-y-4"
      >
        <h2 className="text-sm font-semibold text-stone-200">Leads do site</h2>
        <div>
          <label className="mb-1 block text-xs font-semibold text-stone-500">E-mail para receber solicitações</label>
          <Input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-stone-700 bg-stone-900/80 text-stone-100"
          />
        </div>
        <Button type="submit" disabled={busy}>Salvar e-mail</Button>
      </form>

      <form
        onSubmit={(e) => void saveDesktop(e)}
        className="rounded-xl border border-stone-800 bg-[#141210] p-6 space-y-4"
      >
        <h2 className="text-sm font-semibold text-stone-200">App Windows (clientes)</h2>
        <p className="text-xs text-stone-500 leading-relaxed">
          Ao subir o Render, a <strong className="text-stone-400">versão online</strong> segue o{" "}
          <code className="text-stone-400">package.json</code>. Aqui você publica a{" "}
          <strong className="text-stone-400">versão do instalador</strong> e o link do .exe (GitHub Releases, Drive, etc.).
          O painel da loja compara as duas; no app baixado, «Buscar atualizações» usa este manifesto.
        </p>
        <div>
          <label className="mb-1 block text-xs font-semibold text-stone-500">Versão do instalador</label>
          <Input
            placeholder="0.2.0"
            value={desktopVersion}
            onChange={(e) => setDesktopVersion(e.target.value)}
            className="border-stone-700 bg-stone-900/80 text-stone-100"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-stone-500">URL do .exe (download direto)</label>
          <Input
            placeholder="https://github.com/.../Canela-Setup-0.2.0.exe"
            value={desktopUrl}
            onChange={(e) => setDesktopUrl(e.target.value)}
            className="border-stone-700 bg-stone-900/80 text-stone-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-stone-500">Notas da versão (opcional)</label>
          <textarea
            value={desktopNotes}
            onChange={(e) => setDesktopNotes(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-stone-700 bg-stone-900/80 px-3 py-2 text-sm text-stone-100"
          />
        </div>
        <Button type="submit" disabled={busy}>{busy ? "Salvando…" : "Publicar versão desktop"}</Button>
      </form>

      {err && <p className="text-sm text-red-400">{err}</p>}
      {msg && <p className="text-sm text-emerald-500/90">{msg}</p>}
    </div>
  );
}
