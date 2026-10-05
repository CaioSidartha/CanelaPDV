"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAppStore } from "@/store/useAppStore";
import type { Employee, TimeSchedule, Weekday } from "@/types";

const weekdays: { id: Weekday; label: string }[] = [
  { id: "seg", label: "Seg" },
  { id: "ter", label: "Ter" },
  { id: "qua", label: "Qua" },
  { id: "qui", label: "Qui" },
  { id: "sex", label: "Sex" },
  { id: "sab", label: "Sáb" },
  { id: "dom", label: "Dom" },
];

function summarizeSchedule(schedule: TimeSchedule | undefined): string {
  if (!schedule) return "—";
  const days = weekdays
    .filter((d) => (schedule.days[d.id]?.length ?? 0) > 0)
    .map((d) => d.label)
    .join(", ");
  return days || "—";
}

export function EmployeeAdminPanel() {
  const employees = useAppStore((s) => s.employees);
  const schedules = useAppStore((s) => s.schedules);
  const addEmployee = useAppStore((s) => s.addEmployee);
  const updateEmployee = useAppStore((s) => s.updateEmployee);
  const removeEmployee = useAppStore((s) => s.removeEmployee);
  const toggleEmployeeActive = useAppStore((s) => s.toggleEmployeeActive);

  const [empName, setEmpName] = useState("");
  const [empRegistry, setEmpRegistry] = useState("");
  const [empRole, setEmpRole] = useState("");
  const [empScheduleId, setEmpScheduleId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);

  const scheduleById = useMemo(
    () => new Map(schedules.map((s) => [s.id, s])),
    [schedules],
  );

  const resetForm = () => {
    setEmpName("");
    setEmpRegistry("");
    setEmpRole("");
    setEmpScheduleId("");
    setEditingId(null);
    setFormErr(null);
  };

  const startEdit = (e: Employee) => {
    setEditingId(e.id);
    setEmpName(e.name);
    setEmpRegistry(e.registry ?? e.clockCode);
    setEmpRole(e.role ?? "");
    setEmpScheduleId(e.scheduleId ?? "");
    setFormErr(null);
  };

  const saveForm = () => {
    setFormErr(null);
    const name = empName.trim();
    const reg = empRegistry.trim();
    if (!name || !reg) {
      setFormErr("Informe nome e matrícula.");
      return;
    }
    if (editingId) {
      updateEmployee(editingId, {
        name,
        registry: reg,
        clockCode: reg,
        role: empRole.trim() || undefined,
        scheduleId: empScheduleId || undefined,
      });
      resetForm();
      return;
    }
    addEmployee({
      name,
      registry: reg,
      role: empRole.trim() || undefined,
      scheduleId: empScheduleId || undefined,
      clockCode: reg,
      active: true,
      cpf: undefined,
      tenantId: undefined,
      empresaId: undefined,
    });
    resetForm();
  };

  const deleteEmployee = (e: Employee) => {
    if (!window.confirm(`Excluir o funcionário "${e.name}"?`)) return;
    const r = removeEmployee(e.id);
    if (!r.ok) setFormErr(r.error);
    else if (editingId === e.id) resetForm();
  };

  return (
    <section className="space-y-6">
      <div className="panel-glass p-6">
        <div className="panel-glass-inner">
          <h2 className="text-lg font-semibold text-zinc-100">
            {editingId ? "Editar funcionário" : "Cadastrar funcionário"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Quem estiver ativo poderá ser escolhido na abertura do turno de caixa.
          </p>
          {formErr && (
            <p className="mt-3 rounded-lg border border-red-500/30 bg-red-950/35 px-3 py-2 text-sm text-red-200">
              {formErr}
            </p>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs text-zinc-500">Nome</label>
              <Input value={empName} onChange={(e) => setEmpName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Matrícula</label>
              <Input value={empRegistry} onChange={(e) => setEmpRegistry(e.target.value)} placeholder="001" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Cargo</label>
              <Input value={empRole} onChange={(e) => setEmpRole(e.target.value)} placeholder="Atendente" />
            </div>
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs text-zinc-500">Carga horária (ponto)</label>
              <select
                className="w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-brand focus:ring-2 focus:ring-orange-500/25"
                value={empScheduleId}
                onChange={(e) => setEmpScheduleId(e.target.value)}
              >
                <option value="">—</option>
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-2 flex flex-wrap items-end justify-end gap-2">
              {editingId && (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
              <Button type="button" onClick={saveForm}>
                {editingId ? "Atualizar" : "Adicionar"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="panel-glass p-6">
        <div className="panel-glass-inner">
          <h2 className="text-lg font-semibold text-zinc-100">Funcionários</h2>
          {employees.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">Nenhum funcionário cadastrado.</p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {employees
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
                .map((e) => {
                  const sch = e.scheduleId ? scheduleById.get(e.scheduleId) : undefined;
                  return (
                    <li
                      key={e.id}
                      className={`rounded-2xl border bg-zinc-950/30 p-4 shadow-sm ${
                        editingId === e.id
                          ? "border-brand/50 ring-1 ring-brand/30"
                          : "border-white/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(e)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="flex items-center gap-1.5 truncate font-semibold text-zinc-100">
                            <Pencil className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                            {e.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            Matrícula <span className="font-mono">{e.registry ?? "—"}</span> · Código{" "}
                            <span className="font-mono">{e.clockCode}</span>
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">{e.role ?? "—"}</p>
                        </button>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => deleteEmployee(e)}
                            className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-300"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleEmployeeActive(e.id)}
                            className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                              e.active
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {e.active ? "Ativo" : "Inativo"}
                          </button>
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Carga</p>
                        <p className="text-sm text-zinc-300">{sch?.name ?? "—"}</p>
                        <p className="mt-1 text-xs text-zinc-500">{summarizeSchedule(sch)}</p>
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
