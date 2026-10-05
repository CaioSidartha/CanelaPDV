"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CanelaLogo } from "@/components/brand/CanelaLogo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAppStore } from "@/store/useAppStore";

export default function LoginPage() {
  const login = useAppStore((s) => s.login);
  const company = useAppStore((s) => s.company);
  const router = useRouter();
  const [email, setEmail] = useState("admin@loja.local");
  const [password, setPassword] = useState("admin123");
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
    router.replace("/inicio");
  };

  return (
    <div className="relative flex min-h-screen flex-col lg:flex-row">
      <div
        className="relative hidden flex-1 flex-col justify-between overflow-hidden p-10 lg:flex"
        style={{
          background:
            "linear-gradient(145deg, #3d2e1f 0%, #2A2118 45%, #1a1510 100%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 20%, rgba(217,119,6,0.35), transparent), radial-gradient(ellipse 50% 40% at 90% 80%, rgba(245,158,11,0.15), transparent)",
          }}
        />
        <Link
          href="/site"
          className="relative z-10 inline-flex items-center gap-2 text-sm font-medium text-amber-100/80 transition-colors hover:text-amber-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao site
        </Link>
        <div className="relative z-10 flex flex-col items-start">
          <CanelaLogo className="max-w-[280px] brightness-110 drop-shadow-lg" priority />
          <p className="mt-8 max-w-md text-lg leading-relaxed text-[#E8DFD4]/90">
            Gestão para quem produz de verdade — PDV, estoque e fiscal no ritmo da sua bancada.
          </p>
        </div>
        <p className="relative z-10 text-xs text-stone-500">© Canela · Acesso seguro da sua loja</p>
      </div>

      <div
        className="flex flex-1 flex-col justify-center px-4 py-10"
        style={{ background: "var(--background)" }}
      >
        <Link
          href="/site"
          className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao site
        </Link>

        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <CanelaLogo className="mx-auto max-w-[200px]" priority />
          </div>

          <div className="mb-6">
            <h1 className="font-display text-2xl font-semibold text-[var(--foreground)]">
              Entrar na loja
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {company.name} — use o e-mail cadastrado no seu contrato.
            </p>
          </div>

          <form
            onSubmit={(e) => void onSubmit(e)}
            className="space-y-4 rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-6 shadow-xl"
          >
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--muted-foreground)]">E-mail</label>
              <Input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-[var(--border)] bg-[var(--input)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--muted-foreground)]">Senha</label>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-[var(--border)] bg-[var(--input)]"
              />
            </div>
            {err && (
              <p className="rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                {err}
              </p>
            )}
            <Button type="submit" className="w-full bg-brand hover:bg-brand-light" disabled={busy}>
              {busy ? "Entrando…" : "Acessar sistema"}
            </Button>
          </form>

          <details className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--input)]/50 px-4 py-3 text-xs text-[var(--muted-foreground)]">
            <summary className="cursor-pointer font-semibold text-[var(--foreground)]">Demo local</summary>
            <p className="mt-2">Admin: admin@loja.local / admin123</p>
            <p>Caixa: caixa@loja.local / caixa123</p>
          </details>
        </div>
      </div>
    </div>
  );
}
