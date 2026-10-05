"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { newEntityId } from "@/lib/id";
import { hashPassword, verifyPassword } from "@/lib/password";
import { defaultCapabilities } from "@/lib/tenant-snapshot";
import { buildFreshTenantWorkspace } from "@/lib/tenant-workspace";
import { deleteTenantWorkspace, writeTenantWorkspace } from "@/lib/tenant-snapshot";
import type {
  BillingEntry,
  BillingEntryStatus,
  PlatformLead,
  PlatformSession,
  PlatformTenant,
  PlatformTenantKind,
  CommercialPlanId,
  SiteAnalyticsDay,
  TenantCapabilities,
  PlatformSettings,
} from "@/types/platform";
import { fetchLeadSettingsFromServer, syncLeadSettingsToServer } from "@/lib/platform-settings-sync";
import { PLAN_PRESETS } from "@/types/platform";

type PlatformAdmin = {
  email: string;
  name: string;
  passwordHash: string;
};

type PlatformStore = {
  hasHydrated: boolean;
  session: PlatformSession | null;
  admins: PlatformAdmin[];
  tenants: PlatformTenant[];
  billing: BillingEntry[];
  leads: PlatformLead[];
  analytics: SiteAnalyticsDay[];
  settings: PlatformSettings;

  setHasHydrated: (v: boolean) => void;
  setLeadNotifyEmail: (email: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  hydrateSettingsFromServer: () => Promise<void>;
  hydrateLeadsFromServer: () => Promise<void>;
  hydrateTenantsFromServer: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;

  getTenant: (id: string) => PlatformTenant | undefined;
  createTenant: (input: {
    kind: PlatformTenantKind;
    name: string;
    document: string;
    planId: CommercialPlanId;
    monthlyFee?: number;
    setupFee?: number;
    capabilities?: Partial<TenantCapabilities>;
    contactEmail?: string;
    adminEmail: string;
    adminPassword: string;
  }) => Promise<{ ok: true; tenant: PlatformTenant; adminPassword: string } | { ok: false; error: string }>;

  updateTenant: (id: string, patch: Partial<Omit<PlatformTenant, "id" | "createdAt" | "adminEmail">>) => void;
  removeTenant: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>;

  addBillingEntry: (entry: Omit<BillingEntry, "id" | "createdAt">) => void;
  setBillingStatus: (id: string, status: BillingEntryStatus, paidAt?: string) => void;

  addLead: (lead: Omit<PlatformLead, "id" | "createdAt" | "status" | "source"> & { source?: PlatformLead["source"] }) => void;
  updateLeadStatus: (id: string, status: PlatformLead["status"]) => void;
  recordSiteVisit: () => void;
};

const MASTER_EMAIL = "master@canela.local";

function slugFromName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24) || "loja";
}

function seedBillingForTenant(tenant: PlatformTenant): BillingEntry[] {
  const now = new Date();
  const due = new Date(now);
  due.setDate(due.getDate() + 10);
  const entries: BillingEntry[] = [];
  if (tenant.setupFee > 0) {
    entries.push({
      id: newEntityId("bill"),
      tenantId: tenant.id,
      kind: "receivable",
      label: "Implantação",
      amount: tenant.setupFee,
      dueDate: now.toISOString().slice(0, 10),
      status: "open",
      createdAt: now.toISOString(),
    });
  }
  entries.push({
    id: newEntityId("bill"),
    tenantId: tenant.id,
    kind: "receivable",
    label: `Mensalidade ${PLAN_PRESETS[tenant.planId === "custom" ? "essencial" : tenant.planId]?.label ?? "Plano"}`,
    amount: tenant.monthlyFee,
    dueDate: due.toISOString().slice(0, 10),
    status: tenant.kind === "test" ? "open" : "open",
    createdAt: now.toISOString(),
  });
  if (tenant.kind === "test") {
    entries.push({
      id: newEntityId("bill"),
      tenantId: tenant.id,
      kind: "payable",
      label: "Simulação — custo infra (teste)",
      amount: 49.9,
      dueDate: due.toISOString().slice(0, 10),
      status: "open",
      createdAt: now.toISOString(),
    });
  }
  return entries;
}

