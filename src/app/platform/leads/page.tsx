"use client";

import { usePlatformStore } from "@/store/usePlatformStore";
import type { LeadStatus } from "@/types/platform";

const STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "won", "lost"];

const LABEL: Record<LeadStatus, string> = {
  new: "Novo",
  contacted: "Contatado",
  qualified: "Qualificado",
  won: "Ganho",
  lost: "Perdido",
};

export default function PlatformLeadsPage() {
  const leads = usePlatformStore((s) => s.leads);
  const updateLeadStatus = usePlatformStore((s) => s.updateLeadStatus);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-stone-50">Leads</h1>
        <p className="mt-1 text-sm text-stone-400">
          Solicitações do site em /site. E-mail: configure em{" "}
          <a href="/platform/configuracoes" className="text-amber-600 hover:underline">Configurações</a>.
        </p>
      </div>

      <ul className="divide-y divide-stone-800 rounded-xl border border-stone-800 bg-[#141210]">
        {leads.map((lead) => (
          <li key={lead.id} className="px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-stone-100">{lead.name}</p>
                <p className="text-sm text-stone-400">{lead.email}</p>
                {lead.phone && <p className="text-xs text-stone-500">{lead.phone}</p>}
                {lead.companyName && <p className="text-xs text-stone-500">Loja: {lead.companyName}</p>}
                {lead.message && <p className="mt-2 text-sm text-stone-400">{lead.message}</p>}
                <p className="mt-1 text-[10px] text-stone-600">{new Date(lead.createdAt).toLocaleString("pt-BR")}</p>
              </div>
              <select
                value={lead.status}
                onChange={(e) => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
                className="rounded-lg border border-stone-700 bg-stone-900 px-2 py-1 text-xs text-stone-200"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{LABEL[s]}</option>
                ))}
              </select>
            </div>
          </li>
        ))}
        {!leads.length && (
          <li className="px-4 py-8 text-center text-sm text-stone-500">Nenhum lead ainda. Publique o site em /site.</li>
        )}
      </ul>
    </div>
  );
}
