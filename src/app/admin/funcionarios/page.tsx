"use client";

import { EmployeeAdminPanel } from "@/components/employees/EmployeeAdminPanel";

export default function AdminFuncionariosPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl text-zinc-50">Funcionários</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Ficha do colaborador (foto, matrícula e cargo). Cargos e horários são cadastrados em Ponto → Cargo e Horários.
        </p>
      </header>
      <EmployeeAdminPanel />
    </div>
  );
}
