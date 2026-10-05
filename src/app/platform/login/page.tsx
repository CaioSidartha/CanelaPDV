"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PRODUCT_NAME } from "@/config/brand";
import { usePlatformStore } from "@/store/usePlatformStore";

export default function PlatformLoginPage() {
  const login = usePlatformStore((s) => s.login);
  const router = useRouter();
  const [email, setEmail] = useState("master@canela.local");
  const [password, setPassword] = useState("master123");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await login(email, password);
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    router.replace("/platform");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0c0a09] px-4">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="w-full max-w-md rounded-xl border border-stone-800 bg-[#141210] p-8"
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">{PRODUCT_NAME}</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-stone-50">Painel master</h1>
        <p className="mt-2 text-sm text-stone-500">Contas, testes, cobrança simulada e leads do site.</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">E-mail</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-stone-700 bg-stone-900/80 text-stone-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Senha</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-stone-700 bg-stone-900/80 text-stone-100"
            />
          </div>
        </div>

        {err && <p className="mt-3 text-sm text-red-400">{err}</p>}

        <Button type="submit" className="mt-6 w-full" disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </Button>

        <p className="mt-4 text-center text-xs text-stone-600">
          Demo: master@canela.local / master123
        </p>
      </form>
    </div>
  );
}
