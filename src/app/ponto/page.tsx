"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays,
  Clock,
  FileText,
  Pencil,
  Settings2,
  Trash2,
  Briefcase,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { JobPositionAdminPanel } from "@/components/ponto/JobPositionAdminPanel";
import { employeeRoleLabel, employeeScheduleId } from "@/lib/employee-schedule";
import { isRoleAtLeast } from "@/lib/tenant-access";
import { PontoCalendarPanel } from "@/components/ponto/PontoCalendarPanel";
import { useAppStore } from "@/store/useAppStore";
import type { PunchKind, TimePunch, TimeSchedule, Weekday, WorkShift } from "@/types";

type Tab = "relogio" | "cargo" | "horarios" | "calendario" | "folgas" | "cartao";

type SchDayRow = {
  enabled: boolean;
  t1s: string;
  t1e: string;
  t2s: string;
  t2e: string;
};

function defaultSchDays(): Record<Weekday, SchDayRow> {
  const off: SchDayRow = { enabled: false, t1s: "08:00", t1e: "12:00", t2s: "", t2e: "" };
  const full: SchDayRow = { enabled: true, t1s: "08:00", t1e: "12:00", t2s: "14:00", t2e: "18:00" };
  const satHalf: SchDayRow = { enabled: false, t1s: "08:00", t1e: "12:00", t2s: "", t2e: "" };
  return {
    seg: { ...full },
    ter: { ...full },
    qua: { ...full },
    qui: { ...full },
    sex: { ...full },
    sab: { ...satHalf },
    dom: { ...off },
  };
}

function scheduleToSchDays(schedule: TimeSchedule): Record<Weekday, SchDayRow> {
  const base = defaultSchDays();
  for (const d of weekdays) {
    const shifts = schedule.days[d.id] ?? [];
    if (!shifts.length) {
      base[d.id] = { enabled: false, t1s: "08:00", t1e: "12:00", t2s: "", t2e: "" };
      continue;
    }
    base[d.id] = {
      enabled: true,
      t1s: shifts[0]?.start ?? "08:00",
      t1e: shifts[0]?.end ?? "12:00",
      t2s: shifts[1]?.start ?? "",
      t2e: shifts[1]?.end ?? "",
    };
  }
  return base;
}

function buildShiftsFromRow(row: SchDayRow): WorkShift[] {
  if (!row.enabled) return [];
  const shifts: WorkShift[] = [];
  if (parseHm(row.t1s) != null && parseHm(row.t1e) != null) {
    shifts.push({ start: row.t1s.trim(), end: row.t1e.trim() });
  }
  if (row.t2s.trim() && row.t2e.trim() && parseHm(row.t2s) != null && parseHm(row.t2e) != null) {
    shifts.push({ start: row.t2s.trim(), end: row.t2e.trim() });
  }
  return shifts;
}

const weekdays: { id: Weekday; label: string }[] = [
  { id: "seg", label: "Seg" },
  { id: "ter", label: "Ter" },
  { id: "qua", label: "Qua" },
  { id: "qui", label: "Qui" },
  { id: "sex", label: "Sex" },
  { id: "sab", label: "Sáb" },
  { id: "dom", label: "Dom" },
];

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function punchLabel(k: PunchKind) {
  return k
    .replace("entrada", "Entrada")
    .replace("saida", "Saída")
    .replace("_", " ");
}

