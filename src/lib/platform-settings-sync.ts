import type { PlatformSettings } from "@/types/platform";

export async function syncLeadSettingsToServer(settings: PlatformSettings): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/platform/lead-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(settings),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? "Não foi possível salvar no servidor." };
    return { ok: true };
  } catch {
    return { ok: false, error: "Servidor indisponível." };
  }
}

export async function fetchLeadSettingsFromServer(): Promise<PlatformSettings | null> {
  try {
    const res = await fetch("/api/platform/lead-settings", { credentials: "include" });
    if (!res.ok) return null;
    return (await res.json()) as PlatformSettings;
  } catch {
    return null;
  }
}
