import type { HardwareSettings, ScaleHardwareConfig } from "@/types";
import { isScaleProviderReady } from "./defaults";

export type ScaleReadResult =
  | { ok: true; grams: number; kg: number; stable: boolean; provider: string; simulated: boolean }
  | { ok: false; error: string };

function randomGrams(cfg: ScaleHardwareConfig) {
  const min = Math.max(1, cfg.mockMinGrams ?? 80);
  const max = Math.max(min + 1, cfg.mockMaxGrams ?? 900);
  return Math.round(min + Math.random() * (max - min));
}

async function readViaElectron(): Promise<ScaleReadResult | null> {
  if (typeof window === "undefined" || !window.padariaDesktop?.readScale) return null;
  try {
    return await window.padariaDesktop.readScale();
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Falha ao ler a balança no Electron.",
    };
  }
}

/** Lê o peso conforme a config. Simulação funciona no browser; aparelho real via Electron. */
export async function readScaleWeight(
  settings: HardwareSettings,
): Promise<ScaleReadResult> {
  const cfg = settings.scale;
  if (!cfg.enabled) {
    return { ok: false, error: "Balança desligada em Configurações → Hardwares." };
  }

  if (!isScaleProviderReady(cfg.provider)) {
    return {
      ok: false,
      error: `Provedor "${cfg.provider}" ainda não está ligado. Use Simulação ou aguarde o conector.`,
    };
  }

  if (cfg.provider === "simulacao") {
    const fromDesktop = await readViaElectron();
    if (fromDesktop?.ok) return fromDesktop;
    await new Promise((r) => setTimeout(r, 350 + Math.random() * 400));
    const grams = randomGrams(cfg);
    return {
      ok: true,
      grams,
      kg: grams / 1000,
      stable: true,
      provider: "simulacao",
      simulated: true,
    };
  }

  const fromDesktop = await readViaElectron();
  if (fromDesktop) return fromDesktop;
  return {
    ok: false,
    error: "Balança real só responde pelo app desktop (Electron).",
  };
}
