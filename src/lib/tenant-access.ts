import type { TenantModuleName, UserRole } from "@/types";

export type TenantAccessContext = {
  role: UserRole;
  modules: Record<TenantModuleName, boolean>;
};

const ROLE_ORDER: Record<UserRole, number> = {
  operador: 1,
  caixa: 2,
  gerente: 3,
  admin: 4,
  super_admin: 5,
};

export function isRoleAtLeast(role: UserRole, needed: UserRole): boolean {
  return ROLE_ORDER[role] >= ROLE_ORDER[needed];
}

export function canAccessModule(ctx: TenantAccessContext, module: TenantModuleName): boolean {
  if (ctx.role === "super_admin") return true;
  return Boolean(ctx.modules[module]);
}

export function assertModuleEnabled(
  ctx: TenantAccessContext,
  module: TenantModuleName,
): { ok: true } | { ok: false; error: string } {
  if (canAccessModule(ctx, module)) return { ok: true };
  return { ok: false, error: "Este módulo não está ativo no seu plano." };
}

/** Defaults seguros ao migrar stores antigas sem módulos novos. */
export function defaultModules(
  patch?: Partial<Record<TenantModuleName, boolean>>,
): Record<TenantModuleName, boolean> {
  return {
    pdv: true,
    comandas: true,
    caixa: true,
    estoque: true,
    fiscal: true,
    ponto: true,
    telas: true,
    admin: true,
    multi_filial: false,
    bi: false,
    ...patch,
  };
}
