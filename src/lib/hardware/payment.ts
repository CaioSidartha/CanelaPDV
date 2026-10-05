import type { HardwareSettings, PaymentMethod, PaymentTerminalConfig } from "@/types";
import { isPaymentProviderReady } from "./defaults";

export type CardPayType = "debito" | "credito" | "pix";

export type PaymentTerminalResult =
  | {
      ok: true;
      approved: true;
      authCode: string;
      nsu: string;
      provider: string;
      simulated: boolean;
      method: PaymentMethod;
    }
  | {
      ok: true;
      approved: false;
      reason: string;
      provider: string;
      simulated: boolean;
    }
  | { ok: false; error: string };

function mapType(type: CardPayType): PaymentMethod {
  if (type === "pix") return "pix";
  if (type === "credito") return "cartao_credito";
  return "cartao_debito";
}

function fakeCode(prefix: string) {
  return `${prefix}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function payViaElectron(
  payload: { amount: number; type: CardPayType; installments?: number },
): Promise<PaymentTerminalResult | null> {
  if (typeof window === "undefined" || !window.padariaDesktop?.startPayment) return null;
  try {
    return (await window.padariaDesktop.startPayment(payload)) as PaymentTerminalResult;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Falha na maquininha (Electron).",
    };
  }
}

export async function startTerminalPayment(
  settings: HardwareSettings,
  opts: { amount: number; type: CardPayType; installments?: number },
): Promise<PaymentTerminalResult> {
  const cfg = settings.paymentTerminal;
  if (!cfg.enabled) {
    return { ok: false, error: "Maquininha desligada em Configurações → Hardwares." };
  }
  if (opts.amount <= 0) {
    return { ok: false, error: "Valor inválido para a maquininha." };
  }
  if (!isPaymentProviderReady(cfg.provider)) {
    return {
      ok: false,
      error:
        "Esta maquininha ainda não recebe o valor daqui. Passe o cartão no aparelho e registre só a forma de pagamento.",
    };
  }

  if (cfg.provider === "simulacao") {
    const fromDesktop = await payViaElectron(opts);
    if (fromDesktop) return fromDesktop;
    return simulatePayment(cfg, opts);
  }

  const fromDesktop = await payViaElectron(opts);
  if (fromDesktop) return fromDesktop;
  return {
    ok: false,
    error: "Maquininha real só responde pelo app desktop (Electron).",
  };
}

async function simulatePayment(
  cfg: PaymentTerminalConfig,
  opts: { amount: number; type: CardPayType },
): Promise<PaymentTerminalResult> {
  const delay = Math.max(400, cfg.mockDelayMs ?? 1800);
  await new Promise((r) => setTimeout(r, delay));
  const rate = cfg.mockApproveRate ?? 0.92;
  if (Math.random() > rate) {
    return {
      ok: true,
      approved: false,
      reason: "Pagamento recusado (simulação).",
      provider: "simulacao",
      simulated: true,
    };
  }
  return {
    ok: true,
    approved: true,
    authCode: fakeCode("AUTH"),
    nsu: fakeCode("NSU"),
    provider: "simulacao",
    simulated: true,
    method: mapType(opts.type),
  };
}
