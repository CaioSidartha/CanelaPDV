"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, User } from "lucide-react";
import {
  EmployeeFormPanel,
  employeeFormFromRecord,
  type EmployeeFormValues,
} from "@/components/employees/EmployeeFormPanel";
import { employeeRoleLabel, employeeSchedule } from "@/lib/employee-schedule";
import { useAppStore } from "@/store/useAppStore";
import type { Employee } from "@/types";

export function EmployeeAdminPanel() {
  const employees = useAppStore((s) => s.employees);
  const jobPositions = useAppStore((s) => s.jobPositions);
  const schedules = useAppStore((s) => s.schedules);
  const addEmployee = useAppStore((s) => s.addEmployee);
  const updateEmployee = useAppStore((s) => s.updateEmployee);
  const removeEmployee = useAppStore((s) => s.removeEmployee);
  const toggleEmployeeActive = useAppStore((s) => s.toggleEmployeeActive);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const sorted = useMemo(
    () => employees.slice().sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [employees],
  );

  const selected = selectedId ? employees.find((e) => e.id === selectedId) : undefined;

  const resetSelection = () => {
    setSelectedId(null);
    setCreating(false);
    setFormErr(null);
  };

  const saveForm = (values: EmployeeFormValues) => {
    setFormErr(null);
    const name = values.name.trim();
    const reg = values.registry.trim();
    if (!name || !reg) {
      setFormErr("Informe nome e matrícula.");
      return;
    }
    const position = values.jobPositionId
      ? jobPositions.find((p) => p.id === values.jobPositionId)
      : undefined;
    const roleLabel = position?.name;
    const patch = {
      name,
      registry: reg,
      clockCode: reg,
      cpf: values.cpf.trim() || undefined,
      jobPositionId: values.jobPositionId || undefined,
      role: roleLabel,
      scheduleId: undefined as string | undefined,
      photoUrl: values.photoUrl || undefined,
      active: values.active,
    };

    if (selected) {
      updateEmployee(selected.id, patch);
      resetSelection();
      return;
    }
    addEmployee({
      ...patch,
      tenantId: undefined,
      empresaId: undefined,
    });
    resetSelection();
  };

  const deleteEmployee = (e: Employee) => {
    if (!window.confirm(`Excluir o funcionário "${e.name}"?`)) return;
    const r = removeEmployee(e.id);
    if (!r.ok) setFormErr(r.error);
    else if (selectedId === e.id) resetSelection();
  };

  const showForm = creating || selected;

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(260px,320px)_1fr]">
      <div className="panel-glass p-4">
        <div className="panel-glass-inner flex flex-col">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-100">Equipe</h2>
            <button
              type="button"
              onClick={() => {
                setCreating(true);
                setSelectedId(null);
                setFormErr(null);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-light"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo
            </button>
          </div>
          {formErr && !showForm && (
            <p className="mb-2 rounded-lg border border-red-500/30 bg-red-950/35 px-2 py-1.5 text-xs text-red-200">
              {formErr}
            </p>
          )}
          {sorted.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum funcionário cadastrado.</p>
          ) : (
            <ul className="max-h-[min(70vh,520px)] space-y-2 overflow-y-auto pr-1">
              {sorted.map((e) => {
                const sch = employeeSchedule(e, jobPositions, schedules);
                const active = selectedId === e.id;
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(e.id);
                        setCreating(false);
                        setFormErr(null);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                        active
                          ? "border-brand/50 bg-brand/10"
                          : "border-white/10 bg-zinc-950/30 hover:border-white/20"
                      }`}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-zinc-900">
                        {e.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={e.photoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-5 w-5 text-zinc-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-zinc-100">{e.name}</p>
                        <p className="truncate text-xs text-zinc-500">
                          {employeeRoleLabel(e, jobPositions)} · {sch?.name ?? "sem horário"}
                        </p>
                      </div>
                      {!e.active && (
                        <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                          Inativo
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="min-w-0">
        {formErr && showForm && (
          <p className="mb-3 rounded-lg border border-red-500/30 bg-red-950/35 px-3 py-2 text-sm text-red-200">
            {formErr}
          </p>
        )}
        {showForm ? (
          <div className="space-y-3">
            {selected && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => deleteEmployee(selected)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </button>
                <button
                  type="button"
                  onClick={() => toggleEmployeeActive(selected.id)}
                  className="ml-2 rounded-lg border border-white/10 px-2 py-1 text-xs text-zinc-400 hover:bg-white/5"
                >
                  {selected.active ? "Desativar" : "Ativar"}
                </button>
              </div>
            )}
            <EmployeeFormPanel
              key={selected?.id ?? "new"}
              initial={selected ? employeeFormFromRecord(selected) : undefined}
              submitLabel={selected ? "Atualizar ficha" : "Adicionar funcionário"}
              onCancel={resetSelection}
              onSubmit={saveForm}
            />
          </div>
        ) : (
          <div className="panel-glass flex min-h-[280px] items-center justify-center p-8">
            <p className="max-w-sm text-center text-sm text-zinc-500">
              Selecione um colaborador na lista ou clique em <strong className="text-zinc-300">Novo</strong> para
              abrir a ficha no mesmo padrão de produtos e fornecedores.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
