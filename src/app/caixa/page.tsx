"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  ChevronDown,
  FileDown,
  Store,
  Truck,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { paymentMethodLabel } from "@/components/payment/PaymentMethodDisplay";
import type { LucideIcon } from "lucide-react";
import { PaymentMethodIcon } from "@/components/payment/PaymentMethodDisplay";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  channelCounts,
  expectedDrawerCash,
  getActiveCashSession,
  minutesUntil,
  normalizeSaleChannel,
  salesInSession,
  sumPayments,
  topProductsByRevenue,
} from "@/lib/cash-analytics";
import type { CompletedSale, OrderChannel } from "@/types";
import { buildSessionCsv, downloadTextFile } from "@/lib/cash-export";
import { cn, formatBRL } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { CashMovement, CashMovementKind, CashRegisterSession } from "@/types";

type CaixaView = "turno" | "calendario";

export default function CaixaPage() {
  const cashSessions = useAppStore((s) => s.cashSessions);
  const cashMovements = useAppStore((s) => s.cashMovements);
  const sales = useAppStore((s) => s.sales);
  const comandas = useAppStore((s) => s.comandas);
  const closeCashSession = useAppStore((s) => s.closeCashSession);
  const addCashMovement = useAppStore((s) => s.addCashMovement);

  const openComandasCount = useMemo(
    () => comandas.filter((c) => c.status === "aberta").length,
    [comandas],
  );

  const [view, setView] = useState<CaixaView>("turno");
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const active = useMemo(
    () => getActiveCashSession(cashSessions),
    [cashSessions],
  );

  const sessionSales = useMemo(
    () => (active ? salesInSession(sales, active.id) : []),
    [active, sales],
  );

  const payments = useMemo(() => sumPayments(sessionSales), [sessionSales]);
  const channels = useMemo(() => channelCounts(sessionSales), [sessionSales]);
  const topProducts = useMemo(
    () => topProductsByRevenue(sessionSales, 15),
    [sessionSales],
  );

  const drawerExpected = useMemo(
    () => (active ? expectedDrawerCash(active, sales, cashMovements) : 0),
    [active, sales, cashMovements],
  );

  const sessionMovs = useMemo(
    () =>
      active
        ? cashMovements.filter((m) => m.sessionId === active.id)
        : [],
    [active, cashMovements],
  );

  const recentClosed = useMemo(() => {
    const since = subDays(new Date(), 14);
    return cashSessions
      .filter((c) => c.status === "fechado" && c.closedAt)
      .filter((c) => new Date(c.closedAt!) >= since)
      .slice(0, 14);
  }, [cashSessions]);

  const reminder = useMemo(() => {
    if (!active?.expectedCloseAt) return null;
    const m = minutesUntil(active.expectedCloseAt);
    if (m >= 0 && m <= 60) return { kind: "soon" as const, minutes: m };
    if (m < 0 && m >= -180) return { kind: "late" as const, minutes: -m };
    return null;
  }, [active]);

  const exportClosedSession = (cx: (typeof cashSessions)[number]) => {
    const movs = cashMovements.filter((m) => m.sessionId === cx.id);
    const list = salesInSession(sales, cx.id);
    const csv = buildSessionCsv(cx, list, movs);
    const stamp = format(new Date(cx.openedAt), "yyyy-MM-dd-HHmm", { locale: ptBR });
    downloadTextFile(`turno-caixa-${stamp}.csv`, csv);
  };

  const monthDays = useMemo(() => {
    const start = startOfMonth(monthCursor);
    const end = endOfMonth(monthCursor);
    const gridStart = addDays(start, -start.getDay());
    const gridEnd = addDays(end, 6 - end.getDay());
    const out: Date[] = [];
    for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) out.push(d);
    return out;
  }, [monthCursor]);

  const closedSessionsByDay = useMemo(() => {
    const map = new Map<string, CashRegisterSession[]>();
    for (const s of cashSessions) {
      if (s.status !== "fechado") continue;
      const key = format(new Date(s.openedAt), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    for (const [k, list] of map) {
      list.sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime());
      map.set(k, list);
    }
    return map;
  }, [cashSessions]);

  const selectedDayKey = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
  const selectedSessions = useMemo(() => {
    if (!selectedDayKey) return [];
    return closedSessionsByDay.get(selectedDayKey) ?? [];
  }, [closedSessionsByDay, selectedDayKey]);

  const selectedSummary = useMemo(() => {
    if (!selectedDayKey) return null;
    const sessionSummaries = selectedSessions.map((cx) => {
      const list = salesInSession(sales, cx.id);
      const total = list.reduce((a, s) => a + s.total, 0);
      return {
        id: cx.id,
        openedAt: cx.openedAt,
        closedAt: cx.closedAt,
        openedBy: cx.openedBy,
        total,
        salesCount: list.length,
      };
    });
    const totalDay = sessionSummaries.reduce((a, x) => a + x.total, 0);
    const salesCountDay = sessionSummaries.reduce((a, x) => a + x.salesCount, 0);
    return { sessionSummaries, totalDay, salesCountDay };
  }, [sales, selectedDayKey, selectedSessions]);

  return (
    <div className="p-6 lg:p-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-zinc-100">
            Caixa &amp; turno
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Abertura, sangrias, suprimentos e fechamento. As vendas só entram no turno com caixa
            aberto.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-brand-light hover:underline"
        >
          Ver análises no dashboard →
        </Link>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setView("turno")}
          className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
            view === "turno"
              ? "border-brand bg-brand text-white"
              : "border-zinc-600 bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700/90"
          }`}
        >
          Turno atual
        </button>
        <button
          type="button"
          onClick={() => {
            setView("calendario");
            if (!selectedDay) setSelectedDay(new Date());
          }}
          className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
            view === "calendario"
              ? "border-brand bg-brand text-white"
              : "border-zinc-600 bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700/90"
          }`}
        >
          Calendário do mês
        </button>
        <div className="ml-auto text-xs text-zinc-500">
          Alternar a visualização não interrompe o caixa aberto.
        </div>
      </div>

      {view === "calendario" && (
        <section className="panel-glass mb-10 p-5">
          <div className="panel-glass-inner">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Análise</p>
              <h2 className="font-display text-xl font-semibold text-zinc-100">
                {format(monthCursor, "MMMM yyyy", { locale: ptBR })}
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Clique em um dia para ver os caixas (turnos) e o resumo rápido.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMonthCursor((d) => startOfMonth(subMonths(d, 1)))}
              >
                ← Mês anterior
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMonthCursor(startOfMonth(new Date()))}
              >
                Hoje
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMonthCursor((d) => startOfMonth(addMonths(d, 1)))}
              >
                Próximo mês →
              </Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-2 text-xs text-zinc-500">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="px-2">
                {d}
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {monthDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const sessions = closedSessionsByDay.get(key) ?? [];
              const inMonth = isSameMonth(day, monthCursor);
              const selected = selectedDay ? isSameDay(day, selectedDay) : false;
              const maxBars = Math.min(3, sessions.length);
              const extra = sessions.length - maxBars;
              const total = sessions.reduce((a, cx) => {
                const list = salesInSession(sales, cx.id);
                return a + list.reduce((aa, s) => aa + s.total, 0);
              }, 0);
              const count = sessions.reduce((a, cx) => a + salesInSession(sales, cx.id).length, 0);
              const palette = ["bg-amber-300", "bg-orange-300", "bg-sky-300", "bg-emerald-300"];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`group flex min-h-[92px] flex-col rounded-2xl border p-2 text-left transition ${
                    selected
                      ? "border-brand bg-brand/10 ring-1 ring-brand/30"
                      : "border-white/10 bg-zinc-900/35 hover:border-white/15 hover:bg-zinc-800/50"
                  } ${inMonth ? "" : "opacity-45"}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-zinc-100">{format(day, "d")}</span>
                    {sessions.length > 0 ? (
                      <span className="text-[11px] font-medium text-zinc-500">
                        {sessions.length} cx
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-600">—</span>
                    )}
                  </div>

                  {sessions.length > 0 ? (
                    <>
                      <div className="mt-2 flex flex-col gap-1">
                        {sessions.slice(0, maxBars).map((cx, idx) => {
                          const who = cx.openedBy?.trim() || `Caixa ${idx + 1}`;
                          const t0 = format(new Date(cx.openedAt), "HH:mm", { locale: ptBR });
                          const t1 = cx.closedAt
                            ? format(new Date(cx.closedAt), "HH:mm", { locale: ptBR })
                            : "—";
                          return (
                            <div
                              key={cx.id}
                              className="flex items-center gap-2"
                              title={`${who} · ${t0} → ${t1}`}
                            >
                              <span className={`h-2.5 w-2.5 rounded-full ${palette[idx % palette.length]}`} />
                              <span className="truncate text-[11px] font-medium text-zinc-300">
                                {who}
                              </span>
                            </div>
                          );
                        })}
                        {extra > 0 && (
                          <div className="text-[11px] font-medium text-zinc-500">
                            +{extra} outro(s)
                          </div>
                        )}
                      </div>
                      <div className="mt-auto pt-2 text-[11px] text-zinc-400">
                        <div className="flex items-center justify-between">
                          <span>Total</span>
                          <span className="font-semibold text-zinc-100">{formatBRL(total)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Vendas</span>
                          <span className="font-semibold text-zinc-100">{count}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="mt-auto pt-6 text-[11px] text-zinc-600">Sem caixas fechados.</div>
                  )}
                </button>
              );
            })}
          </div>

          {selectedSummary && selectedDay && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950/40 p-4 backdrop-blur-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {format(selectedDay, "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-zinc-100">
                    Total do dia: {formatBRL(selectedSummary.totalDay)}
                  </p>
                  <p className="text-sm text-zinc-400">
                    {selectedSummary.salesCountDay} venda(s) em {selectedSummary.sessionSummaries.length} caixa(s)
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {selectedSummary.sessionSummaries.map((cx, idx) => (
                  <div key={cx.id} className="rounded-2xl border border-white/10 bg-zinc-900/35 p-3 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Caixa {idx + 1}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-100">
                      {cx.openedBy?.trim() || "—"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {format(new Date(cx.openedAt), "HH:mm", { locale: ptBR })} →{" "}
                      {cx.closedAt ? format(new Date(cx.closedAt), "HH:mm", { locale: ptBR }) : "—"}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Total</span>
                      <span className="font-semibold text-zinc-100">{formatBRL(cx.total)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Vendas</span>
                      <span className="font-semibold text-zinc-100">{cx.salesCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </section>
      )}

      {view === "turno" && reminder?.kind === "soon" && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Lembrete de fechamento</p>
            <p className="mt-0.5 text-amber-900/90">
              Horário previsto em até ~{reminder.minutes} min. Confira o gaveta e prepare o fechamento.
            </p>
          </div>
        </div>
      )}

      {view === "turno" && reminder?.kind === "late" && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Passou do horário previsto</p>
            <p className="mt-0.5">
              Há cerca de {reminder.minutes} min após o fechamento planejado. Registre sangrias e feche o
              turno quando possível.
            </p>
          </div>
        </div>
      )}

      {view === "turno" && !active && <OpenCashCard />}

      {view === "turno" && active && (
        <div className="space-y-8">
          <ActiveSessionPanel
            session={active}
            sessionSales={sessionSales}
            payments={payments}
            channels={channels}
            topProducts={topProducts}
            drawerExpected={drawerExpected}
            movements={sessionMovs}
            openComandasCount={openComandasCount}
            onSangria={addCashMovement}
            onClose={closeCashSession}
          />
        </div>
      )}

      {view === "turno" && recentClosed.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-xl font-semibold text-zinc-100">
            Turnos encerrados (últimos 14 dias)
          </h2>
          <div className="overflow-x-auto table-glass">
            <table className="min-w-[960px] w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">Abertura</th>
                  <th className="px-4 py-3">Fechamento</th>
                  <th className="px-4 py-3">Responsável</th>
                  <th className="px-4 py-3 text-right">
                    <span className="block">Vendas no turno</span>
                    <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-zinc-500">
                      valor · quantidade (NFC-e)
                    </span>
                  </th>
                  <th className="px-4 py-3 text-right">Gaveta esperada</th>
                  <th className="px-4 py-3 text-right">Contada</th>
                  <th className="px-4 py-3 text-right">Diferença</th>
                  <th className="px-4 py-3">CSV</th>
                </tr>
              </thead>
              <tbody>
                {recentClosed.map((cx) => {
                  const list = salesInSession(sales, cx.id);
                  const tot = list.reduce((a, s) => a + s.total, 0);
                  return (
                    <tr key={cx.id} className="text-zinc-300">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {format(new Date(cx.openedAt), "dd/MM HH:mm", { locale: ptBR })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {cx.closedAt
                          ? format(new Date(cx.closedAt), "dd/MM HH:mm", { locale: ptBR })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">{cx.openedBy || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-medium tabular-nums">{formatBRL(tot)}</div>
                        <div className="mt-0.5 text-xs text-zinc-500">
                          {list.length} {list.length === 1 ? "venda" : "vendas"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-500">
                        {cx.expectedDrawerAtClose != null
                          ? formatBRL(cx.expectedDrawerAtClose)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-500">
                        {cx.countedDrawerCash != null ? formatBRL(cx.countedDrawerCash) : "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${
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
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-xs font-medium text-brand-light hover:bg-white/5"
                          onClick={() => exportClosedSession(cx)}
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          Baixar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function OpenCashCard() {
  const openCashSession = useAppStore((s) => s.openCashSession);
  const employees = useAppStore((s) => s.employees);
  const employeesActive = useMemo(
    () => employees.filter((e) => e.active).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [employees],
  );
  const [employeeId, setEmployeeId] = useState("");
  const [initialFloat, setInitialFloat] = useState("");
  const [expectedClose, setExpectedClose] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const handleOpen = () => {
    setErr(null);
    const f = Number(initialFloat.replace(",", ".")) || 0;
    let expectedCloseAt: string | undefined;
    if (expectedClose.trim()) {
      const d = new Date(expectedClose);
      if (Number.isNaN(d.getTime())) {
        setErr("Data/hora de fechamento previsto inválida.");
        return;
      }
      expectedCloseAt = d.toISOString();
    }
    const r = openCashSession({
      employeeId: employeeId || undefined,
      initialFloat: f > 0 ? f : undefined,
      expectedCloseAt,
    });
    if (!r.ok) setErr(r.error);
    else {
      setEmployeeId("");
      setInitialFloat("");
      setExpectedClose("");
    }
  };

  return (
    <section className="panel-glass max-w-xl p-6">
      <div className="panel-glass-inner">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted text-brand">
          <Wallet className="h-6 w-6" />
        </div>
        <div>
          <h2 className="font-semibold text-zinc-100">Abrir turno de caixa</h2>
          <p className="text-xs text-zinc-500">Sem caixa aberto, o PDV não finaliza vendas.</p>
        </div>
      </div>
      {err && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </div>
      )}
      <div className="space-y-4">
        <div>
          <label className="caixa-field-label">
            Funcionário responsável
            {employeesActive.length === 0 ? " (cadastre em Admin → Funcionários)" : ""}
          </label>
          {employeesActive.length > 0 ? (
            <select
              className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 outline-none shadow-inner shadow-black/10 focus:border-brand/45 focus:ring-2 focus:ring-orange-500/15"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">Selecione…</option>
              {employeesActive.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.role ? ` · ${e.role}` : ""}
                  {e.registry ? ` (${e.registry})` : ""}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-zinc-500">
              Sem funcionários ativos — o turno abre sem vínculo. Cadastre a equipe para exigir seleção.
            </p>
          )}
        </div>
        <div>
          <label className="caixa-field-label">
            Troco / fundo inicial no gaveta (R$, opcional)
          </label>
          <Input
            inputMode="decimal"
            value={initialFloat}
            onChange={(e) => setInitialFloat(e.target.value)}
            placeholder="ex: 100"
          />
        </div>
        <div>
          <label className="caixa-field-label">
            Lembrete: horário previsto de fechamento (opcional)
          </label>
          <Input
            type="datetime-local"
            value={expectedClose}
            onChange={(e) => setExpectedClose(e.target.value)}
          />
        </div>
        <Button type="button" className="w-full" onClick={handleOpen}>
          Abrir caixa agora
        </Button>
      </div>
      </div>
    </section>
  );
}

function salePaymentSummary(sale: CompletedSale): string {
  if (sale.payments?.length) {
    return sale.payments.map((p) => `${paymentMethodLabel(p.method)} ${formatBRL(p.amount)}`).join(" · ");
  }
  return paymentMethodLabel(sale.payment_method);
}

function ChannelSaleDetail({ sale }: { sale: CompletedSale }) {
  const when = format(new Date(sale.createdAt), "HH:mm", { locale: ptBR });
  const ref =
    sale.comandaNumber ?? sale.comandaCode
      ? `Comanda ${sale.comandaNumber ?? sale.comandaCode}`
      : sale.chave_nota?.slice(-8) ?? sale.id.slice(-6);
  const itemsPreview = sale.lines
    .slice(0, 3)
    .map((l) => `${l.quantity && l.quantity > 1 ? `${l.quantity}× ` : ""}${l.name}`)
    .join(", ");
  const more = sale.lines.length > 3 ? ` +${sale.lines.length - 3}` : "";

  return (
    <li className="rounded-lg border border-white/[0.06] bg-zinc-950/40 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-100">
            <span className="font-mono text-zinc-400">{when}</span>
            <span className="mx-1.5 text-zinc-600">·</span>
            {ref}
          </p>
          <p className="mt-0.5 truncate text-xs text-zinc-500">
            {itemsPreview}
            {more}
            <span className="text-zinc-600"> · {sale.itemCount} it.</span>
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">{salePaymentSummary(sale)}</p>
        </div>
        <span className="shrink-0 font-display text-lg text-brand-light tabular-nums">
          {formatBRL(sale.total)}
        </span>
      </div>
    </li>
  );
}

function GlassChannelRow({
  icon: Icon,
  title,
  subtitle,
  value,
  expanded,
  onToggle,
  sales,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  value: number;
  expanded: boolean;
  onToggle: () => void;
  sales: CompletedSale[];
}) {
  const canExpand = value > 0;
  return (
    <li className="rounded-xl border border-transparent transition has-[[data-expanded=true]]:border-white/[0.06] has-[[data-expanded=true]]:bg-white/[0.02]">
      <button
        type="button"
        disabled={!canExpand}
        onClick={onToggle}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl px-1 py-2 text-left transition",
          canExpand ? "hover:bg-white/[0.04] cursor-pointer" : "cursor-default opacity-90",
        )}
        aria-expanded={expanded}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-zinc-950/50 text-zinc-300 shadow-inner shadow-black/20">
            <Icon className="h-5 w-5 opacity-90" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-zinc-100">{title}</p>
            <p className="text-xs text-zinc-500">
              {subtitle}
              {canExpand ? " · toque para conferir" : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="tabular-nums text-lg font-semibold text-zinc-200">{value}</span>
          {canExpand && (
            <ChevronDown
              className={cn(
                "h-4 w-4 text-zinc-500 transition",
                expanded && "rotate-180",
              )}
            />
          )}
        </div>
      </button>
      {expanded && sales.length > 0 && (
        <ul
          data-expanded="true"
          className="max-h-56 space-y-2 overflow-y-auto px-2 pb-2 pt-1"
        >
          {sales.map((s) => (
            <ChannelSaleDetail key={s.id} sale={s} />
          ))}
        </ul>
      )}
    </li>
  );
}

function ActiveSessionPanel({
  session,
  sessionSales,
  payments,
  channels,
  topProducts,
  drawerExpected,
  movements,
  openComandasCount,
  onSangria,
  onClose,
}: {
  session: CashRegisterSession;
  sessionSales: ReturnType<typeof salesInSession>;
  payments: ReturnType<typeof sumPayments>;
  channels: ReturnType<typeof channelCounts>;
  topProducts: ReturnType<typeof topProductsByRevenue>;
  drawerExpected: number;
  movements: CashMovement[];
  openComandasCount: number;
  onSangria: (opts: {
    kind: CashMovementKind;
    amount: number;
    note?: string;
  }) => { ok: true } | { ok: false; error: string };
  onClose: (opts?: {
    closingNotes?: string;
    wasteDescription?: string;
    wasteWeightKg?: number;
    wasteValue?: number;
    leftoversNote?: string;
    countedDrawerCash?: number;
  }) => { ok: true } | { ok: false; error: string };
}) {
  const [movKind, setMovKind] = useState<CashMovementKind>("sangria");
  const [movAmount, setMovAmount] = useState("");
  const [movNote, setMovNote] = useState("");
  const [movErr, setMovErr] = useState<string | null>(null);

  const [closeOpen, setCloseOpen] = useState(false);
  const [closingNotes, setClosingNotes] = useState("");
  const [wasteDesc, setWasteDesc] = useState("");
  const [wasteKg, setWasteKg] = useState("");
  const [wasteVal, setWasteVal] = useState("");
  const [leftovers, setLeftovers] = useState("");
  const [countedDrawer, setCountedDrawer] = useState("");
  const [closeErr, setCloseErr] = useState<string | null>(null);
  const [expandedChannel, setExpandedChannel] = useState<OrderChannel | null>(null);

  const salesByChannel = useMemo(() => {
    const groups: Record<OrderChannel, CompletedSale[]> = {
      bancada: [],
      mesa: [],
      delivery: [],
    };
    for (const s of sessionSales) {
      groups[normalizeSaleChannel(s.channel)].push(s);
    }
    for (const ch of Object.keys(groups) as OrderChannel[]) {
      groups[ch].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return groups;
  }, [sessionSales]);

  const totalTurno = sessionSales.reduce((a, s) => a + s.total, 0);

  const submitMov = () => {
    setMovErr(null);
    const raw = movAmount.replace(",", ".");
    const n = Number(raw);
    if (movKind !== "ajuste" && (!Number.isFinite(n) || n <= 0)) {
      setMovErr("Informe um valor válido.");
      return;
    }
    if (movKind === "ajuste" && (!Number.isFinite(n) || n === 0)) {
      setMovErr("Ajuste: use valor positivo (entra) ou negativo (sai).");
      return;
    }
    const r = onSangria({ kind: movKind, amount: n, note: movNote || undefined });
    if (!r.ok) setMovErr(r.error);
    else {
      setMovAmount("");
      setMovNote("");
    }
  };

  const submitClose = () => {
    setCloseErr(null);
    const kg = wasteKg.trim() ? Number(wasteKg.replace(",", ".")) : undefined;
    const wv = wasteVal.trim() ? Number(wasteVal.replace(",", ".")) : undefined;
    let countedDrawerCash: number | undefined;
    const cdRaw = countedDrawer.trim();
    if (cdRaw) {
      const n = Number(cdRaw.replace(",", "."));
      if (!Number.isFinite(n) || n < 0) {
        setCloseErr("Valor contado no gaveta inválido.");
        return;
      }
      countedDrawerCash = n;
    }
    const r = onClose({
      closingNotes: closingNotes || undefined,
      wasteDescription: wasteDesc || undefined,
      wasteWeightKg: kg != null && Number.isFinite(kg) ? kg : undefined,
      wasteValue: wv != null && Number.isFinite(wv) ? wv : undefined,
      leftoversNote: leftovers || undefined,
      countedDrawerCash,
    });
    if (!r.ok) setCloseErr(r.error);
    else {
      setCloseOpen(false);
      setClosingNotes("");
      setWasteDesc("");
      setWasteKg("");
      setWasteVal("");
      setLeftovers("");
      setCountedDrawer("");
    }
  };

  const handleExportCsv = () => {
    const csv = buildSessionCsv(session, sessionSales, movements);
    downloadTextFile(
      `turno-caixa-${format(new Date(session.openedAt), "yyyy-MM-dd-HHmm", { locale: ptBR })}.csv`,
      csv,
    );
  };

  const caixaInputClass =
    "border-white/10 bg-zinc-950/40 text-zinc-100 placeholder:text-zinc-600 shadow-inner shadow-black/10 focus:border-brand/45 focus:ring-2 focus:ring-orange-500/15";

  return (
    <>
      <section className="caixa-glass p-5 sm:p-6">
        <div className="caixa-glass-inner flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Caixa aberto</p>
            <p className="mt-1 text-lg font-semibold text-zinc-100">
              Desde {format(new Date(session.openedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </p>
            {session.openedBy && (
              <p className="text-sm text-zinc-400">Responsável: {session.openedBy}</p>
            )}
            {session.expectedCloseAt && (
              <p className="mt-1 text-sm text-zinc-400">
                Fechamento previsto:{" "}
                {format(new Date(session.expectedCloseAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-start">
            {openComandasCount > 0 && (
              <p className="w-full rounded-xl border border-amber-500/25 bg-amber-950/35 px-3 py-2 text-xs text-amber-100/95 sm:order-first">
                <span className="font-semibold">Não é possível fechar o caixa:</span> há{" "}
                {openComandasCount} comanda(s) em aberto. Finalize ou ajuste em{" "}
                <Link href="/comandas" className="font-medium text-brand-light underline">
                  Comandas
                </Link>{" "}
                antes de encerrar o turno.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="inline-flex items-center gap-2 border-white/10 bg-white/5 text-zinc-200 backdrop-blur-sm hover:bg-white/10"
              onClick={handleExportCsv}
            >
              <FileDown className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 disabled:opacity-45"
              disabled={openComandasCount > 0}
              title={
                openComandasCount > 0
                  ? "Feche todas as comandas em aberto antes de encerrar o turno."
                  : undefined
              }
              onClick={() => setCloseOpen(true)}
            >
              Fechar turno
            </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PaymentStatBox
          label="Total vendido no turno"
          value={formatBRL(totalTurno)}
          detail={`${sessionSales.length} ${sessionSales.length === 1 ? "venda" : "vendas"} (volume / notas)`}
          variant="total"
          icon={<Wallet className="h-4 w-4 text-zinc-400" />}
        />
        <PaymentStatBox
          label="Dinheiro (vendas)"
          value={formatBRL(payments.dinheiro)}
          variant="dinheiro"
          icon={<PaymentMethodIcon method="dinheiro" className="h-4 w-4" />}
        />
        <PaymentStatBox
          label="PIX"
          value={formatBRL(payments.pix)}
          variant="pix"
          icon={<PaymentMethodIcon method="pix" className="h-4 w-4" />}
        />
        <PaymentStatBox
          label="Cartões (crédito + débito)"
          value={formatBRL(payments.cartao_credito + payments.cartao_debito)}
          variant="cartao"
          icon={<PaymentMethodIcon method="cartao_credito" className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <section className="caixa-glass flex flex-col p-5 sm:p-6">
          <div className="caixa-glass-inner flex flex-1 flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
              <h3 className="text-base font-semibold text-zinc-100">Canais de venda</h3>
              <span className="shrink-0 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300/95">
                turno ativo
              </span>
            </div>
            <ul className="mt-1 flex-1 space-y-0.5 pt-2">
              <GlassChannelRow
                icon={Store}
                title="Bancada"
                subtitle="PDV, pagamento na hora e venda rápida (tela Comandas)"
                value={channels.bancada}
                expanded={expandedChannel === "bancada"}
                onToggle={() =>
                  setExpandedChannel((c) => (c === "bancada" ? null : "bancada"))
                }
                sales={salesByChannel.bancada}
              />
              <GlassChannelRow
                icon={UtensilsCrossed}
                title="Comanda"
                subtitle="Consumo no local"
                value={channels.mesa}
                expanded={expandedChannel === "mesa"}
                onToggle={() =>
                  setExpandedChannel((c) => (c === "mesa" ? null : "mesa"))
                }
                sales={salesByChannel.mesa}
              />
              <GlassChannelRow
                icon={Truck}
                title="Delivery"
                subtitle="Pedidos para entrega"
                value={channels.delivery}
                expanded={expandedChannel === "delivery"}
                onToggle={() =>
                  setExpandedChannel((c) => (c === "delivery" ? null : "delivery"))
                }
                sales={salesByChannel.delivery}
              />
            </ul>
            <div className="mt-5 border-t border-white/[0.06] pt-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                Dinheiro esperado no gaveta
              </p>
              <p className="mt-1 text-3xl font-bold text-brand-light tabular-nums">
                {formatBRL(drawerExpected)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                Fundo inicial + vendas em dinheiro − sangrias + suprimentos ± ajustes registrados.
              </p>
            </div>
          </div>
        </section>

        <section className="caixa-glass flex flex-col p-5 sm:p-6">
          <div className="caixa-glass-inner flex min-h-0 flex-1 flex-col">
            <h3 className="mb-5 text-base font-semibold text-zinc-100">Sangria / suprimento</h3>
            {movErr && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/35 px-3 py-2 text-sm text-red-200 backdrop-blur-sm">
                {movErr}
              </div>
            )}
            <div className="flex flex-1 flex-col gap-4">
              <div>
                <label className="caixa-field-label">Tipo de movimentação</label>
                <select
                  className={cn(
                    "w-full rounded-xl px-3 py-2.5 text-sm outline-none",
                    caixaInputClass,
                  )}
                  value={movKind}
                  onChange={(e) => setMovKind(e.target.value as CashMovementKind)}
                >
                  <option value="sangria">Sangria (retira do gaveta)</option>
                  <option value="suprimento">Suprimento (coloca no gaveta)</option>
                  <option value="ajuste">Ajuste (+ entra / − sai)</option>
                </select>
              </div>
              <div>
                <label className="caixa-field-label">Valor R$</label>
                <Input
                  className={caixaInputClass}
                  inputMode="decimal"
                  placeholder="0,00"
                  value={movAmount}
                  onChange={(e) => setMovAmount(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="caixa-field-label">Observação</label>
                <Input
                  className={caixaInputClass}
                  placeholder="Ex: sangria para cofre"
                  value={movNote}
                  onChange={(e) => setMovNote(e.target.value)}
                />
              </div>
              <Button
                type="button"
                className="w-full bg-brand py-3 text-base font-semibold shadow-lg shadow-orange-900/20 hover:bg-brand-light"
                onClick={submitMov}
              >
                Registrar movimentação
              </Button>
            </div>
            {movements.length > 0 && (
              <ul className="mt-5 max-h-48 overflow-y-auto border-t border-white/[0.06] pt-4 text-sm scrollbar-thin">
                {movements.slice(0, 20).map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.04] py-2.5 last:border-0">
                    <span className="flex items-center gap-2 text-zinc-300">
                      {m.kind === "sangria" && (
                        <ArrowUpRight className="h-4 w-4 text-red-400/90" aria-hidden />
                      )}
                      {m.kind === "suprimento" && (
                        <ArrowDownLeft className="h-4 w-4 text-emerald-400/90" aria-hidden />
                      )}
                      {m.kind === "ajuste" && <Banknote className="h-4 w-4 text-zinc-500" aria-hidden />}
                      <span className="capitalize">{m.kind}</span>
                      <span className="text-xs text-zinc-600">
                        {format(new Date(m.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </span>
                    <span className="font-mono font-medium text-zinc-200">
                      {m.kind === "ajuste" && m.amount < 0 ? "−" : ""}
                      {formatBRL(Math.abs(m.amount))}
                    </span>
                    {m.note && <span className="w-full text-xs text-zinc-500">{m.note}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className="caixa-glass p-5 sm:p-6">
        <div className="caixa-glass-inner">
        <h3 className="mb-4 text-base font-semibold text-zinc-100">Produtos com maior faturamento (este turno)</h3>
        {topProducts.length === 0 ? (
          <p className="text-sm text-zinc-500">Ainda não há vendas neste turno.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-white/[0.08] text-xs text-zinc-500">
                <tr>
                  <th className="pb-2 pr-4">Produto</th>
                  <th className="pb-2 text-right">Qtd. lanç.</th>
                  <th className="pb-2 text-right">Faturamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {topProducts.map((p) => (
                  <tr key={p.name}>
                    <td className="py-2 pr-4 font-medium text-zinc-100">{p.name}</td>
                    <td className="py-2 text-right text-zinc-400">{p.qty}</td>
                    <td className="py-2 text-right font-medium text-zinc-100">{formatBRL(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </section>

      {closeOpen && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
          <div className="panel-glass max-h-[min(92vh,720px)] w-full max-w-lg overflow-y-auto p-6 shadow-2xl">
            <div className="panel-glass-inner">
            <h3 className="font-display text-lg font-semibold text-zinc-100">Fechar turno de caixa</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Conferência do gaveta (opcional), depois anotações de sobras e desperdício.
            </p>
            {closeErr && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {closeErr}
              </div>
            )}
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-white/10 bg-zinc-950/45 p-3 backdrop-blur-sm">
                <p className="text-xs font-semibold text-zinc-300">Conferência de gaveta (dinheiro físico)</p>
                <p className="mt-1 text-sm text-zinc-200">
                  Esperado pelo sistema:{" "}
                  <span className="font-bold text-brand-light">{formatBRL(drawerExpected)}</span>
                </p>
                <label className="mb-1 mt-3 block text-xs text-zinc-500">
                  Valor contado no gaveta (R$, opcional)
                </label>
                <Input
                  inputMode="decimal"
                  placeholder="ex: 387,50"
                  value={countedDrawer}
                  onChange={(e) => setCountedDrawer(e.target.value)}
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Se preencher, gravamos a diferença (contado − esperado): sobra positiva, falta
                  negativa.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Observações do fechamento</label>
                <Input value={closingNotes} onChange={(e) => setClosingNotes(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Sobras / observações de produção</label>
                <Input value={leftovers} onChange={(e) => setLeftovers(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Desperdício — descrição</label>
                <Input value={wasteDesc} onChange={(e) => setWasteDesc(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">Peso (kg, opcional)</label>
                  <Input inputMode="decimal" value={wasteKg} onChange={(e) => setWasteKg(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">Valor (R$, opcional)</label>
                  <Input inputMode="decimal" value={wasteVal} onChange={(e) => setWasteVal(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setCloseOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={submitClose}>
                Confirmar fechamento
              </Button>
            </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PaymentStatBox({
  label,
  value,
  detail,
  variant,
  icon,
}: {
  label: string;
  value: string;
  /** Linha extra (ex.: quantidade de vendas no turno). */
  detail?: string;
  variant: "total" | "dinheiro" | "pix" | "cartao";
  icon: ReactNode;
}) {
  const shell =
    variant === "total"
      ? "border-white/10 bg-zinc-800/35 text-zinc-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md"
      : variant === "dinheiro"
        ? "border-emerald-400/25 bg-emerald-500/[0.12] text-emerald-50 backdrop-blur-md"
        : variant === "pix"
          ? "border-[#32BCAD]/35 bg-[#32BCAD]/[0.12] text-[#dffaf6] backdrop-blur-md"
          : "border-sky-400/25 bg-sky-500/[0.1] text-sky-50 backdrop-blur-md";
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 backdrop-blur-md",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
        shell,
      )}
    >
      <div className="relative z-[1] flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide opacity-95">
        {icon}
        <span>{label}</span>
      </div>
      <p className="relative z-[1] mt-2 text-lg font-bold tabular-nums">{value}</p>
      {detail ? (
        <p className="relative z-[1] mt-1 text-xs font-medium tabular-nums opacity-90">{detail}</p>
      ) : null}
    </div>
  );
}
