"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { formatCpfCnpj, moneyBrl } from "@/lib/format-document";
import { defaultCapabilities } from "@/lib/tenant-snapshot";
import { usePlatformStore } from "@/store/usePlatformStore";
import type { TenantModuleName } from "@/types";
import type { BillingEntryKind, TenantDeployMode } from "@/types/platform";

const MODULE_LABELS: Record<TenantModuleName, string> = {
  pdv: "PDV",
  comandas: "Comandas",
  caixa: "Caixa",
  estoque: "Estoque",
  fiscal: "Fiscal",
  ponto: "Ponto",
  telas: "Telas",
  admin: "Admin",
  multi_filial: "Multi-filial",
  bi: "BI",
};

export default function PlatformTenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const tenant = usePlatformStore((s) => s.tenants.find((t) => t.id === id));
  const billingAll = usePlatformStore((s) => s.billing);
  const billing = useMemo(() => billingAll.filter((b) => b.tenantId === id), [billingAll, id]);
  const updateTenant = usePlatformStore((s) => s.updateTenant);
  const addBillingEntry = usePlatformStore((s) => s.addBillingEntry);
  const setBillingStatus = usePlatformStore((s) => s.setBillingStatus);

  if (!tenant) {
    return (
      <p className="text-stone-400">
        Conta não encontrada.{" "}
        <Link href="/platform/tenants" className="text-amber-600">Voltar</Link>
      </p>
    );
  }

  const setDeploy = (deployMode: TenantDeployMode) => {
    const cap = defaultCapabilities({
      ...tenant.capabilities,
      deployMode,
      onlineEnabled: deployMode !== "offline",
      offlineEnabled: deployMode !== "online",
      desktopDownloadEnabled: deployMode !== "online",
    });
    updateTenant(id, { capabilities: cap });
  };

  const toggleModule = (mod: TenantModuleName) => {
    updateTenant(id, {
      capabilities: {
        ...tenant.capabilities,
        modules: { ...tenant.capabilities.modules, [mod]: !tenant.capabilities.modules[mod] },
      },
    });
  };

  const addBill = (kind: BillingEntryKind) => {
    const due = new Date();
    due.setDate(due.getDate() + 7);
    addBillingEntry({
      tenantId: id,
      kind,
      label: kind === "receivable" ? "Cobrança manual" : "Despesa simulada",
      amount: kind === "receivable" ? tenant.monthlyFee : 50,
      dueDate: due.toISOString().slice(0, 10),
      status: "open",
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link href="/platform/tenants" className="text-xs text-stone-500 hover:text-stone-300">← Contas</Link>
        <h1 className="mt-2 font-display text-2xl font-semibold text-stone-50">{tenant.name}</h1>
        <p className="text-sm text-stone-400">
          {tenant.kind === "test" ? "Empresa teste" : "Cliente"} · {formatCpfCnpj(tenant.document)} ·{" "}
          {moneyBrl(tenant.monthlyFee)}/mês
        </p>
        <p className="mt-2 text-sm text-stone-500">
          Login loja: <span className="text-stone-300">{tenant.adminEmail}</span>
          {tenant.kind === "test" && " (senha padrão teste123 se não alterou na criação)"}
        </p>
      </div>

      <section className="rounded-xl border border-stone-800 bg-[#141210] p-5">
        <h2 className="text-sm font-semibold text-stone-200">Limites e módulos</h2>
        <p className="mt-1 text-xs text-stone-500">Simule versão sem internet, sem fiscal, etc.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(["hybrid", "online", "offline"] as TenantDeployMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setDeploy(mode)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                tenant.capabilities.deployMode === mode
                  ? "bg-amber-600/20 text-amber-100 ring-1 ring-amber-600/50"
                  : "bg-stone-800 text-stone-400 hover:text-stone-200"
              }`}
            >
              {mode === "hybrid" ? "Híbrido" : mode === "online" ? "Só online" : "Só offline"}
            </button>
          ))}
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-stone-300">
          <input
            type="checkbox"
            checked={tenant.capabilities.fiscalEnabled}
            onChange={(e) =>
              updateTenant(id, {
                capabilities: { ...tenant.capabilities, fiscalEnabled: e.target.checked },
              })
            }
          />
          Fiscal habilitado no contrato
        </label>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.keys(MODULE_LABELS) as TenantModuleName[]).map((mod) => (
            <label key={mod} className="flex items-center gap-2 text-xs text-stone-400">
              <input
                type="checkbox"
                checked={tenant.capabilities.modules[mod]}
                onChange={() => toggleModule(mod)}
              />
              {MODULE_LABELS[mod]}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-stone-800 bg-[#141210] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-stone-200">Financeiro simulado</h2>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => addBill("receivable")}>
              + A receber
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => addBill("payable")}>
              + A pagar
            </Button>
          </div>
        </div>
        <ul className="mt-4 divide-y divide-stone-800">
          {billing.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <p className="text-stone-200">
                  {b.kind === "receivable" ? "A receber" : "A pagar"} — {b.label}
                </p>
                <p className="text-xs text-stone-500">Venc. {b.dueDate}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-stone-100">{moneyBrl(b.amount)}</span>
                {b.status === "open" ? (
                  <Button type="button" size="sm" onClick={() => setBillingStatus(b.id, "paid")}>
                    Marcar pago
                  </Button>
                ) : (
                  <span className="text-xs text-emerald-600/90">Pago</span>
                )}
              </div>
            </li>
          ))}
          {!billing.length && <li className="py-4 text-sm text-stone-500">Nenhum lançamento.</li>}
        </ul>
      </section>
    </div>
  );
}
