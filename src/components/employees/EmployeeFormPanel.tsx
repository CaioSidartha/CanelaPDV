"use client";

import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { employeeSchedule } from "@/lib/employee-schedule";
import { useAppStore } from "@/store/useAppStore";
import type { Employee } from "@/types";

export type EmployeeFormValues = {
  name: string;
  registry: string;
  cpf: string;
  jobPositionId: string;
  photoUrl: string;
  active: boolean;
};

type Props = {
  initial?: Partial<EmployeeFormValues>;
  onSubmit: (values: EmployeeFormValues) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export function employeeFormFromRecord(e: Partial<Employee>): EmployeeFormValues {
  return {
    name: e.name ?? "",
    registry: e.registry ?? e.clockCode ?? "",
    cpf: e.cpf ?? "",
    jobPositionId: e.jobPositionId ?? "",
    photoUrl: e.photoUrl ?? "",
    active: e.active ?? true,
  };
}

export function EmployeeFormPanel({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Salvar funcionário",
}: Props) {
  const jobPositions = useAppStore((s) => s.jobPositions);
  const schedules = useAppStore((s) => s.schedules);

  const [name, setName] = useState("");
  const [registry, setRegistry] = useState("");
  const [cpf, setCpf] = useState("");
  const [jobPositionId, setJobPositionId] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [active, setActive] = useState(true);
  const [tab, setTab] = useState<"identificacao" | "ponto">("identificacao");

  useEffect(() => {
    const v = employeeFormFromRecord(initial ?? {});
    setName(v.name);
    setRegistry(v.registry);
    setCpf(v.cpf);
    setJobPositionId(v.jobPositionId);
    setPhotoUrl(v.photoUrl);
    setActive(v.active);
    setTab("identificacao");
  }, [initial]);

  const previewSchedule = jobPositionId
    ? employeeSchedule(
        { jobPositionId, scheduleId: undefined },
        jobPositions,
        schedules,
      )
    : undefined;

  const tabBtn = (id: "identificacao" | "ponto", label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        tab === id ? "bg-brand text-white" : "text-zinc-400 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );

  const label = "mb-1 block text-xs font-medium text-zinc-500";

  const submit = () => {
    onSubmit({
      name,
      registry,
      cpf,
      jobPositionId,
      photoUrl,
      active,
    });
  };

  return (
    <div className="panel-glass p-4 lg:p-6">
      <div className="mb-3 flex gap-2 border-b border-white/10 pb-3">
        {tabBtn("identificacao", "Identificação")}
        {tabBtn("ponto", "Ponto e cargo")}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <aside className="flex flex-col items-center gap-2 lg:w-36">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-center text-[10px] text-zinc-600">Foto</span>
            )}
          </div>
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-xs text-zinc-400 hover:bg-white/5">
            <ImagePlus className="h-3.5 w-3.5" />
            Enviar foto
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = () => setPhotoUrl(String(reader.result ?? ""));
                reader.readAsDataURL(f);
              }}
            />
          </label>
        </aside>

        <div className="min-w-0 flex-1 space-y-3">
          {tab === "identificacao" && (
            <>
              <div>
                <label className={label}>Nome completo</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={label}>Matrícula</label>
                  <Input
                    value={registry}
                    onChange={(e) => setRegistry(e.target.value)}
                    placeholder="001"
                    className="font-mono"
                  />
                </div>
                <div>
                  <label className={label}>CPF (opcional)</label>
                  <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-white/20"
                />
                Colaborador ativo (aparece no caixa e no ponto)
              </label>
            </>
          )}

          {tab === "ponto" && (
            <>
              <div>
                <label className={label}>Cargo</label>
                <select
                  className="w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-brand focus:ring-2 focus:ring-orange-500/25"
                  value={jobPositionId}
                  onChange={(e) => setJobPositionId(e.target.value)}
                >
                  <option value="">— Selecione um cargo —</option>
                  {jobPositions
                    .filter((p) => p.active)
                    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-zinc-500">
                  Cadastre cargos na aba Cargo do módulo Ponto, com horário já vinculado.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Carga horária do cargo</p>
                <p className="mt-1 text-zinc-200">{previewSchedule?.name ?? "—"}</p>
              </div>
              <p className="text-xs text-zinc-500">
                Código de batida: usa a matrícula{" "}
                <span className="font-mono text-zinc-300">{registry.trim() || "—"}</span>
              </p>
            </>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
            {onCancel && (
              <Button type="button" variant="secondary" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button type="button" onClick={submit}>
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
