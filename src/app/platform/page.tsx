"use client";

import Link from "next/link";
import { usePlatformStore } from "@/store/usePlatformStore";
import { moneyBrl } from "@/lib/format-document";

export default function PlatformDashboardPage() {
  const tenants = usePlatformStore((s) => s.tenants);
  const billing = usePlatformStore((s) => s.billing);
  const leads = usePlatformStore((s) => s.leads);

  const receivableOpen = billing.filter((b) => b.kind === "receivable" && b.status === "open");
  const payableOpen = billing.filter((b) => b.kind === "payable" && b.status === "open");
  const sum = (items: { amount: number }[]) => items.reduce((a, b) => a + b.amount, 0);
  const newLeads = leads.filter((l) => l.status === "new").length;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-stone-50">Visão geral</h1>
        <p className="mt-1 text-sm text-stone-400">
          Todas as contas que você cria — produção, teste, plano e financeiro simulado.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Contas" value={String(tenants.length)} hint={`${tenants.filter((t) => t.kind === "test").length} teste`} />
        <StatCard label="A receber (aberto)" value={moneyBrl(sum(receivableOpen))} />
        <StatCard label="A pagar (aberto)" value={moneyBrl(sum(payableOpen))} />
        <StatCard label="Leads novos" value={String(newLeads)} />
      </div>

      <section className="rounded-xl border border-stone-800 bg-[#141210]">
        <div className="flex items-center justify-between border-b border-stone-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-stone-200">Contas recentes</h2>
          <Link href="/platform/tenants" className="text-xs text-amber-600 hover:text-amber-500">
            Ver todas
          </Link>
        </div>
        <ul className="divide-y divide-stone-800">
          {tenants.slice(0, 8).map((t) => {
            const open = billing.filter((b) => b.tenantId === t.id && b.kind === "receivable" && b.status === "open");
            return (
              <li key={t.id}>
                <Link
                  href={`/platform/tenants/${t.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-stone-900/50"
                >
                  <div>
                    <p className="font-medium text-stone-100">{t.name}</p>
                    <p className="text-xs text-stone-500">
                      {t.kind === "test" ? "Teste" : "Cliente"} · {t.adminEmail}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-stone-300">{moneyBrl(t.monthlyFee)}/mês</p>
                    {open.length > 0 && (
                      <p className="text-xs text-amber-600/90">Em aberto: {moneyBrl(sum(open))}</p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-stone-800 bg-[#141210] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-stone-50">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-600">{hint}</p>}
    </div>
  );
}
