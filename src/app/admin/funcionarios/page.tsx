"use client";

import { EmployeeAdminPanel } from "@/components/employees/EmployeeAdminPanel";

export default function AdminFuncionariosPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl text-zinc-50">Funcionários</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Cadastro da equipe — usado na abertura do turno e no módulo Ponto.
        </p>
      </header>
      <EmployeeAdminPanel />
    </div>
  );
}