function parseHm(hm: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function shiftsTotalMinutes(shifts: WorkShift[] | undefined): number {
  if (!shifts?.length) return 0;
  let sum = 0;
  for (const s of shifts) {
    const a = parseHm(s.start);
    const b = parseHm(s.end);
    if (a == null || b == null) continue;
    sum += Math.max(0, b - a);
  }
  return sum;
}

function punchesForDay(punches: TimePunch[], employeeId: string, ymd: string): TimePunch[] {
  return punches
    .filter((p) => p.employeeId === employeeId && p.at.slice(0, 10) === ymd)
    .sort((a, b) => a.at.localeCompare(b.at));
}

function dayWorkedMinutes(day: TimePunch[]): number {
  // pares: entrada_1/saida_1, entrada_2/saida_2...
  const toMin = (iso: string) => {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
  };
  const byKind = new Map<string, TimePunch>();
  for (const p of day) byKind.set(p.kind, p);
  const pairs: [PunchKind, PunchKind][] = [
    ["entrada_1", "saida_1"],
    ["entrada_2", "saida_2"],
    ["entrada_3", "saida_3"],
  ];
  let sum = 0;
  for (const [a, b] of pairs) {
    const pa = byKind.get(a);
    const pb = byKind.get(b);
    if (!pa || !pb) continue;
    const da = toMin(pa.at);
    const db = toMin(pb.at);
    sum += Math.max(0, db - da);
  }
  return sum;
}

function weekdayFromYmd(ymd: string): Weekday | null {
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const n = d.getDay(); // 0=Dom
  const map: Weekday[] = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
  return map[n] ?? null;
}

function plannedMinutesForDay(
  schedule: TimeSchedule | undefined,
  ymd: string,
  timeOff: { date: string; employeeId?: string; kind: string }[],
  employeeId?: string,
): number {
  const storeHoliday = timeOff.some((o) => o.date === ymd && o.kind === "feriado" && !o.employeeId);
  if (storeHoliday) return 0;
  const personal = timeOff.find(
    (o) => o.date === ymd && o.employeeId === employeeId && o.kind !== "feriado",
  );
  if (personal) return 0;
  if (!schedule) return 0;
  const wd = weekdayFromYmd(ymd);
  if (!wd) return 0;
  return shiftsTotalMinutes(schedule.days[wd]);
}

function plannedStartMinute(schedule: TimeSchedule | undefined, ymd: string): number | null {
  if (!schedule) return null;
  const wd = weekdayFromYmd(ymd);
  if (!wd) return null;
  const shifts = schedule.days[wd];
  if (!shifts?.length) return null;
  return parseHm(shifts[0]?.start ?? "");
}

export default function PontoPage() {
  const company = useAppStore((s) => s.company);
  const auth = useAppStore((s) => s.auth);
  const employees = useAppStore((s) => s.employees);
  const jobPositions = useAppStore((s) => s.jobPositions);
  const schedules = useAppStore((s) => s.schedules);
  const timeOff = useAppStore((s) => s.timeOff);
  const punches = useAppStore((s) => s.punches);
  const registerPunch = useAppStore((s) => s.registerPunch);
  const addSchedule = useAppStore((s) => s.addSchedule);
  const updateSchedule = useAppStore((s) => s.updateSchedule);
  const removeSchedule = useAppStore((s) => s.removeSchedule);
  const toggleScheduleActive = useAppStore((s) => s.toggleScheduleActive);
  const addTimeOff = useAppStore((s) => s.addTimeOff);
  const removeTimeOff = useAppStore((s) => s.removeTimeOff);

  const [tab, setTab] = useState<Tab>("relogio");
  const pontoAdmin = isRoleAtLeast(auth.role, "gerente");

  useEffect(() => {
    if (!pontoAdmin && tab !== "relogio") setTab("relogio");
  }, [pontoAdmin, tab]);

  const scheduleById = useMemo(
    () => new Map(schedules.map((s) => [s.id, s])),
    [schedules],
  );

  // Relógio
  const [clockCode, setClockCode] = useState("");
  const [clockMsg, setClockMsg] = useState<string | null>(null);
  const today = new Date();
  const todayYmd = format(today, "yyyy-MM-dd");
  const todayPunches = useMemo(
    () =>
      punches
        .filter((p) => p.at.slice(0, 10) === todayYmd)
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 18),
    [punches, todayYmd],
  );

  // Funcionários

  // Horários
  const [schName, setSchName] = useState("");
  const [schDays, setSchDays] = useState<Record<Weekday, SchDayRow>>(defaultSchDays);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [schFormErr, setSchFormErr] = useState<string | null>(null);

  const resetScheduleForm = () => {
    setSchName("");
    setSchDays(defaultSchDays());
    setEditingScheduleId(null);
    setSchFormErr(null);
  };

  const startEditSchedule = (s: TimeSchedule) => {
    setEditingScheduleId(s.id);
    setSchName(s.name);
    setSchDays(scheduleToSchDays(s));
    setSchFormErr(null);
  };

  const saveScheduleForm = () => {
    setSchFormErr(null);
    const name = schName.trim();
    if (!name) {
      setSchFormErr("Informe o nome da carga.");
      return;
    }
    const dayShifts: Partial<Record<Weekday, WorkShift[]>> = {};
    for (const d of weekdays) {
      const shifts = buildShiftsFromRow(schDays[d.id]);
      if (shifts.length) dayShifts[d.id] = shifts;
    }
    if (!Object.keys(dayShifts).length) {
      setSchFormErr("Marque ao menos um dia com horário válido.");
      return;
    }
    if (editingScheduleId) {
      updateSchedule(editingScheduleId, { name, days: dayShifts });
      resetScheduleForm();
      return;
    }
    addSchedule({
      name,
      days: dayShifts,
      active: true,
      tenantId: undefined,
      empresaId: undefined,
    });
    resetScheduleForm();
  };

  const deleteSchedule = (id: string, name: string) => {
    const linkedEmp = employees.filter((e) => employeeScheduleId(e, jobPositions) === id);
    const linkedPos = jobPositions.filter((p) => p.scheduleId === id);
    if (linkedEmp.length || linkedPos.length) {
      setSchFormErr(
        `Não é possível excluir "${name}": vinculado a ${linkedPos.length} cargo(s) e ${linkedEmp.length} funcionário(s).`,
      );
      return;
    }
    if (!window.confirm(`Excluir a carga "${name}"?`)) return;
    removeSchedule(id);
    if (editingScheduleId === id) resetScheduleForm();
    setSchFormErr(null);
  };

  // Folgas
  const [offEmpId, setOffEmpId] = useState("");
  const [offDate, setOffDate] = useState(todayYmd);
  const [offKind, setOffKind] = useState<"folga" | "atestado" | "falta" | "ferias" | "feriado" | "outro">("folga");
  const [offNote, setOffNote] = useState("");

  // Cartão ponto (mês)
  const [cardEmpId, setCardEmpId] = useState<string>("");
  const [cardMonth, setCardMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [cardNetting, setCardNetting] = useState(true);
  const [cardOnlyDiff, setCardOnlyDiff] = useState(false);

  const allTabs = [
    { id: "relogio" as const, label: "Relógio", icon: Clock },
    { id: "cargo" as const, label: "Cargo", icon: Briefcase },
    { id: "horarios" as const, label: "Horários", icon: Settings2 },
    { id: "calendario" as const, label: "Calendário", icon: CalendarDays },
    { id: "folgas" as const, label: "Folgas", icon: CalendarDays },
    { id: "cartao" as const, label: "Cartão ponto", icon: FileText },
  ];
  const tabs = pontoAdmin ? allTabs : allTabs.filter((t) => t.id === "relogio");

  const employeesActive = useMemo(
    () => employees.filter((e) => e.active).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [employees],
  );

  const selectedCardEmp = useMemo(
    () => (cardEmpId ? employees.find((e) => e.id === cardEmpId) ?? null : null),
    [employees, cardEmpId],
  );

  const monthDays = useMemo(() => {
    if (!/^\d{4}-\d{2}$/.test(cardMonth)) return [];
    const [y, m] = cardMonth.split("-").map((x) => Number(x));
    const start = new Date(y, m - 1, 1);
    const out: string[] = [];
    while (start.getMonth() === m - 1) {
      out.push(format(start, "yyyy-MM-dd"));
      start.setDate(start.getDate() + 1);
    }
    return out;
  }, [cardMonth]);

  const cardRows = useMemo(() => {
    if (!selectedCardEmp) return [];
    const schId = employeeScheduleId(selectedCardEmp, jobPositions);
    const sch = schId ? scheduleById.get(schId) : undefined;
    const out = monthDays.map((ymd) => {
      const dayP = punchesForDay(punches, selectedCardEmp.id, ymd);
      const mins = dayWorkedMinutes(dayP);
      const planned = plannedMinutesForDay(sch, ymd, timeOff, selectedCardEmp.id);
      const off =
        timeOff.find(
          (o) =>
            o.date === ymd &&
            (!o.employeeId || o.employeeId === selectedCardEmp.id),
        ) ?? null;

      // atraso: se tiver entrada_1 e horário planejado
      const p0 = dayP.find((p) => p.kind === "entrada_1") ?? null;
      const planStart = plannedStartMinute(sch, ymd);
      let lateMin = 0;
      if (p0 && planStart != null) {
        const d = new Date(p0.at);
        const atMin = d.getHours() * 60 + d.getMinutes();
        lateMin = Math.max(0, atMin - planStart);
      }

      const extra = Math.max(0, mins - planned);
      const falta = Math.max(0, planned - mins);
      // Abatimento: usa extra para cobrir primeiro atraso, depois falta.
      const extraAfterLate = Math.max(0, extra - lateMin);
      const lateAdj = Math.max(0, lateMin - extra);
      const extraAdj = Math.max(0, extraAfterLate - falta);
      const faltaAdj = Math.max(0, falta - extraAfterLate);

      return {
        ymd,
        punches: dayP,
        mins,
        planned,
        extra,
        falta,
        lateMin,
        off,
        extraAdj,
        faltaAdj,
        lateAdj,
      };
    });
    if (!cardOnlyDiff) return out;
    return out.filter((r) => {
      const ex = cardNetting ? r.extraAdj : r.extra;
      const fa = cardNetting ? r.faltaAdj : r.falta;
      const la = cardNetting ? r.lateAdj : r.lateMin;
      return (ex ?? 0) > 0 || (fa ?? 0) > 0 || (la ?? 0) > 0 || !!r.off;
    });
  }, [monthDays, punches, selectedCardEmp, scheduleById, timeOff, cardNetting, cardOnlyDiff, jobPositions]);

  const cardTotals = useMemo(() => {
    const total = cardRows.reduce((a, r) => a + r.mins, 0);
    const planned = cardRows.reduce((a, r) => a + (r.planned ?? 0), 0);
    const extra = cardRows.reduce((a, r) => a + (cardNetting ? (r.extraAdj ?? 0) : (r.extra ?? 0)), 0);
    const falta = cardRows.reduce((a, r) => a + (cardNetting ? (r.faltaAdj ?? 0) : (r.falta ?? 0)), 0);
    const late = cardRows.reduce((a, r) => a + (cardNetting ? (r.lateAdj ?? 0) : (r.lateMin ?? 0)), 0);
    return {
      total,
      planned,
      extra,
      falta,
      late,
      label: minutesToHHMM(total),
      plannedLabel: minutesToHHMM(planned),
      extraLabel: minutesToHHMM(extra),
      faltaLabel: minutesToHHMM(falta),
      lateLabel: minutesToHHMM(late),
    };
  }, [cardRows, cardNetting]);

  return (
    <div className="p-6 lg:p-10 print:p-0">
      <header className="mb-6 print:hidden">
        <h1 className="font-display text-3xl font-semibold text-zinc-100">Ponto</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Batida de ponto, cargos, horários e cartão (gestão visível para gerência).
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2 print:hidden">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              tab === id
                ? "border-brand bg-brand text-white shadow-sm"
                : "border-white/10 bg-zinc-900/40 text-zinc-400 shadow-card hover:bg-zinc-800/50"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {label}
            </span>
          </button>
        ))}
      </div>

      {tab === "relogio" && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="panel-glass p-6">
            <div className="panel-glass-inner">
              <h2 className="text-lg font-semibold text-zinc-100">Relógio de ponto</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Digite o <span className="font-semibold text-zinc-300">código</span> (matrícula) e confirme para
                registrar a próxima batida do dia.
              </p>
              <div className="mt-4 flex gap-2">
                <Input
                  className="font-mono"
                  value={clockCode}
                  onChange={(e) => setClockCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    const r = registerPunch({ clockCode });
                    if (!r.ok) setClockMsg(r.error);
                    else setClockMsg(r.message);
                    setClockCode("");
                  }}
                  placeholder="Ex.: 001"
                  autoFocus
                />
                <Button
                  type="button"
                  onClick={() => {
                    const r = registerPunch({ clockCode });
                    if (!r.ok) setClockMsg(r.error);
                    else setClockMsg(r.message);
                    setClockCode("");
                  }}
                >
                  Registrar
                </Button>
              </div>
              {clockMsg && (
                <div className="mt-3 rounded-xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-200">
                  {clockMsg}
                </div>
              )}
              <p className="mt-4 text-xs text-zinc-500">
                Data: <span className="font-mono">{todayYmd}</span> · horário local{" "}
                <span className="font-mono">{format(new Date(), "HH:mm:ss", { locale: ptBR })}</span>
              </p>
            </div>
          </div>

          <div className="panel-glass p-6">
            <div className="panel-glass-inner">
              <h2 className="text-lg font-semibold text-zinc-100">Últimas batidas (hoje)</h2>
              {todayPunches.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">Nenhuma batida registrada hoje.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {todayPunches.map((p) => {
                    const emp = employees.find((e) => e.id === p.employeeId);
                    return (
                      <li
                        key={p.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-100">{emp?.name ?? "—"}</p>
                          <p className="text-xs text-zinc-500">{punchLabel(p.kind)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-zinc-200 tabular-nums">
                            {format(new Date(p.at), "HH:mm", { locale: ptBR })}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {format(new Date(p.at), "dd/MM", { locale: ptBR })}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      {tab === "cargo" && pontoAdmin && <JobPositionAdminPanel />}

      {tab === "horarios" && (
        <section className="space-y-6">
          <div className="panel-glass p-6">
            <div className="panel-glass-inner">
              <h2 className="text-lg font-semibold text-zinc-100">
                {editingScheduleId ? "Editar carga horária" : "Cadastrar carga horária"}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Defina horários por dia — ex.: seg–sex integral e sábado só de manhã.
                {editingScheduleId ? " Clique em outra carga abaixo ou cancele para criar uma nova." : ""}
              </p>
              {schFormErr && (
                <p className="mt-3 rounded-lg border border-red-500/30 bg-red-950/35 px-3 py-2 text-sm text-red-200">
                  {schFormErr}
                </p>
              )}
              <div className="mt-4 space-y-3">
                <div className="max-w-md">
                  <label className="mb-1 block text-xs text-zinc-500">Nome</label>
                  <Input value={schName} onChange={(e) => setSchName(e.target.value)} placeholder="Ex.: Comercial" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setSchDays((prev) => {
                        const full: SchDayRow = {
                          enabled: true,
                          t1s: "08:00",
                          t1e: "12:00",
                          t2s: "14:00",
                          t2e: "18:00",
                        };
                        const next = { ...prev };
                        for (const id of ["seg", "ter", "qua", "qui", "sex"] as Weekday[]) {
                          next[id] = { ...full };
                        }
                        return next;
                      })
                    }
                  >
                    Seg–Sex comercial
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setSchDays((prev) => ({
                        ...prev,
                        sab: { enabled: true, t1s: "08:00", t1e: "12:00", t2s: "", t2e: "" },
                      }))
                    }
                  >
                    Sáb. meio período
                  </Button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-zinc-950/50 text-left text-[11px] uppercase text-zinc-500">
                      <tr>
                        <th className="px-2 py-2">Dia</th>
                        <th className="px-2 py-2">Ativo</th>
                        <th className="px-2 py-2">1ª entrada</th>
                        <th className="px-2 py-2">1ª saída</th>
                        <th className="px-2 py-2">2ª entrada</th>
                        <th className="px-2 py-2">2ª saída</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weekdays.map((d) => {
                        const row = schDays[d.id];
                        return (
                          <tr key={d.id} className="border-t border-white/5">
                            <td className="px-2 py-2 font-medium text-zinc-200">{d.label}</td>
                            <td className="px-2 py-2">
                              <input
                                type="checkbox"
                                checked={row.enabled}
                                onChange={(e) =>
                                  setSchDays((prev) => ({
                                    ...prev,
                                    [d.id]: { ...prev[d.id], enabled: e.target.checked },
                                  }))
                                }
                                className="h-4 w-4 rounded border-zinc-600 text-brand"
                              />
                            </td>
                            {(["t1s", "t1e", "t2s", "t2e"] as const).map((key) => (
                              <td key={key} className="px-2 py-1">
                                <Input
                                  value={row[key]}
                                  disabled={!row.enabled}
                                  onChange={(e) =>
                                    setSchDays((prev) => ({
                                      ...prev,
                                      [d.id]: { ...prev[d.id], [key]: e.target.value },
                                    }))
                                  }
                                  className="h-8 font-mono text-xs"
                                  placeholder="—"
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {editingScheduleId && (
                    <Button type="button" variant="secondary" onClick={resetScheduleForm}>
                      Cancelar edição
                    </Button>
                  )}
                  <Button type="button" onClick={saveScheduleForm}>
                    {editingScheduleId ? "Atualizar carga" : "Salvar carga"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="panel-glass p-6">
            <div className="panel-glass-inner">
              <h2 className="text-lg font-semibold text-zinc-100">Cargas cadastradas</h2>
              {schedules.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">Nenhuma carga cadastrada.</p>
              ) : (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {schedules
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
                    .map((s) => {
                      const weeklyMin = weekdays.reduce((acc, d) => acc + shiftsTotalMinutes(s.days[d.id]), 0);
                      return (
                        <div
                          key={s.id}
                          className={`rounded-2xl border bg-zinc-950/30 p-4 transition ${
                            editingScheduleId === s.id
                              ? "border-brand/50 ring-1 ring-brand/30"
                              : "border-white/10 hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => startEditSchedule(s)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <p className="flex items-center gap-1.5 truncate font-semibold text-zinc-100">
                                <Pencil className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                                {s.name}
                              </p>
                              <p className="mt-1 text-xs text-zinc-500">
                                Semana: <span className="font-mono">{minutesToHHMM(weeklyMin)}</span> (estimado)
                                <span className="text-zinc-600"> · clique para editar</span>
                              </p>
                            </button>
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => deleteSchedule(s.id, s.name)}
                                className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-300"
                                title="Excluir carga"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleScheduleActive(s.id)}
                                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                                  s.active ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-800 text-zinc-400"
                                }`}
                              >
                                {s.active ? "Ativa" : "Inativa"}
                              </button>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-1 text-xs text-zinc-400">
                            {weekdays.map((d) => {
                              const shifts = s.days[d.id] ?? [];
                              return (
                                <div key={d.id} className="flex items-center justify-between gap-2">
                                  <span className="text-zinc-500">{d.label}</span>
                                  <span className="font-mono text-zinc-300">
                                    {shifts.length
                                      ? shifts.map((x) => `${x.start}–${x.end}`).join(" · ")
                                      : "—"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {tab === "calendario" && <PontoCalendarPanel />}

      {tab === "folgas" && (
        <section className="space-y-6">
          <div className="panel-glass p-6">
            <div className="panel-glass-inner">
              <h2 className="text-lg font-semibold text-zinc-100">Lançar folga / ocorrência</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="lg:col-span-2">
                  <label className="mb-1 block text-xs text-zinc-500">Funcionário</label>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-brand focus:ring-2 focus:ring-orange-500/25"
                    value={offEmpId}
                    onChange={(e) => setOffEmpId(e.target.value)}
                  >
                    <option value="">Selecione…</option>
                    {employeesActive.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.registry ?? e.clockCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">Data</label>
                  <Input type="date" value={offDate} onChange={(e) => setOffDate(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">Tipo</label>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2.5 text-sm text-zinc-100 outline-none"
                    value={offKind}
                    onChange={(e) => setOffKind(e.target.value as typeof offKind)}
                  >
                    <option value="folga">Folga</option>
                    <option value="atestado">Atestado</option>
                    <option value="ferias">Férias</option>
                    <option value="falta">Falta</option>
                    <option value="feriado">Feriado (funcionário)</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div className="lg:col-span-4">
                  <label className="mb-1 block text-xs text-zinc-500">Observação (opcional)</label>
                  <Input value={offNote} onChange={(e) => setOffNote(e.target.value)} placeholder="Ex.: médico, viagem…" />
                </div>
                <div className="lg:col-span-4 flex justify-end">
                  <Button
                    type="button"
                    onClick={() => {
                      if (offKind !== "feriado" && !offEmpId) return;
                      if (!isYmd(offDate)) return;
                      addTimeOff({
                        employeeId: offKind === "feriado" && !offEmpId ? undefined : offEmpId,
                        date: offDate,
                        kind: offKind,
                        note: offNote.trim() || undefined,
                        tenantId: undefined,
                        empresaId: undefined,
                      });
                      setOffNote("");
                    }}
                  >
                    Lançar
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="panel-glass p-6">
            <div className="panel-glass-inner">
              <h2 className="text-lg font-semibold text-zinc-100">Ocorrências</h2>
              {timeOff.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">Nenhuma ocorrência registrada.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {timeOff
                    .slice()
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, 50)
                    .map((o) => {
                      const emp = employees.find((e) => e.id === o.employeeId);
                      return (
                        <li
                          key={o.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-zinc-100">
                              {emp?.name ?? (o.kind === "feriado" ? "Feriado (loja)" : "—")}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {format(new Date(o.date), "dd/MM/yyyy", { locale: ptBR })} · {o.kind}
                              {o.note ? ` · ${o.note}` : ""}
                            </p>
                          </div>
                          <Button variant="secondary" type="button" onClick={() => removeTimeOff(o.id)}>
                            Remover
                          </Button>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      {tab === "cartao" && (
        <section className="space-y-6">
          <div className="panel-glass p-6 print:hidden">
            <div className="panel-glass-inner">
              <h2 className="text-lg font-semibold text-zinc-100">Cartão ponto (mês)</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="lg:col-span-2">
                  <label className="mb-1 block text-xs text-zinc-500">Funcionário</label>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-brand focus:ring-2 focus:ring-orange-500/25"
                    value={cardEmpId}
                    onChange={(e) => setCardEmpId(e.target.value)}
                  >
                    <option value="">Selecione…</option>
                    {employees
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name} ({e.registry ?? e.clockCode})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">Competência</label>
                  <Input type="month" value={cardMonth} onChange={(e) => setCardMonth(e.target.value)} />
                </div>
                <div className="flex items-end justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => window.print()}
                    disabled={!selectedCardEmp}
                  >
                    Imprimir
                  </Button>
                </div>
              </div>
              {selectedCardEmp && (
                <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-xs text-zinc-300">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={cardNetting}
                      onChange={(e) => setCardNetting(e.target.checked)}
                    />
                    Abater extra em atraso/falta
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={cardOnlyDiff}
                      onChange={(e) => setCardOnlyDiff(e.target.checked)}
                    />
                    Mostrar apenas divergências (extra/atraso/falta/ocorrência)
                  </label>
                </div>
              )}
              {selectedCardEmp && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <Badge>
                    Total no mês: <span className="ml-1 font-mono">{cardTotals.label}</span>
                  </Badge>
                  <Badge className="bg-zinc-900/50 text-zinc-200">
                    Previsto: <span className="ml-1 font-mono">{cardTotals.plannedLabel}</span>
                  </Badge>
                  <Badge className="bg-emerald-500/10 text-emerald-200">
                    Extra: <span className="ml-1 font-mono">{cardTotals.extraLabel}</span>
                  </Badge>
                  <Badge className="bg-amber-500/10 text-amber-200">
                    Falta: <span className="ml-1 font-mono">{cardTotals.faltaLabel}</span>
                  </Badge>
                  <Badge className="bg-sky-500/10 text-sky-200">
                    Atraso: <span className="ml-1 font-mono">{cardTotals.lateLabel}</span>
                  </Badge>
                  <span className="text-zinc-600">
                    (Protótipo: cálculos automáticos para demonstrar o layout. Regras trabalhistas e banco de horas entram
                    na próxima fase.)
                  </span>
                </div>
              )}
            </div>
          </div>

          {selectedCardEmp ? (
            <div className="space-y-4">
              {/* Layout de impressão (estilo “cartão ponto”) */}
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/30 shadow-card print:border-black print:bg-white print:text-black">
                <div className="p-5 print:p-0">
                  <div className="grid gap-4 print:gap-0">
                    <div className="flex flex-col gap-2 border-b border-white/10 pb-4 print:border-black print:px-6 print:py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 print:text-black">
                            Cartão ponto
                          </p>
                          <h3 className="mt-1 font-display text-xl font-semibold text-zinc-100 print:text-black">
                            {company.name}
                          </h3>
                          <p className="mt-0.5 text-xs text-zinc-500 print:text-black">
                            CNPJ: <span className="font-mono">{company.cnpj}</span> · {company.address} · {company.phone}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-zinc-500 print:text-black">Período</p>
                          <p className="font-mono text-sm text-zinc-100 print:text-black">
                            {cardMonth.replace("-", "/")}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 print:text-black">
                            Funcionário
                          </p>
                          <p className="text-sm font-semibold text-zinc-100 print:text-black">{selectedCardEmp.name}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 print:text-black">
                            Matrícula
                          </p>
                          <p className="font-mono text-sm text-zinc-100 print:text-black">
                            {selectedCardEmp.registry ?? selectedCardEmp.clockCode}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 print:text-black">
                            Função
                          </p>
                          <p className="text-sm text-zinc-100 print:text-black">
                            {employeeRoleLabel(selectedCardEmp, jobPositions)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 print:text-black">
                            Carga
                          </p>
                          <p className="text-sm text-zinc-100 print:text-black">
                            {(() => {
                              const sid = employeeScheduleId(selectedCardEmp, jobPositions);
                              return sid ? scheduleById.get(sid)?.name ?? "—" : "—";
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* quadro de horários */}
                    <div className="border-b border-white/10 py-4 print:border-black print:px-6 print:py-4">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 print:text-black">
                        Horário de trabalho (planejado)
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {weekdays.map((d) => {
                          const schId = employeeScheduleId(selectedCardEmp, jobPositions);
    const sch = schId ? scheduleById.get(schId) : undefined;
                          const shifts = sch?.days[d.id] ?? [];
                          const label = shifts.length ? shifts.map((s) => `${s.start}–${s.end}`).join(" · ") : "Folga";
                          return (
                            <div key={d.id} className="rounded-xl border border-white/10 bg-zinc-950/30 px-3 py-2 print:border-black print:bg-white">
                              <p className="text-xs font-semibold text-zinc-300 print:text-black">{d.label}</p>
                              <p className="mt-0.5 font-mono text-xs text-zinc-100 print:text-black">{label}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* tabela */}
                    <div className="scrollbar-thin overflow-x-auto print:px-6 print:py-4">
                      <table className="w-full min-w-[1200px] text-left text-sm print:min-w-0">
                        <thead className="border-b border-white/[0.08] bg-zinc-950/60 text-xs font-semibold uppercase tracking-wide text-zinc-500 print:bg-white print:text-black print:border-black">
                          <tr>
                            <th className="px-3 py-2.5">Data</th>
                            <th className="px-3 py-2.5">Ent. 1</th>
                            <th className="px-3 py-2.5">Sai. 1</th>
                            <th className="px-3 py-2.5">Ent. 2</th>
                            <th className="px-3 py-2.5">Sai. 2</th>
                            <th className="px-3 py-2.5">Ent. 3</th>
                            <th className="px-3 py-2.5">Sai. 3</th>
                            <th className="px-3 py-2.5 text-right">Prev.</th>
                            <th className="px-3 py-2.5 text-right">Trab.</th>
                            <th className="px-3 py-2.5 text-right">Extra</th>
                            <th className="px-3 py-2.5 text-right">Falta</th>
                            <th className="px-3 py-2.5 text-right">Atraso</th>
                            <th className="px-3 py-2.5">Ocorrência</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06] print:divide-black">
                          {cardRows.map((r) => {
                            const m = new Map(r.punches.map((p) => [p.kind, p]));
                            const fmt = (p?: TimePunch) =>
                              p ? format(new Date(p.at), "HH:mm", { locale: ptBR }) : "—";
                            const rowExtra = cardNetting ? (r.extraAdj ?? 0) : (r.extra ?? 0);
                            const rowFalta = cardNetting ? (r.faltaAdj ?? 0) : (r.falta ?? 0);
                            const rowLate = cardNetting ? (r.lateAdj ?? 0) : (r.lateMin ?? 0);
                            const rowTone =
                              r.off?.kind === "falta"
                                ? "text-red-300"
                                : rowLate > 0 || rowFalta > 0
                                  ? "text-amber-200"
                                  : "text-zinc-300";
                            return (
                              <tr key={r.ymd} className={`${rowTone} print:text-black`}>
                                <td className="px-3 py-2 whitespace-nowrap text-zinc-400 print:text-black">
                                  {format(new Date(r.ymd), "dd/MM/yyyy", { locale: ptBR })}
                                </td>
                                <td className="px-3 py-2 font-mono">{fmt(m.get("entrada_1"))}</td>
                                <td className="px-3 py-2 font-mono">{fmt(m.get("saida_1"))}</td>
                                <td className="px-3 py-2 font-mono">{fmt(m.get("entrada_2"))}</td>
                                <td className="px-3 py-2 font-mono">{fmt(m.get("saida_2"))}</td>
                                <td className="px-3 py-2 font-mono">{fmt(m.get("entrada_3"))}</td>
                                <td className="px-3 py-2 font-mono">{fmt(m.get("saida_3"))}</td>
                                <td className="px-3 py-2 text-right font-mono tabular-nums">{minutesToHHMM(r.planned ?? 0)}</td>
                                <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-200 print:text-black">{minutesToHHMM(r.mins)}</td>
                                <td className="px-3 py-2 text-right font-mono tabular-nums text-emerald-200 print:text-black">{minutesToHHMM(rowExtra)}</td>
                                <td className="px-3 py-2 text-right font-mono tabular-nums text-amber-200 print:text-black">{minutesToHHMM(rowFalta)}</td>
                                <td className="px-3 py-2 text-right font-mono tabular-nums text-sky-200 print:text-black">{minutesToHHMM(rowLate)}</td>
                                <td className="px-3 py-2 text-xs text-zinc-500 print:text-black">
                                  {r.off ? `${r.off.kind}${r.off.note ? ` · ${r.off.note}` : ""}` : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="border-t border-white/[0.08] bg-zinc-950/40 text-sm font-semibold text-zinc-200 print:bg-white print:text-black print:border-black">
                          <tr>
                            <td className="px-3 py-2.5" colSpan={7}>
                              Totais do mês
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono">{cardTotals.plannedLabel}</td>
                            <td className="px-3 py-2.5 text-right font-mono">{cardTotals.label}</td>
                            <td className="px-3 py-2.5 text-right font-mono">{cardTotals.extraLabel}</td>
                            <td className="px-3 py-2.5 text-right font-mono">{cardTotals.faltaLabel}</td>
                            <td className="px-3 py-2.5 text-right font-mono">{cardTotals.lateLabel}</td>
                            <td className="px-3 py-2.5 text-xs text-zinc-500 print:text-black">—</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Selecione um funcionário para visualizar o cartão ponto.</p>
          )}
        </section>
      )}
    </div>
  );
}

