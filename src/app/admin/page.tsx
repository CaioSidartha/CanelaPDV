"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format, startOfDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AdminKpiCard,
  AdminPageHeader,
  AdminSectionCard,
} from "@/components/admin/AdminPrimitives";
import { formatBRL } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

const MODULE_LABELS: Record<string, string> = {
  pdv: "PDV / balcão",
  comandas: "Comandas",
  caixa: "Caixa & turno",
  estoque: "Estoque",
  fiscal: "NFC-e / fiscal",
  ponto: "Ponto",
  telas: "Telas de preço",
  admin: "Painel admin",
  multi_filial: "Multi-filial",
  bi: "BI avançado",
};

export default function AdminHomePage() {
  const sales = useAppStore((s) => s.sales);
  const comandas = useAppStore((s) => s.comandas);
  const products = useAppStore((s) => s.products);
  const modules = useAppStore((s) => s.auth.modules);
  const session = useAppStore((s) => s.session);
  const company = useAppStore((s) => s.company);

  const today = useMemo(() => {
    const start = startOfDay(new Date());
    const todaySales = sales.filter((s) => new Date(s.createdAt) >= start);
    const yesterdayStart = startOfDay(subDays(new Date(), 1));
    const yesterdaySales = sales.filter((s) => {
      const d = new Date(s.createdAt);
      return d >= yesterdayStart && d < start;
    });
    const revenue = todaySales.reduce((a, s) => a + s.total, 0);
    const yRev = yesterdaySales.reduce((a, s) => a + s.total, 0);
    const delta = yRev > 0 ? ((revenue - yRev) / yRev) * 100 : null;
    const ticket = todaySales.length ? revenue / todaySales.length : 0;
    return { revenue, count: todaySales.length, ticket, delta };
  }, [sales]);

  const openComandas = comandas.filter((c) => c.status === "aberta").length;
  const lowStock = products.filter(
    (p) => p.active && p.trackStock !== false && (p.stockQty ?? 0) <= (p.stockMin ?? 0),
  ).length;

  const enabledModules = Object.entries(modules).filter(([, on]) => on);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <AdminPageHeader
        title="Visão geral da loja"
        subtitle={`${company.name} · ${format(new Date(), "EEEE, d MMMM", { locale: ptBR })} · logado como ${session?.name ?? "—"}`}
        actions={
          <Link
            href="/admin/analytics"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/10"
          >
            Abrir relatórios
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminKpiCard
          label="Faturamento hoje"
          value={formatBRL(today.revenue)}
          hint={
            today.delta == null
              ? "Sem base de ontem"
              : `${today.delta >= 0 ? "+" : ""}${today.delta.toFixed(0)}% vs ontem`
          }
        />
        <AdminKpiCard label="Vendas hoje" value={String(today.count)} hint={`Ticket médio ${formatBRL(today.ticket)}`} />
        <AdminKpiCard
          label="Comandas abertas"
          value={String(openComandas)}
          hint="Operação em andamento"
          href="/comandas"
        />
        <AdminKpiCard
          label="Estoque crítico"
          value={String(lowStock)}
          hint="No mínimo ou abaixo"
          href="/estoque"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <AdminSectionCard
          title="Status do sistema (preparação servidor local)"
          action={
            <Link href="/admin/sistema" className="text-xs font-semibold text-brand hover:underline">
              Detalhes
            </Link>
          }
        >
          <ul className="space-y-2 text-sm text-zinc-400">
            <li className="flex items-center justify-between gap-2">
              <span>Modo atual</span>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-200">
                Protótipo web (localStorage)
              </span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span>Sync nuvem</span>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-300">
                Em breve
              </span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span>IDs</span>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                UUID
              </span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span>Sessão</span>
              <span className="font-mono text-xs text-zinc-300">{session?.userId?.slice(0, 8)}…</span>
            </li>
          </ul>
          <p className="mt-3 text-xs text-zinc-500">
            Próximo passo: app instalável em modo servidor nesta máquina, com terminais de caixa na rede local.
          </p>
        </AdminSectionCard>

        <AdminSectionCard title="Módulos do plano">
          <div className="flex flex-wrap gap-2">
            {enabledModules.map(([key]) => (
              <span
                key={key}
                className="rounded-lg border border-white/10 bg-zinc-950/40 px-2.5 py-1 text-xs font-medium text-zinc-200"
              >
                {MODULE_LABELS[key] ?? key}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Padaria pode ligar comandas + ponto; conveniência pode ficar só com PDV de balcão.
          </p>
        </AdminSectionCard>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link
          href="/venda"
          className="rounded-2xl border border-brand/30 bg-brand/10 px-4 py-4 text-sm font-semibold text-brand-light hover:bg-brand/20"
        >
          Ir ao PDV
        </Link>
        <Link
          href="/comandas"
          className="rounded-2xl border border-white/10 bg-zinc-900/50 px-4 py-4 text-sm font-semibold text-zinc-100 hover:border-brand/40"
        >
          Abrir comandas
        </Link>
        <Link
          href="/configuracoes"
          className="rounded-2xl border border-white/10 bg-zinc-900/50 px-4 py-4 text-sm font-semibold text-zinc-100 hover:border-brand/40"
        >
          Configurações
        </Link>
      </div>
    </div>
  );
}