const initialAdmins: PlatformAdmin[] = [
  {
    email: MASTER_EMAIL,
    name: "Master Canela",
    passwordHash: "", // filled on first init
  },
];

export const usePlatformStore = create<PlatformStore>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      session: null,
      admins: initialAdmins,
      tenants: [],
      billing: [],
      leads: [],
      analytics: [],
      settings: { leadNotifyEmail: "" },

      setHasHydrated: (v) => set({ hasHydrated: v }),

      setLeadNotifyEmail: async (email) => {
        const leadNotifyEmail = email.trim();
        const settings: PlatformSettings = { leadNotifyEmail };
        const synced = await syncLeadSettingsToServer(settings);
        if (!synced.ok) return synced;
        set({ settings });
        return { ok: true };
      },

      hydrateSettingsFromServer: async () => {
        const remote = await fetchLeadSettingsFromServer();
        if (remote) set({ settings: remote });
      },

      hydrateLeadsFromServer: async () => {
        try {
          const res = await fetch("/api/platform/leads", { credentials: "include" });
          if (!res.ok) return;
          const data = (await res.json()) as {
            leads?: Array<{
              id: string;
              name: string;
              email: string;
              phone?: string | null;
              companyName?: string | null;
              message?: string | null;
              planInterest?: string | null;
              status: PlatformLead["status"];
              source: string;
              createdAt: string;
            }>;
          };
          if (!data.leads?.length) return;
          set((state) => {
            const byId = new Map(state.leads.map((l) => [l.id, l]));
            for (const row of data.leads!) {
              byId.set(row.id, {
                id: row.id,
                name: row.name,
                email: row.email,
                phone: row.phone ?? undefined,
                companyName: row.companyName ?? undefined,
                message: row.message ?? undefined,
                planInterest: (row.planInterest as PlatformLead["planInterest"]) ?? undefined,
                status: row.status,
                source: row.source === "manual" ? "manual" : "site",
                createdAt: row.createdAt,
              });
            }
            return {
              leads: [...byId.values()].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
              ),
            };
          });
        } catch {
          /* offline */
        }
      },

      hydrateTenantsFromServer: async () => {
        try {
          const res = await fetch("/api/platform/tenants", { credentials: "include" });
          if (!res.ok) return;
          const data = (await res.json()) as { tenants?: PlatformTenant[] };
          if (!data.tenants?.length) return;
          set((state) => {
            const byId = new Map(state.tenants.map((t) => [t.id, t]));
            for (const row of data.tenants!) {
              const prev = byId.get(row.id);
              byId.set(row.id, {
                ...prev,
                ...row,
                capabilities: prev?.capabilities ?? row.capabilities,
                branding: prev?.branding ?? row.branding ?? {},
                setupFee: prev?.setupFee ?? row.setupFee ?? 0,
                notes: prev?.notes ?? row.notes,
              });
            }
            return { tenants: [...byId.values()] };
          });
        } catch {
          /* offline */
        }
      },

      login: async (email, password) => {
        const trimmed = email.trim();
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email: trimmed, password, scope: "platform" }),
          });
          const data = (await res.json()) as {
            error?: string;
            fallbackLocal?: boolean;
            profile?: { email: string; name: string };
          };
          if (res.ok && data.profile) {
            set({
              session: {
                email: data.profile.email,
                name: data.profile.name,
                loggedInAt: new Date().toISOString(),
              },
            });
            await get().hydrateSettingsFromServer();
            await get().hydrateLeadsFromServer();
            await get().hydrateTenantsFromServer();
            return { ok: true };
          }
          if (res.status !== 503 || !data.fallbackLocal) {
            if (!data.fallbackLocal) {
              return { ok: false, error: data.error ?? "E-mail ou senha inválidos." };
            }
          }
        } catch {
          /* API offline — login local */
        }

        const admins = get().admins;
        const admin = admins.find((a) => a.email.toLowerCase() === trimmed.toLowerCase());
        if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
          return { ok: false, error: "E-mail ou senha inválidos." };
        }
        set({
          session: {
            email: admin.email,
            name: admin.name,
            loggedInAt: new Date().toISOString(),
          },
        });
        return { ok: true };
      },

      logout: () => {
        void fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        set({ session: null });
      },

      getTenant: (id) => get().tenants.find((t) => t.id === id),

      createTenant: async (input) => {
        const name = input.name.trim();
        if (!name) return { ok: false, error: "Informe o nome da empresa." };
        const doc = input.document.replace(/\D/g, "");
        if (doc.length !== 11 && doc.length !== 14) {
          return { ok: false, error: "CPF (11 dígitos) ou CNPJ (14 dígitos)." };
        }
        const slug = slugFromName(name);
        const plan = input.planId === "custom"
          ? { monthlyFee: input.monthlyFee ?? 500, setupFee: input.setupFee ?? 0 }
          : PLAN_PRESETS[input.planId];
        const adminEmail = input.adminEmail.trim().toLowerCase();
        const adminPassword = input.adminPassword.trim();
        if (!adminEmail || !adminEmail.includes("@")) {
          return { ok: false, error: "Informe um e-mail de acesso válido." };
        }
        if (adminPassword.length < 6) {
          return { ok: false, error: "Senha mínima: 6 caracteres." };
        }
        const exists = get().tenants.some((t) => t.adminEmail.toLowerCase() === adminEmail);
        if (exists) return { ok: false, error: "Já existe conta com este e-mail de admin." };

        let id = input.kind === "test" ? `tenant-test-${slug}-${Date.now().toString(36)}` : newEntityId("tenant");
        let serverSynced = false;
        try {
          const res = await fetch("/api/platform/tenants", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind: input.kind,
              name,
              document: doc,
              planId: input.planId,
              monthlyFee: input.monthlyFee,
              adminEmail,
              adminPassword,
            }),
          });
          const payload = (await res.json()) as { error?: string; tenant?: { id: string; adminEmail: string } };
          if (res.ok && payload.tenant) {
            id = payload.tenant.id;
            serverSynced = true;
          } else if (res.status === 401) {
            return {
              ok: false,
              error:
                "Sessão do servidor expirou ou você entrou só no modo local. Clique em Sair no painel e faça login de novo em /platform/login (master@canela.local).",
            };
          } else if (res.status !== 503) {
            return { ok: false, error: payload.error ?? "Não foi possível criar a conta no servidor." };
          }
        } catch {
          /* cria só local se a API estiver fora */
        }

        const tenant: PlatformTenant = {
          id,
          kind: input.kind,
          status: input.kind === "test" ? "trial" : "active",
          name,
          document: doc,
          contactEmail: input.contactEmail,
          planId: input.planId,
          monthlyFee: plan.monthlyFee,
          setupFee: plan.setupFee,
          capabilities: defaultCapabilities(input.capabilities),
          branding: {},
          adminEmail,
          createdAt: new Date().toISOString(),
          notes: input.kind === "test"
            ? serverSynced
              ? "Conta de teste — login validado no servidor."
              : "Conta de teste — só neste navegador (servidor indisponível)."
            : undefined,
        };

        const workspace = await buildFreshTenantWorkspace(tenant, adminPassword);
        writeTenantWorkspace(tenant.id, workspace);

        const billing = seedBillingForTenant(tenant);
        set((state) => ({
          tenants: [...state.tenants, tenant],
          billing: [...state.billing, ...billing],
        }));
        return { ok: true, tenant, adminPassword };
      },

      updateTenant: (id, patch) =>
        set((state) => ({
          tenants: state.tenants.map((t) =>
            t.id === id
              ? {
                  ...t,
                  ...patch,
                  capabilities: patch.capabilities
                    ? { ...t.capabilities, ...patch.capabilities, modules: { ...t.capabilities.modules, ...patch.capabilities.modules } }
                    : t.capabilities,
                  branding: patch.branding ? { ...t.branding, ...patch.branding } : t.branding,
                }
              : t,
          ),
        })),

      removeTenant: async (id) => {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
        if (isUuid) {
          try {
            const res = await fetch(`/api/platform/tenants/${id}`, {
              method: "DELETE",
              credentials: "include",
            });
            if (!res.ok && res.status !== 503) {
              const data = (await res.json()) as { error?: string };
              return { ok: false, error: data.error ?? "Não foi possível excluir no servidor." };
            }
          } catch {
            return { ok: false, error: "Falha de rede ao excluir." };
          }
        }
        deleteTenantWorkspace(id);
        set((state) => ({
          tenants: state.tenants.filter((t) => t.id !== id),
          billing: state.billing.filter((b) => b.tenantId !== id),
        }));
        return { ok: true };
      },

      addBillingEntry: (entry) =>
        set((state) => ({
          billing: [
            ...state.billing,
            {
              ...entry,
              id: newEntityId("bill"),
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      setBillingStatus: (id, status, paidAt) =>
        set((state) => ({
          billing: state.billing.map((b) =>
            b.id === id ? { ...b, status, paidAt: status === "paid" ? paidAt ?? new Date().toISOString() : undefined } : b,
          ),
        })),

      addLead: (lead) =>
        set((state) => ({
          leads: [
            {
              ...lead,
              id: newEntityId("lead"),
              status: "new",
              source: lead.source ?? "site",
              createdAt: new Date().toISOString(),
            },
            ...state.leads,
          ],
        })),

      updateLeadStatus: (id, status) =>
        set((state) => ({
          leads: state.leads.map((l) => (l.id === id ? { ...l, status } : l)),
        })),

      recordSiteVisit: () => {
        const day = new Date().toISOString().slice(0, 10);
        set((state) => {
          const idx = state.analytics.findIndex((a) => a.date === day);
          if (idx < 0) {
            return { analytics: [...state.analytics, { date: day, visits: 1, leadSubmits: 0 }] };
          }
          const next = [...state.analytics];
          next[idx] = { ...next[idx]!, visits: next[idx]!.visits + 1 };
          return { analytics: next };
        });
      },
    }),
    {
      name: "canela-platform-store",
      onRehydrateStorage: () => async (state) => {
        const hash = await hashPassword("master123");
        const admins = (state?.admins ?? initialAdmins).map((a) =>
          a.email === MASTER_EMAIL && !a.passwordHash ? { ...a, passwordHash: hash } : a,
        );
        const settings = state?.settings ?? { leadNotifyEmail: "" };
        usePlatformStore.setState({ admins, hasHydrated: true, settings });
        void usePlatformStore.getState().hydrateSettingsFromServer();

        const tenants = state?.tenants ?? [];
        if (!tenants.some((t) => t.id === "tenant-demo")) {
          const demo: PlatformTenant = {
            id: "tenant-demo",
            kind: "test",
            status: "active",
            name: "Canela Store (demo)",
            document: "00000000000",
            planId: "completo",
            monthlyFee: 650,
            setupFee: 0,
            capabilities: defaultCapabilities(),
            branding: {},
            adminEmail: "admin@loja.local",
            createdAt: "2025-01-01T00:00:00.000Z",
            notes: "Tenant legado do desenvolvimento local.",
          };
          usePlatformStore.setState((s) => ({
            tenants: [demo, ...s.tenants.filter((t) => t.id !== "tenant-demo")],
            billing: s.billing.length
              ? s.billing
              : seedBillingForTenant(demo),
          }));
        }
      },
      partialize: (state) => ({
        session: state.session,
        admins: state.admins,
        tenants: state.tenants,
        billing: state.billing,
        leads: state.leads,
        analytics: state.analytics,
        settings: state.settings,
      }),
    },
  ),
);
