import { isRoleAtLeast } from "@/lib/tenant-access";
import type { UserRole } from "@/types";

export type SettingsTabId = "empresa" | "peso" | "produtos" | "hardwares" | "terminais" | "app";

export const SETTINGS_TAB_LABELS: Record<SettingsTabId, string> = {
  empresa: "Empresa",
  peso: "Preços no peso",
  produtos: "Produtos",
  hardwares: "Hardwares",
  terminais: "Terminais",
  app: "App e offline",
};

export type SettingsTabsContext = {
  isDesktop: boolean;
  installRole: "server" | "terminal" | null;
  userRole: UserRole;
};

/** Abas visíveis em Configurações conforme papel do usuário e do aparelho. */
export function visibleSettingsTabs(ctx: SettingsTabsContext): SettingsTabId[] {
  const admin = isRoleAtLeast(ctx.userRole, "gerente");

  if (!ctx.isDesktop) {
    if (!admin) return ["peso", "hardwares"];
    return ["empresa", "peso", "produtos", "hardwares", "app"];
  }

  if (ctx.installRole === "terminal" || !admin) {
    return ["terminais", "hardwares", "peso"];
  }

  return ["empresa", "peso", "produtos", "hardwares", "terminais", "app"];
}

export function parseSettingsTabQuery(value: string | null): SettingsTabId | null {
  if (
    value === "empresa" ||
    value === "peso" ||
    value === "produtos" ||
    value === "hardwares" ||
    value === "terminais" ||
    value === "app"
  ) {
    return value;
  }
  return null;
}
