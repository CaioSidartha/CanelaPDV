"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CreateTenantModal } from "@/components/platform/CreateTenantModal";
import { formatCpfCnpj, moneyBrl } from "@/lib/format-document";
import { usePlatformStore } from "@/store/usePlatformStore";

export default function PlatformTenantsPage() {
  const tenants = usePlatformStore((s) => s.tenants);
  const billing = usePlatformStore((s) => s.billing);
  const [modal, setModal] = useState<"test" | "production" | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-stone-50">Contas</h1>
          <p className="mt-1 text-sm text-stone-400">Clientes e empresas teste com login próprio no app.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setModal("test")}>
            <Plus className="h-4 w-4" />
            Empresa teste
          </Button>
          <Button type="button" onClick={() => setModal("production")}>
            <Plus className="h-4 w-4" />
            Nova cliente
          </Button>
        </div>
      </div>

      {flash && (
        <div className="rounded-lg border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-100 whitespace-pre-wrap">
          {flash}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-stone-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#141210] text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Mensal</th>
              <th className="px-4 py-3">Em aberto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800 bg-[#0f0d0b]">
            {tenants.map((t) => {
              const open = billing
                .filter((b) => b.tenantId === t.id && b.status === "open" && b.kind === "receivable")
                .reduce((a, b) => a + b.amount, 0);
              return (
                <tr key={t.id} className="hover:bg-stone-900/40">
                  <td className="px-4 py-3">
                    <Link href={`/platform/tenants/${t.id}`} className="font-medium text-amber-100 hover:underline">
                      {t.name}
                    </Link>
                    <p className="text-xs text-stone-600">{t.adminEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-400">{t.kind === "test" ? "Teste" : "Produção"}</td>
                  <td className="px-4 py-3 text-stone-400">{formatCpfCnpj(t.document)}</td>
                  <td className="px-4 py-3 capitalize text-stone-400">{t.planId}</td>
                  <td className="px-4 py-3 text-stone-300">{moneyBrl(t.monthlyFee)}</td>
                  <td className="px-4 py-3 text-amber-600/90">{open > 0 ? moneyBrl(open) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <CreateTenantModal
          kind={modal}
          onClose={() => setModal(null)}
          onCreated={(info) => {
            setFlash(
              `Conta criada.\nLogin: ${info.adminEmail}\nSenha: ${info.adminPassword}\n\nUse /login no app da loja.`,
            );
          }}
        />
      )}
    </div>
  );
}
