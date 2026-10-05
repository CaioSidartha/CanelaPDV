"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Link from "next/link";
import { endOfWeek, format, startOfMonth, startOfWeek, subDays, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarRange,
  Download,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPrimitives";
import { PaymentMethodIcon, paymentMethodLabel } from "@/components/payment/PaymentMethodDisplay";
import { Button } from "@/components/ui/Button";
import { abcClassLabel, buildAbcCurve } from "@/lib/abc-curve";
import {
  channelCounts as salesChannelCounts,
  getActiveCashSession,
  normalizeSaleChannel,
  salesInSession,
  sumPayments,
} from "@/lib/cash-analytics";
import { buildSessionCsv, downloadTextFile } from "@/lib/cash-export";
import { buildAbcCsv, buildSalesCsv } from "@/lib/sales-export";
import { cn, formatBRL } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
const COLORS = ["#D35400", "#27AE60", "#F1C40F", "#3498DB", "#9B59B6"];
const ABC_COLORS = { A: "#27AE60", B: "#F1C40F", C: "#94a3b8" };

export default function DashboardPage() {
  const sales = useAppStore((s) => s.sales);
  const comandas = useAppStore((s) => s.comandas);
  const categories = useAppStore((s) => s.categories);
  const cashSessions = useAppStore((s) => s.cashSessions);
  const cashMovements = useAppStore((s) => s.cashMovements);

  const monthLabel = format(new Date(), "MMMM yyyy", { locale: ptBR });

  const metrics = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthSales = sales.filter((x) => new Date(x.createdAt) >= monthStart);
    const revenue = monthSales.reduce((s, x) => s + x.total, 0);
    const orders = monthSales.length;
    const ticket = orders ? revenue / orders : 0;
    const openComandas = comandas.filter((c) => c.status === "aberta").length;
    return { revenue, orders, ticket, openComandas };
  }, [sales, comandas]);

  const last7 = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
    return days.map((d) => {
      const key = format(d, "dd/MM");
      const dayKey = format(d, "yyyy-MM-dd");
      const daySales = sales.filter(
        (s) => format(new Date(s.createdAt), "yyyy-MM-dd") === dayKey,
      );
      const dayTotal = daySales.reduce((acc, s) => acc + s.total, 0);
      return { name: key, total: dayTotal, count: daySales.length, date: d };
    });
  }, [sales]);

  const dayInsight = useMemo(() => {
    if (!last7.length) return null;
    let maxI = 0;
    let minI = 0;
    last7.forEach((d, i) => {
      if (d.total > last7[maxI]!.total) maxI = i;
      if (d.total < last7[minI]!.total) minI = i;
    });
    return { busiest: last7[maxI]!, calmest: last7[minI]! };
  }, [last7]);

  const activeCaixa = useMemo(() => getActiveCashSession(cashSessions), [cashSessions]);

  const activeCaixaSales = useMemo(
    () => (activeCaixa ? salesInSession(sales, activeCaixa.id) : []),
    [activeCaixa, sales],
  );

  const activePayments = useMemo(() => sumPayments(activeCaixaSales), [activeCaixaSales]);
  const activeChannels = useMemo(
    () => salesChannelCounts(activeCaixaSales),
    [activeCaixaSales],
  );

  const weekClosedCaixas = useMemo(() => {
    const since = subDays(new Date(), 7);
    return cashSessions
      .filter((c) => c.status === "fechado" && c.closedAt && new Date(c.closedAt) >= since)
      .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""));
  }, [cashSessions]);

  /** Faturamento das vendas ligadas a turnos fechados na semana (seg–dom), últimas 9 semanas. */
  const weeklyTurnoFaturamento = useMemo(() => {
    const rows: { name: string; total: number; turnos: number; vendas: number }[] = [];
    for (let w = 8; w >= 0; w--) {
      const ref = subWeeks(new Date(), w);
      const ws = startOfWeek(ref, { weekStartsOn: 1 });
      const we = endOfWeek(ref, { weekStartsOn: 1 });
      const name = `${format(ws, "dd/MM")}–${format(we, "dd/MM")}`;
      const closed = cashSessions.filter(
        (c) =>
          c.status === "fechado" &&
          c.closedAt &&
          new Date(c.closedAt) >= ws &&
          new Date(c.closedAt) <= we,
      );
      let total = 0;
      let vendas = 0;
      for (const cx of closed) {
        const list = salesInSession(sales, cx.id);
        total += list.reduce((a, s) => a + s.total, 0);
        vendas += list.length;
      }
      rows.push({ name, total, turnos: closed.length, vendas });
    }
    return rows;
  }, [cashSessions, sales]);

  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    const monthStart = startOfMonth(new Date());
    sales
      .filter((s) => new Date(s.createdAt) >= monthStart)
      .forEach((s) => {
        (s.lines ?? []).forEach((l) => {
          const id = l.categoryId ?? "outros";
          map.set(id, (map.get(id) ?? 0) + l.subtotal);
        });
      });
    const catNames = new Map(categories.map((c) => [c.id, c.name]));
    return [...map.entries()].map(([id, value]) => ({
      name: catNames.get(id) ?? id,
      value,
    }));
  }, [sales, categories]);

  const topProducts = useMemo(() => {
    const map = new Map<string, number>();
    const monthStart = startOfMonth(new Date());
    sales
      .filter((s) => new Date(s.createdAt) >= monthStart)
      .forEach((s) => {
        (s.lines ?? []).forEach((l) => {
          map.set(l.name, (map.get(l.name) ?? 0) + l.subtotal);
        });
      });
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [sales]);

  const channelCounts = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const m = { bancada: 0, mesa: 0, delivery: 0 };
    sales
      .filter((s) => new Date(s.createdAt) >= monthStart)
      .forEach((s) => {
        m[normalizeSaleChannel(s.channel)] += 1;
      });
    return m;
  }, [sales]);

  const recent = useMemo(() => sales.slice(0, 8), [sales]);

  const monthSales = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    return sales.filter((x) => new Date(x.createdAt) >= monthStart);
  }, [sales]);

  const abcRows = useMemo(() => buildAbcCurve(monthSales), [monthSales]);

  const exportMonthSales = () => {
    const stamp = format(new Date(), "yyyy-MM-dd");
    downloadTextFile(
      `vendas-mes-${stamp}.csv`,
      buildSalesCsv(monthSales, `Vendas do mês · ${monthLabel}`),
    );
  };

  const exportAbc = () => {
    const stamp = format(new Date(), "yyyy-MM-dd");
    downloadTextFile(`curva-abc-${stamp}.csv`, buildAbcCsv(abcRows));
  };

  return (
    <div className="p-6 lg:p-10">
      <AdminPageHeader
        title="Relatórios"
        subtitle={`Indicadores · ${monthLabel}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={exportMonthSales}>
              <Download className="h-4 w-4" />
              Excel vendas
            </Button>
            <Button type="button" variant="secondary" onClick={exportAbc}>
              <Download className="h-4 w-4" />
              Excel ABC
            </Button>
            <Link
              href="/caixa"
              className="inline-flex items-center gap-2 text-sm font-medium text-brand-light hover:underline"
            >
              <Wallet className="h-4 w-4" />
              Caixa &amp; turno
            </Link>
          </div>
        }
      />

      {activeCaixa && (
        <section className="panel-glass mb-6 p-5">
          <div className="panel-glass-inner flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-emerald-300/95">
                <Wallet className="h-4 w-4" />
                Turno aberto agora
              </h2>
              <p className="mt-1 text-xs text-zinc-400">
                Desde {format(new Date(activeCaixa.openedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                {activeCaixa.openedBy ? ` · ${activeCaixa.openedBy}` : ""}
              </p>
            </div>
            <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:max-w-3xl">
              <MiniStat
                label="Vendido no turno"
                value={formatBRL(activeCaixaSales.reduce((a, s) => a + s.total, 0))}
                sublabel={`${activeCaixaSales.length} venda(s) · volume / NFC-e`}
              />
              <MiniStat label="Dinheiro" value={formatBRL(activePayments.dinheiro)} />
              <MiniStat label="PIX" value={formatBRL(activePayments.pix)} />
              <MiniStat
                label="Cartões"
                value={formatBRL(activePayments.cartao_credito + activePayments.cartao_debito)}
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Canais no turno: bancada {activeChannels.bancada} · comanda {activeChannels.mesa} · delivery{" "}
            {activeChannels.delivery} pedidos
          </p>
        </section>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Faturamento (mês)"
          value={formatBRL(metrics.revenue)}
          icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
          tone="bg-emerald-500/15"
        />
        <MetricCard
          title="Pedidos (mês)"
          value={String(metrics.orders)}
          icon={<ShoppingBag className="h-5 w-5 text-sky-400" />}
          tone="bg-sky-500/15"
        />
        <MetricCard
          title="Ticket médio"
          value={formatBRL(metrics.ticket)}
          icon={<TrendingUp className="h-5 w-5 text-brand-light" />}
          tone="bg-orange-500/15"
        />
        <MetricCard
          title="Comandas abertas"
          value={String(metrics.openComandas)}
          icon={<Users className="h-5 w-5 text-brand-light" />}
          tone="bg-orange-500/15"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="panel-glass p-5">
          <div className="panel-glass-inner">
          <h2 className="mb-4 text-sm font-semibold text-zinc-200">
            Vendas — últimos 7 dias
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]?.payload as {
                      name: string;
                      total: number;
                      count: number;
                    };
                    if (!row) return null;
                    return (
                      <div className="rounded-lg border border-white/10 bg-zinc-900/95 px-3 py-2 text-xs text-zinc-300 shadow-lg backdrop-blur-md">
                        <p className="font-semibold text-zinc-100">{row.name}</p>
                        <p className="mt-1 text-zinc-300">{formatBRL(row.total)}</p>
                        <p className="text-zinc-500">{row.count} venda(s)</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="total" fill="#D35400" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {dayInsight && (
            <p className="mt-3 text-xs text-zinc-500">
              <span className="font-medium text-zinc-300">Mais movimentado:</span>{" "}
              {dayInsight.busiest.name} ({formatBRL(dayInsight.busiest.total)} ·{" "}
              {dayInsight.busiest.count} venda
              {dayInsight.busiest.count === 1 ? "" : "s"}) ·{" "}
              <span className="font-medium text-zinc-300">Mais calmo:</span>{" "}
              {dayInsight.calmest.name} ({formatBRL(dayInsight.calmest.total)} ·{" "}
              {dayInsight.calmest.count} venda
              {dayInsight.calmest.count === 1 ? "" : "s"})
            </p>
          )}
          </div>
        </section>

        <section className="panel-glass p-5">
          <div className="panel-glass-inner">
          <h2 className="mb-4 text-sm font-semibold text-zinc-200">
            Vendas por categoria (mês)
          </h2>
          <div className="flex h-64 flex-col items-center justify-center gap-4 md:flex-row">
            <div className="h-52 w-52 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData.length ? pieData : [{ name: "—", value: 1 }]}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={70}
                  >
                    {(pieData.length ? pieData : [{ name: "—", value: 1 }]).map(
                      (_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      )
                    )}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid flex-1 grid-cols-1 gap-2 text-sm">
              <ChannelMini label="Bancada" value={channelCounts.bancada} />
              <ChannelMini label="Comanda" value={channelCounts.mesa} />
              <ChannelMini label="Delivery" value={channelCounts.delivery} />
            </div>
          </div>
          </div>
        </section>

        <section className="panel-glass p-5 xl:col-span-2">
          <div className="panel-glass-inner">
          <h2 className="mb-1 text-sm font-semibold text-zinc-200">
            Comparativo semanal — faturamento dos turnos fechados
          </h2>
          <p className="mb-4 text-xs text-zinc-500">
            Semana de segunda a domingo: soma das vendas dos caixas encerrados naquela semana. Passe o
            mouse para ver turnos fechados e quantidade de vendas (notas).
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTurnoFaturamento}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-16}
                  textAnchor="end"
                  height={54}
                />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]?.payload as {
                      name: string;
                      total: number;
                      turnos: number;
                      vendas: number;
                    };
                    if (!row) return null;
                    return (
                      <div className="rounded-lg border border-white/10 bg-zinc-900/95 px-3 py-2 text-xs text-zinc-300 shadow-lg backdrop-blur-md">
                        <p className="font-semibold text-zinc-100">{row.name}</p>
                        <p className="mt-1 text-zinc-300">{formatBRL(row.total)}</p>
                        <p className="text-zinc-500">
                          {row.vendas} venda(s) · {row.turnos} turno(s) fechado(s)
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="total" fill="#27AE60" radius={[6, 6, 0, 0]} name="Faturamento" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          </div>
        </section>

        <section className="panel-glass p-5 xl:col-span-2">
          <div className="panel-glass-inner">
          <h2 className="mb-1 text-sm font-semibold text-zinc-200">
            Produtos com maior faturamento (mês)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={topProducts} margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `R$${v}`} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Bar dataKey="value" fill="#E67E22" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          </div>
        </section>

        <section className="panel-glass p-5 xl:col-span-2">
          <div className="panel-glass-inner">
            <div className="mb-1 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-200">Curva ABC (mês)</h2>
                <p className="text-xs text-zinc-500">
                  A ≈ 80% da receita · B até 95% · C o restante — por produto.
                </p>
              </div>
              <div className="flex gap-2 text-[11px]">
                {(["A", "B", "C"] as const).map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2 py-1 text-zinc-400"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: ABC_COLORS[c] }}
                    />
                    {abcClassLabel(c)}
                  </span>
                ))}
              </div>
            </div>
            {abcRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">
                Sem vendas no mês para montar a curva.
              </p>
            ) : (
              <div className="mt-4 max-h-80 overflow-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="sticky top-0 border-b border-white/[0.08] bg-zinc-950/90 text-xs uppercase tracking-wide text-zinc-500 backdrop-blur">
                    <tr>
                      <th className="pb-2 pr-3">Classe</th>
                      <th className="pb-2 pr-3">Produto</th>
                      <th className="pb-2 pr-3 text-right">Receita</th>
                      <th className="pb-2 pr-3 text-right">Qtd</th>
                      <th className="pb-2 pr-3 text-right">%</th>
                      <th className="pb-2 text-right">Acum.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {abcRows.map((r) => (
                      <tr key={r.name} className="text-zinc-300">
                        <td className="py-2 pr-3">
                          <span
                            className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-zinc-950",
                            )}
                            style={{ background: ABC_COLORS[r.abc] }}
                          >
                            {r.abc}
                          </span>
                        </td>
                        <td className="py-2 pr-3 font-medium text-zinc-100">{r.name}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {formatBRL(r.revenue)}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums text-zinc-500">
                          {r.qty}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums text-zinc-500">
                          {(r.share * 100).toFixed(1)}%
                        </td>
                        <td className="py-2 text-right tabular-nums text-zinc-500">
                          {(r.cumulative * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="panel-glass p-5 xl:col-span-2">
          <div className="panel-glass-inner">
          <div className="mb-4 flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-200">Turnos encerrados (últimos 7 dias)</h2>
          </div>
          {weekClosedCaixas.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500">
              Nenhum turno fechado neste período. Os totais aparecem após fechar o caixa em Caixa &amp;
              turno.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="border-b border-white/[0.08] text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="pb-2 pr-3">Abertura</th>
                    <th className="pb-2 pr-3">Fechamento</th>
                    <th className="pb-2 pr-3 text-right">
                      <span className="block">Total vendas</span>
                      <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-zinc-600">
                        valor · qtd.
                      </span>
                    </th>
                    <th className="pb-2 pr-3 text-right">Gaveta esp.</th>
                    <th className="pb-2 pr-3 text-right">Contada</th>
                    <th className="pb-2 pr-3 text-right">Δ</th>
                    <th className="pb-2 pr-3 text-right">Dinheiro</th>
                    <th className="pb-2 pr-3 text-right">PIX</th>
                    <th className="pb-2 pr-2 text-right">Cartões</th>
                    <th className="pb-2">CSV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {weekClosedCaixas.map((cx) => {
                    const list = salesInSession(sales, cx.id);
                    const tot = list.reduce((a, s) => a + s.total, 0);
                    const p = sumPayments(list);
                    const movs = cashMovements.filter((m) => m.sessionId === cx.id);
                    return (
                      <tr key={cx.id} className="text-zinc-300">
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          {format(new Date(cx.openedAt), "dd/MM HH:mm", { locale: ptBR })}
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          {cx.closedAt
                            ? format(new Date(cx.closedAt), "dd/MM HH:mm", { locale: ptBR })
                            : "—"}
                        </td>
                        <td className="py-2.5 pr-3 text-right">
                          <div className="font-medium tabular-nums">{formatBRL(tot)}</div>
                          <div className="mt-0.5 text-xs text-zinc-500">
                            {list.length} {list.length === 1 ? "venda" : "vendas"}
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 text-right text-zinc-500">
                          {cx.expectedDrawerAtClose != null ? formatBRL(cx.expectedDrawerAtClose) : "—"}
                        </td>
                        <td className="py-2.5 pr-3 text-right text-zinc-500">
                          {cx.countedDrawerCash != null ? formatBRL(cx.countedDrawerCash) : "—"}
                        </td>
                        <td
                          className={`py-2.5 pr-3 text-right font-medium ${
                            cx.drawerDifference == null
                              ? "text-zinc-600"
                              : cx.drawerDifference > 0
                                ? "text-emerald-400"
                                : cx.drawerDifference < 0
                                  ? "text-red-400"
                                  : "text-zinc-400"
                          }`}
                        >
                          {cx.drawerDifference != null ? formatBRL(cx.drawerDifference) : "—"}
                        </td>
                        <td className="py-2.5 pr-3 text-right text-zinc-500">{formatBRL(p.dinheiro)}</td>
                        <td className="py-2.5 pr-3 text-right text-zinc-500">{formatBRL(p.pix)}</td>
                        <td className="py-2.5 pr-2 text-right text-zinc-500">
                          {formatBRL(p.cartao_credito + p.cartao_debito)}
                        </td>
                        <td className="py-2.5">
                          <button
                            type="button"
                            className="text-xs font-medium text-brand hover:underline"
                            onClick={() => {
                              const csv = buildSessionCsv(cx, list, movs);
                              downloadTextFile(
                                `turno-${format(new Date(cx.openedAt), "yyyy-MM-dd-HHmm", { locale: ptBR })}.csv`,
                                csv,
                              );
                            }}
                          >
                            Baixar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </section>

        <section className="panel-glass p-5 xl:col-span-2">
          <div className="panel-glass-inner">
          <h2 className="mb-4 text-sm font-semibold text-zinc-200">Pedidos recentes</h2>
          <ul className="divide-y divide-zinc-800/80">
            {recent.length === 0 && (
              <li className="py-6 text-center text-sm text-zinc-500">
                Nenhuma venda registrada ainda.
              </li>
            )}
            {recent.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-zinc-100">
                    {s.channel === "mesa"
                      ? s.comandaNumber != null
                        ? `Comanda ${s.comandaNumber}`
                        : s.mesaId != null
                          ? `Mesa ${s.mesaId}`
                          : "Mesa"
                      : s.channel === "delivery"
                        ? "Delivery"
                        : "Bancada"}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-1.5 py-0.5 text-zinc-300">
                      <PaymentMethodIcon method={s.payment_method} className="h-3.5 w-3.5" />
                      {paymentMethodLabel(s.payment_method)}
                    </span>
                    <span>
                      {format(new Date(s.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })} ·{" "}
                      {s.itemCount} itens
                      {s.caixaId && (
                        <span className="ml-1 text-zinc-600">
                          · turno {s.caixaId.replace(/^cx_/, "").slice(0, 8)}…
                        </span>
                      )}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-zinc-100">{formatBRL(s.total)}</p>
                  <p className="text-xs font-medium text-emerald-400/90">autorizada</p>
                </div>
              </li>
            ))}
          </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="panel-glass flex items-center gap-4 p-4">
      <div className={`panel-glass-inner rounded-xl p-3 ${tone}`}>{icon}</div>
      <div className="panel-glass-inner min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</p>
        <p className="text-xl font-semibold text-zinc-100">{value}</p>
      </div>
    </div>
  );
}

function ChannelMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-zinc-950/30 px-3 py-2 backdrop-blur-sm">
      <span className="text-zinc-400">{label}</span>
      <span className="text-lg font-bold text-brand-light">{value}</span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/25 px-3 py-2 backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-zinc-100">{value}</p>
      {sublabel ? (
        <p className="mt-1 text-[11px] font-medium tabular-nums text-emerald-200/85">{sublabel}</p>
      ) : null}
    </div>
  );
}
