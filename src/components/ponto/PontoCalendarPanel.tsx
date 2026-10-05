"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { TimeOffKind } from "@/types";

function isYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

const kindLabel: Record<TimeOffKind, string> = {
  folga: "Folga",
  ferias: "Férias",
  atestado: "Atestado",
  falta: "Falta",
  feriado: "Feriado",
  outro: "Outro",
};

export function PontoCalendarPanel() {
  const timeOff = useAppStore((s) => s.timeOff);
  const employees = useAppStore((s) => s.employees);
  const addTimeOff = useAppStore((s) => s.addTimeOff);
  const removeTimeOff = useAppStore((s) => s.removeTimeOff);

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedYmd, setSelectedYmd] = useState<string | null>(null);
  const [holidayNote, setHolidayNote] = useState("");

  const monthStart = startOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const byDate = useMemo(() => {
    const map = new Map<string, typeof timeOff>();
    for (const o of timeOff) {
      const list = map.get(o.date) ?? [];
      list.push(o);
      map.set(o.date, list);
    }
    return map;
  }, [timeOff]);

  const selectedEntries = selectedYmd ? byDate.get(selectedYmd) ?? [] : [];

  const addHoliday = () => {
    if (!selectedYmd || !isYmd(selectedYmd)) return;
    addTimeOff({
      date: selectedYmd,
      kind: "feriado",
      note: holidayNote.trim() || "Feriado",
      tenantId: undefined,
      empresaId: undefined,
    });
    setHolidayNote("");
  };

  return (
    <section className="space-y-4">
      <div className="panel-glass p-4 sm:p-6">
        <div className="panel-glass-inner">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg text-zinc-100">Calendário</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-white/10 p-2 text-zinc-400 hover:bg-zinc-800"
                onClick={() => setCursor((m) => addMonths(m, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[10rem] text-center font-medium capitalize text-zinc-200">
                {format(cursor, "MMMM yyyy", { locale: ptBR })}
              </span>
              <button
                type="button"
                className="rounded-md border border-white/10 p-2 text-zinc-400 hover:bg-zinc-800"
                onClick={() => setCursor((m) => addMonths(m, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-zinc-500">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const ymd = format(day, "yyyy-MM-dd");
              const entries = byDate.get(ymd) ?? [];
              const hasHoliday = entries.some((e) => e.kind === "feriado" && !e.employeeId);
              const hasOther = entries.some((e) => e.employeeId || e.kind !== "feriado");
              const selected = selectedYmd === ymd;
              return (
                <button
                  key={ymd}
                  type="button"
                  onClick={() => setSelectedYmd(ymd)}
                  className={cn(
                    "relative flex min-h-[52px] flex-col rounded-md border px-1 py-1 text-left text-xs transition",
                    !isSameMonth(day, cursor) && "opacity-35",
                    selected
                      ? "border-brand bg-brand/15 ring-1 ring-brand/40"
                      : "border-white/10 bg-zinc-950/30 hover:border-brand/35",
                  )}
                >
                  <span className="font-mono text-zinc-200">{format(day, "d")}</span>
                  <div className="mt-1 flex flex-wrap gap-0.5">
                    {hasHoliday && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Feriado" />
                    )}
                    {hasOther && (
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" title="Ocorrência" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selectedYmd && (
        <div className="panel-glass p-4 sm:p-6">
          <div className="panel-glass-inner space-y-4">
            <h3 className="font-semibold text-zinc-100">
              {format(new Date(`${selectedYmd}T12:00:00`), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </h3>

            {selectedEntries.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhuma ocorrência neste dia.</p>
            ) : (
              <ul className="space-y-2">
                {selectedEntries.map((o) => {
                  const emp = o.employeeId ? employees.find((e) => e.id === o.employeeId) : null;
                  return (
                    <li
                      key={o.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-zinc-950/30 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-zinc-100">
                          {kindLabel[o.kind]}
                          {emp ? ` · ${emp.name}` : o.kind === "feriado" ? " · Loja" : ""}
                        </p>
                        {o.note && <p className="text-xs text-zinc-500">{o.note}</p>}
                      </div>
                      <Button variant="secondary" size="sm" type="button" onClick={() => removeTimeOff(o.id)}>
                        Remover
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="rounded-lg border border-amber-500/25 bg-amber-950/20 p-3">
              <p className="text-sm font-medium text-amber-100">Feriado da loja</p>
              <p className="mt-1 text-xs text-amber-200/80">
                Marca o dia para todos (sem vínculo a um funcionário). Útil para feriados e fechamentos.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input
                  value={holidayNote}
                  onChange={(e) => setHolidayNote(e.target.value)}
                  placeholder="Ex.: Natal, Corpus Christi…"
                  className="flex-1"
                />
                <Button type="button" className="bg-brand hover:bg-brand-light" onClick={addHoliday}>
                  Registrar feriado
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
