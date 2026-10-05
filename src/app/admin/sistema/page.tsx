"use client";

import { AdminPageHeader, AdminSectionCard } from "@/components/admin/AdminPrimitives";
import { useAppStore } from "@/store/useAppStore";

export default function AdminSistemaPage() {
  const session = useAppStore((s) => s.session);
  const auth = useAppStore((s) => s.auth);
  const company = useAppStore((s) => s.company);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <AdminPageHeader
        title="Sistema"
        subtitle="Identidade da loja, sessão e preparação do modo servidor"
      />

      <div className="space-y-4">
        <AdminSectionCard title="Tenant / loja">
          <dl className="grid gap-2 text-sm text-zinc-400">
            <div className="flex justify-between gap-3">
              <dt>Nome</dt>
              <dd className="text-zinc-200">{company.name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>CNPJ</dt>
              <dd className="font-mono text-zinc-200">{company.cnpj}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>tenant_id</dt>
              <dd className="font-mono text-xs text-zinc-300">{auth.tenantId}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>empresa_id</dt>
              <dd className="font-mono text-xs text-zinc-300">{auth.empresaId}</dd>
            </div>
          </dl>
        </AdminSectionCard>

        <AdminSectionCard title="Sessão atual">
          <dl className="grid gap-2 text-sm text-zinc-400">
            <div className="flex justify-between gap-3">
              <dt>Usuário</dt>
              <dd className="text-zinc-200">{session?.name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>E-mail</dt>
              <dd className="text-zinc-200">{session?.email}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Perfil</dt>
              <dd className="text-zinc-200">{session?.role}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>user_id (UUID)</dt>
              <dd className="max-w-[60%] truncate font-mono text-xs text-zinc-300">
                {session?.userId}
              </dd>
            </div>
          </dl>
        </AdminSectionCard>

        <AdminSectionCard title="Roadmap técnico (testes reais)">
          <ol className="list-decimal space-y-2 pl-4 text-sm text-zinc-400">
            <li>Esta fase: web + login + UUID + painel admin (você está aqui).</li>
            <li>Próxima: API local + banco na máquina “servidor”.</li>
            <li>Depois: terminais de caixa apontando pro IP local + impressora.</li>
            <li>Por fim: sync one-way para o painel remoto na nuvem.</li>
          </ol>
        </AdminSectionCard>
      </div>
    </div>
  );
}
