import type { StockMovementReason } from "@/types";

export const STOCK_REASON_LABEL: Record<StockMovementReason, string> = {
  venda_balcao: "Venda (bancada / PDV)",
  venda_mesa: "Venda (mesa)",
  ajuste_manual: "Ajuste manual",
  ajuste_cadastro: "Cadastro do produto",
  entrada_remessa: "Entrada / remessa (recebimento)",
  entrada_nfe: "Entrada por NF-e (XML)",
};
