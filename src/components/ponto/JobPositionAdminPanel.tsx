"use client";

import { useMemo, useState } from "react";
import { Briefcase, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAppStore } from "@/store/useAppStore";
import type { JobPosition } from "@/types";

export function JobPositionAdminPanel() {
  const jobPositions = useAppStore((s) => s.jobPositions);
  const schedules = useAppStore((s) => s.schedules);
  const employees = useAppStore((s) => s.employees);
  const addJobPosition = useAppStore((s) => s.addJobPosition);
  const updateJobPosition = useAppStore((s) => s.updateJobPosition);
  const removeJobPosition = useAppStore((s) => s.removeJobPosition);
  const toggleJobPositionActive = useAppStore((s) => s.toggleJobPositionActive);

  const [name, setName] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);

  const scheduleById = useMemo(
    () => new Map(schedules.map((s) => [s.id, s])),
    [schedules],
  );

  const resetForm = () => {
    setName("");
    setScheduleId("");
    setEditingId(null);
    setFormErr(null);
  };

  const startEdit = (p: JobPosition) => {
    setEditingId(p.id);
    setName(p.name);
    setScheduleId(p.scheduleId);
    setFormErr(null);
  };

  const saveForm = () => {
    setFormErr(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setFormErr("Informe o nome do cargo.");
      return;
    }
    if (!scheduleId) {
      setFormErr("Selecione a carga horária vinculada ao cargo.");
      return;
    }
    if (editingId) {
      updateJobPosition(editingId, { name: trimmed, scheduleId });
      resetForm();
      return;
    }
    addJobPosition({
      name: trimmed,
      scheduleId,
      active: true,
      tenantId: undefined,
      empresaId: undefined,
    });
    resetForm();
  };

  const deletePosition = (p: JobPosition) => {
    if (!window.confirm(`Excluir o cargo "${p.name}"?`)) return;
    const r = removeJobPosition(p.id);
    if (!r.ok) setFormErr(r.error);
    else if (editingId === p.id) resetForm();
  };

  const countEmployees = (positionId: string) =>
    employees.filter((e) => e.jobPositionId === positionId).length;

  return (
    <section className="space-y-6">
      <div className="panel-glass p-6">
        <div className="panel-glass-inner">
          <h2 className="text-lg font-semibold text-zinc-100">
            {editingId ? "Editar cargo" : "Cadastrar cargo"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Crie cargos e vincule cada um a uma carga horária. Na ficha do funcionário, o horário vem do cargo
            escolhido.
          </p>
          {formErr && (
            <p className="mt-3 rounded-lg border border-red-500/30 bg-red-950/35 px-3 py-2 text-sm text-red-200">
              {formErr}
            </p>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Nome do cargo</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Atendente" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Carga horária (aba Horários)</label>
              <select
                className="w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-brand focus:ring-2 focus:ring-orange-500/25"
                value={scheduleId}
                onChange={(e) => setScheduleId(e.target.value)}
              >
                <option value="">—</option>
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 flex flex-wrap justify-end gap-2">
              {editingId && (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
              <Button type="button" onClick={saveForm}>
                {editingId ? "Atualizar" : "Adicionar cargo"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="panel-glass p-6">
        <div className="panel-glass-inner">
          <h2 className="text-lg font-semibold text-zinc-100">Cargos</h2>
          {jobPositions.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              Nenhum cargo cadastrado. Cadastre horários na aba Horários antes de vincular.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {jobPositions
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
                .map((p) => {
                  const sch = scheduleById.get(p.scheduleId);
                  const linked = countEmployees(p.id);
                  return (
                    <li
                      key={p.id}
                      className={`rounded-2xl border bg-zinc-950/30 p-4 shadow-sm ${
                        editingId === p.id
                          ? "border-brand/50 ring-1 ring-brand/30"
                          : "border-white/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="flex items-center gap-1.5 font-semibold text-zinc-100">
                            <Briefcase className="h-4 w-4 shrink-0 text-brand/80" />
                            {p.name}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Horário: <span className="text-zinc-300">{sch?.name ?? "—"}</span>
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {linked} funcionário(s) com este cargo
                          </p>
                        </button>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => deletePosition(p)}
                            className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-300"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleJobPositionActive(p.id)}
                            className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                              p.active
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {p.active ? "Ativo" : "Inativo"}
                          </button>
                        </div>
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
