import type { TenantModuleName } from "@/types";

export type PlatformTenantKind = "production" | "test";

export type CommercialPlanId = "essencial" | "completo" | "custom";

export type PlatformTenantStatus = "active" | "suspended" | "trial" | "churned";

/** Como o cliente usa o sistema (limites de teste / contrato). */
export type TenantDeployMode = "online" | "offline" | "hybrid";

export interface TenantBranding {
  logoUrl?: string;
  iconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface TenantCapabilities {
  deployMode: TenantDeployMode;
  /** Permite sync / recursos que exigem rede. */
  onlineEnabled: boolean;
  /** Permite uso local / download desktop (futuro). */
  offlineEnabled: boolean;
  fiscalEnabled: boolean;
  desktopDownloadEnabled: boolean;
  modules: Record<TenantModuleName, boolean>;
}

export interface PlatformTenant {
  id: string;
  kind: PlatformTenantKind;
  status: PlatformTenantStatus;
  name: string;
  /** CPF ou CNPJ (somente dígitos ou formatado). */
  document: string;
  contactEmail?: string;
  contactPhone?: string;
  planId: CommercialPlanId;
  monthlyFee: number;
  setupFee: number;
  capabilities: TenantCapabilities;
  branding: TenantBranding;
  /** E-mail do admin da loja para login no app. */
  adminEmail: string;
  createdAt: string;
  notes?: string;
}

export type BillingEntryKind = "receivable" | "payable";
export type BillingEntryStatus = "open" | "paid" | "overdue" | "cancelled";

export interface BillingEntry {
  id: string;
  tenantId: string;
  kind: BillingEntryKind;
  label: string;
  amount: number;
  dueDate: string;
  status: BillingEntryStatus;
  paidAt?: string;
  createdAt: string;
}

export type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost";

export interface PlatformLead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  message?: string;
  planInterest?: CommercialPlanId;
  status: LeadStatus;
  source: "site" | "manual";
  createdAt: string;
  pageViews?: number;
}

export interface SiteAnalyticsDay {
  date: string;
  visits: number;
  leadSubmits: number;
}

export interface PlatformSession {
  email: string;
  name: string;
  loggedInAt: string;
}

/** Instalador Windows publicado pelo painel master. */
export interface DesktopReleaseInfo {
  version: string;
  windowsDownloadUrl: string;
  releaseNotes?: string;
  publishedAt?: string;
}

/** Configurações do painel master (leads, notificações). */
export interface PlatformSettings {
  /** E-mail que recebe cópia das solicitações do site (quando o visitante optar). */
  leadNotifyEmail: string;
  /** Versão do app desktop e link do instalador (.exe). */
  desktopRelease?: DesktopReleaseInfo;
}

export const PLAN_PRESETS: Record<
  Exclude<CommercialPlanId, "custom">,
  { label: string; monthlyFee: number; setupFee: number }
> = {
  essencial: { label: "Essencial", monthlyFee: 500, setupFee: 0 },
  completo: { label: "Completo", monthlyFee: 650, setupFee: 0 },
};
