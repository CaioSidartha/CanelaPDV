import type {
  HardwareSettings,
  PaymentTerminalConfig,
  PaymentTerminalProviderId,
  ScaleHardwareConfig,
} from "@/types";

export const defaultScaleConfig: ScaleHardwareConfig = {
  enabled: true,
  provider: "simulacao",
  mockMinGrams: 80,
  mockMaxGrams: 900,
  host: "",
  port: "",
};

export const defaultPaymentTerminalConfig: PaymentTerminalConfig = {
  enabled: true,
  provider: "simulacao",
  environment: "teste",
  fields: {},
  apiKey: "",
  merchantId: "",
  terminalId: "",
  mockDelayMs: 1800,
  mockApproveRate: 0.92,
};

export const defaultHardwareSettings: HardwareSettings = {
  scale: { ...defaultScaleConfig },
  paymentTerminal: { ...defaultPaymentTerminalConfig },
};

export const SCALE_PROVIDER_LABELS: Record<ScaleHardwareConfig["provider"], string> = {
  simulacao: "Simulação (sem aparelho)",
  toledo_ws: "Toledo (WebService) — em breve",
  serial_usb: "Serial / USB — em breve",
};

export const PAYMENT_PROVIDER_LABELS: Record<
  PaymentTerminalConfig["provider"],
  string
> = {
  simulacao: "Simulação (sem aparelho)",
  stone: "Stone",
  cielo: "Cielo",
  pagbank: "PagBank",
};

export type TerminalFieldDef = {
  key: string;
  label: string;
  hint: string;
  secret?: boolean;
};

/** O que cada adquirente pede para ligar o PDV depois. O caixa ainda só registra a forma. */
export const PAYMENT_PROVIDER_SETUP: Record<
  Exclude<PaymentTerminalProviderId, "simulacao">,
  { note: string; docs: string; fields: TerminalFieldDef[] }
> = {
  stone: {
    note: "Connect Stone usa a conta Pagar.me da loja e o Stone Code da maquininha. O valor ainda não é enviado ao aparelho.",
    docs: "https://connect-stone.stone.com.br/reference/visao-geral",
    fields: [
      {
        key: "stoneCode",
        label: "Stone Code",
        hint: "Na maquininha: Ajuda → Detalhes da máquina → Stone Code.",
      },
      {
        key: "serial",
        label: "Número de série",
        hint: "Atrás do aparelho ou na tela Sobre.",
      },
      {
        key: "accountId",
        label: "Conta (Account)",
        hint: "Conta do estabelecimento no Partner Hub / Pagar.me.",
      },
      {
        key: "secretKey",
        label: "Secret Key",
        hint: "Dashboard Pagar.me → Desenvolvimento → Chaves. Não compartilhe.",
        secret: true,
      },
    ],
  },
  cielo: {
    note: "No TEF de balcão a Cielo pede o número lógico. Na API e-commerce entram MerchantId e MerchantKey.",
    docs: "https://docs.cielo.com.br/ecommerce-cielo/reference/revogar-e-criar-credenciais-no-site-cielo",
    fields: [
      {
        key: "logicalNumber",
        label: "Número lógico",
        hint: "A Cielo envia quando habilita o TEF neste terminal.",
      },
      {
        key: "merchantId",
        label: "MerchantId",
        hint: "Número do estabelecimento. Na API e-commerce é o MerchantId.",
      },
      {
        key: "merchantKey",
        label: "MerchantKey",
        hint: "Chave da loja no site Cielo, em credenciais da API.",
        secret: true,
      },
      {
        key: "terminalId",
        label: "Terminal ID",
        hint: "Cielo Conecta. No TEF clássico pode ficar vazio.",
      },
    ],
  },
  pagbank: {
    note: "PlugPag liga o PDV à Moderninha. O código de ativação sai no painel do PagBank.",
    docs: "https://developer.pagbank.com.br/docs/plugpag",
    fields: [
      {
        key: "activationCode",
        label: "Código de ativação",
        hint: "Gerado no painel PagBank para liberar o PlugPag neste computador.",
        secret: true,
      },
      {
        key: "serial",
        label: "Número de série",
        hint: "Série impressa na Moderninha ou Minizinha.",
      },
      {
        key: "email",
        label: "E-mail da conta",
        hint: "Conta PagBank dona da maquininha.",
      },
    ],
  },
};

export function isScaleProviderReady(provider: ScaleHardwareConfig["provider"]) {
  return provider === "simulacao";
}

export function isPaymentProviderReady(
  provider: PaymentTerminalConfig["provider"],
) {
  return provider === "simulacao";
}
