"use client";

import Link from "next/link";
import { moneyBrl } from "@/lib/format-document";
import { usePlatformStore } from "@/store/usePlatformStore";

export default function PlatformFinancePage() {
  const billing = usePlatformStore((s) => s.billing);
  const tenants = usePlatformStore((s) => s.tenants);

  const nameOf = (tenantId: string) => tenants.find((t) => t.id === tenantId)?.name ?? tenantId;

  const receivable = billing.filter((b) => b.kind === "receivable");
  const payable = billing.filter((b) => b.kind === "payable");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-stone-50">Financeiro</h1>
        <p className="mt-1 text-sm text-stone-400">Cobranças e despesas simuladas por conta (inclui testes).</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Ledger title="A receber" items={receivable} nameOf={nameOf} tone="amber" />
        <Ledger title="A pagar" items={payable} nameOf={nameOf} tone="stone" />
      </div>
    </div>
  );
}

function Ledger({
  title,
  items,
  nameOf,
  tone,
}: {
  title: string;
  items: { id: string; tenantId: string; label: string; amount: number; status: string; dueDate: string }[];
  nameOf: (id: string) => string;
  tone: "amber" | "stone";
}) {
  const open = items.filter((i) => i.status === "open");
  const paid = items.filter((i) => i.status === "paid");
  const sum = (list: { amount: number }[]) => list.reduce((a, b) => a + b.amount, 0);

  return (
    <section className="rounded-xl border border-stone-800 bg-[#141210]">
      <div className="border-b border-stone-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-stone-200">{title}</h2>
        <p className={`text-xs ${tone === "amber" ? "text-amber-600/80" : "text-stone-500"}`}>
          Aberto: {moneyBrl(sum(open))} · Pago: {moneyBrl(sum(paid))}
        </p>
      </div>
      <ul className="max-h-[420px] divide-y divide-stone-800 overflow-auto">
        {items.map((b) => (
          <li key={b.id} className="px-4 py-3 text-sm">
            <Link href={`/platform/tenants/${b.tenantId}`} className="font-medium text-stone-200 hover:underline">
              {nameOf(b.tenantId)}
            </Link>
            <p className="text-stone-400">{b.label}</p>
            <p className="mt-1 flex justify-between text-xs">
              <span className="text-stone-500">{b.dueDate}</span>
              <span className={b.status === "open" ? "text-amber-500" : "text-emerald-600"}>
                {moneyBrl(b.amount)} · {b.status === "open" ? "Aberto" : "Pago"}
              </span>
            </p>
          </li>
        ))}
        {!items.length && <li className="px-4 py-6 text-sm text-stone-500">Nenhum lançamento.</li>}
      </ul>
    </section>
  );
}
