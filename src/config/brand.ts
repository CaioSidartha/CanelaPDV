/** Marca do produto (site, app, contratos). */
export const PRODUCT_NAME = "Canela";

/** Nome da loja de demonstração no PDV. */
export const DEMO_STORE_NAME = "Canela Store";

/** Paleta padrão Canela — tons de canela, âmbar e creme (referência para tema futuro por cliente). */
export const CANELA_PALETTE = {
  background: "#2A2118",
  surface: "#332A20",
  primary: "#D97706",
  amber: "#F59E0B",
  foreground: "#FAF6F1",
  muted: "#C4B5A0",
  border: "#4A3F32",
  primaryForeground: "#FFFBF5",
} as const;

const LEGACY_DEMO_NAMES = ["Padaria Máxima", "Padaria Maxima"];

export function normalizeDemoCompanyName(name: string | undefined): string {
  if (!name || LEGACY_DEMO_NAMES.includes(name)) return DEMO_STORE_NAME;
  return name;
}
