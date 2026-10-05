import { defaultCompany, defaultWeightPrices } from "@/data/seed";
import { demoSales } from "@/data/demo-stock";
import { defaultHardwareSettings } from "@/lib/hardware/defaults";
import { newEntityId } from "@/lib/id";
import { hashPassword } from "@/lib/password";
import { defaultModules } from "@/lib/tenant-access";
import type { AppUser } from "@/types";
import type { PlatformTenant } from "@/types/platform";
import { modulesFromCapabilities } from "@/lib/tenant-snapshot";

const CATALOG_LAYOUT_VERSION = 2;

export async function buildFreshTenantWorkspace(
  tenant: PlatformTenant,
  plainPassword: string,
  adminUserId?: string,
) {
  const empresaId = newEntityId("empresa");
  const passwordHash = await hashPassword(plainPassword);
  const admin: AppUser = {
    id: adminUserId ?? newEntityId("user"),
    tenantId: tenant.id,
    empresaId,
    name: "Administrador",
    email: tenant.adminEmail,
    passwordHash,
    role: "admin",
    active: true,
    createdAt: new Date().toISOString(),
  };
  const modules = modulesFromCapabilities(tenant.capabilities);
  return {
    auth: {
      tenantId: tenant.id,
      empresaId,
      role: "admin" as const,
      modules,
    },
    session: null,
    users: [admin],
    company: {
      ...defaultCompany,
      tenantId: tenant.id,
      empresaId,
      name: tenant.name,
      cnpj: tenant.document,
    },
    categories: [],
    products: [],
    weightPrices: defaultWeightPrices,
    comandas: [],
    comandaAudit: [],
    sales: demoSales.map((s) => ({ ...s, tenantId: tenant.id, empresaId })),
    stockLedger: [],
    suppliers: [],
    goodsReceipts: [],
    cashSessions: [],
    cashMovements: [],
    displayTvs: [],
    employees: [],
    schedules: [],
    timeOff: [],
    punches: [],
    sidebarCollapsed: false,
    hardware: { ...defaultHardwareSettings },
    catalogLayoutVersion: CATALOG_LAYOUT_VERSION,
  };
}

/** Workspace mínimo para tenant demo legado (tenant-demo). */
export function legacyDemoWorkspacePatch() {
  return {
    auth: {
      tenantId: "tenant-demo",
      empresaId: "empresa-demo",
      role: "operador" as const,
      modules: defaultModules(),
    },
  };
}
