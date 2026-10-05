"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { CanelaLogo } from "@/components/brand/CanelaLogo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePlatformStore } from "@/store/usePlatformStore";

/** Campos claros no site: texto escuro (o Input padrão usa text-zinc-100). */
const SITE_FIELD_CLASS =
  "border-[#D4C4B0] bg-white text-[#1a1510] placeholder:text-[#6B5D4D] shadow-none focus:border-[#D97706] focus:ring-amber-500/30";

export default function MarketingSitePage() {
  const recordSiteVisit = usePlatformStore((s) => s.recordSiteVisit);
  const addLead = usePlatformStore((s) => s.addLead);
  const [sent, setSent] = useState(false);
  const [sendByEmail, setSendByEmail] = useState(true);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", companyName: "", message: "" });

  useEffect(() => {
    recordSiteVisit();
  }, [recordSiteVisit]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setSubmitErr(null);
    addLead({
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      companyName: form.companyName || undefined,
      message: form.message || undefined,
      planInterest: "completo",
    });

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          planInterest: "completo",
          sendEmail: sendByEmail,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSubmitErr(
          data.error ??
            "Não foi possível registrar no servidor. Seu pedido ficou salvo neste navegador; tente de novo em instantes.",
        );
        setBusy(false);
        return;
      }
    } catch {
      setSubmitErr("Servidor offline — pedido salvo só neste navegador por enquanto.");
      setBusy(false);
      return;
    }

    setBusy(false);
    setSent(true);
  };

  return (
    <div className="overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 90% 50% at 50% -20%, rgba(217,119,6,0.18), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(139,92,46,0.08), transparent), #FAF6F1",
        }}
      />

      <header className="sticky top-0 z-20 border-b border-[#E8DFD4]/80 bg-[#FFFBF5]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/site" className="shrink-0">
            <CanelaLogo className="h-14 w-auto max-w-[140px] md:max-w-[160px]" priority />
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium text-[#5C4D3C]">
            <a href="#recursos" className="hidden hover:text-[#B45309] sm:inline">Recursos</a>
            <a href="#planos" className="hidden hover:text-[#B45309] sm:inline">Planos</a>
            <Link href="/login" className="rounded-full bg-[#2A2118] px-4 py-2 text-[#FAF6F1] shadow-md hover:bg-[#3d2e1f]">
              Entrar na loja
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="text-left">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#E8DFD4] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#B45309]">
              <Sparkles className="h-3.5 w-3.5" />
              Gestão para padarias e cafeterias
            </p>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.1] text-[#2A2118] md:text-5xl">
              Produz, vende e controla{" "}
              <span className="text-[#D97706]">sem perder o ritmo</span> da bancada
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-[#5C4D3C]">
              PDV, comandas, caixa, estoque com XML e fiscal quando você precisar — online ou no balcão, no seu plano.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a href="#contato">
                <Button size="lg" className="shadow-lg shadow-amber-900/15">
                  Quero conhecer
                </Button>
              </a>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="secondary"
                  className="border-[#D4C4B0] bg-white/90 text-[#2A2118] hover:bg-white"
                >
                  Já sou cliente
                </Button>
              </Link>
            </div>
            <ul className="mt-10 space-y-2 text-sm text-[#5C4D3C]">
              {["Importação de NF-e com markup e lucro", "Comandas e rampa de produção", "Conta teste para validar antes de contratar"].map(
                (t) => (
                  <li key={t} className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-[#D97706]" />
                    {t}
                  </li>
                ),
              )}
            </ul>
          </div>
          <div className="relative flex justify-center">
            <div
              className="absolute -inset-4 rounded-[2rem] opacity-40 blur-2xl"
              style={{ background: "linear-gradient(135deg, #F59E0B33, #D9770622)" }}
            />
            <div className="relative rounded-3xl border border-[#E8DFD4] bg-white/80 p-8 shadow-2xl shadow-amber-900/10 backdrop-blur-sm md:p-12">
              <CanelaLogo className="mx-auto max-w-[min(320px,100%)]" priority />
            </div>
          </div>
        </section>

        <section id="recursos" className="border-y border-[#E8DFD4] bg-white/60 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center font-display text-3xl font-semibold text-[#2A2118]">Tudo no mesmo lugar</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-[#5C4D3C]">
              Do primeiro café da manhã ao fechamento do caixa — com a cara da sua padaria.
            </p>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {[
                {
                  t: "Caixa e PDV",
                  d: "Venda rápida, peso, promoção e comprovante — fluxo pensado para fila no balcão.",
                },
                {
                  t: "Estoque + XML",
                  d: "Entrada por nota, custo, fornecedor e etiquetas. CPF: importação manual do XML.",
                },
                {
                  t: "Fiscal sob demanda",
                  d: "NFC-e e módulos avançados quando fizer sentido — sem travar quem está começando.",
                },
              ].map((f) => (
                <div
                  key={f.t}
                  className="group rounded-2xl border border-[#E8DFD4] bg-white p-7 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-900/10"
                >
                  <div className="mb-4 h-1 w-12 rounded-full bg-[#D97706]" />
                  <h3 className="font-display text-xl font-semibold text-[#2A2118]">{f.t}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#5C4D3C]">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid gap-8 md:grid-cols-3">
              {[
                { step: "1", t: "Solicitação", d: "Você manda seus dados pelo formulário ou WhatsApp." },
                { step: "2", t: "Conta teste", d: "Validamos o fluxo completo com os módulos do seu plano." },
                { step: "3", t: "Implantação", d: "Sua loja no ar com treinamento e suporte." },
              ].map((s) => (
                <div key={s.step} className="text-center">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#2A2118] font-display text-sm font-semibold text-[#FAF6F1]">
                    {s.step}
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold">{s.t}</h3>
                  <p className="mt-2 text-sm text-[#5C4D3C]">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="planos" className="border-t border-[#E8DFD4] bg-[#2A2118] py-20 text-[#FAF6F1]">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center font-display text-3xl font-semibold">Planos claros</h2>
            <p className="mt-3 text-center text-[#C4B5A0]">Sem surpresa na mensalidade — implantação combinada no fechamento.</p>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <PlanCard name="Essencial" price="R$ 500" features={["PDV, caixa e estoque", "Comandas", "Online ou local"]} />
              <PlanCard
                name="Completo"
                price="R$ 650"
                highlight
                features={["Tudo do Essencial", "Telas, ponto e relatórios", "Prioridade na implantação"]}
              />
            </div>
          </div>
        </section>

        <section id="contato" className="py-20">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 md:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-semibold text-[#2A2118]">Nova solicitação</h2>
              <p className="mt-3 text-[#5C4D3C]">
                Conta pra gente sobre sua padaria. O pedido aparece no painel master em Leads.
              </p>
            </div>
            <div className="rounded-2xl border border-[#E8DFD4] bg-white p-6 shadow-xl">
              {sent ? (
                <p className="rounded-xl bg-emerald-50 px-4 py-8 text-center text-emerald-800">
                  Recebemos seu contato. Em breve falamos com você.
                </p>
              ) : (
                <form onSubmit={(e) => void submit(e)} className="space-y-4">
                  <Input
                    placeholder="Seu nome"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className={SITE_FIELD_CLASS}
                  />
                  <Input
                    type="email"
                    placeholder="E-mail"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className={SITE_FIELD_CLASS}
                  />
                  <Input
                    placeholder="WhatsApp"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={SITE_FIELD_CLASS}
                  />
                  <Input
                    placeholder="Nome da padaria"
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    className={SITE_FIELD_CLASS}
                  />
                  <textarea
                    placeholder="Como podemos ajudar?"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 ${SITE_FIELD_CLASS}`}
                    rows={3}
                  />
                  <label className="flex items-start gap-2 text-sm text-[#5C4D3C]">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={sendByEmail}
                      onChange={(e) => setSendByEmail(e.target.checked)}
                    />
                    Enviar estas informações por e-mail para a equipe Canela também?
                  </label>
                  {submitErr && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      {submitErr}
                    </p>
                  )}
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Enviando…" : "Enviar solicitação"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E8DFD4] py-10 text-center text-xs text-[#8A7B6A]">
        Canela · gestão para quem produz de verdade ·{" "}
        <Link href="/platform/login" className="underline hover:text-[#B45309]">Painel master</Link>
      </footer>
    </div>
  );
}

function PlanCard({
  name,
  price,
  features,
  highlight,
}: {
  name: string;
  price: string;
  features: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-8 ${
        highlight
          ? "border-[#D97706] bg-[#3d2e1f] shadow-2xl ring-2 ring-[#D97706]/40"
          : "border-stone-600 bg-[#332A20]"
      }`}
    >
      <h3 className="font-display text-xl font-semibold">{name}</h3>
      <p className="mt-2 text-3xl font-semibold text-[#F59E0B]">
        {price}
        <span className="text-base font-normal text-[#C4B5A0]">/mês</span>
      </p>
      <ul className="mt-6 space-y-2 text-sm text-[#E8DFD4]">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <Check className="h-4 w-4 text-[#D97706]" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
