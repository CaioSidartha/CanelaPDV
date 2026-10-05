import type { FiscalEmitResponse, PaymentMethod, SalePayload } from "@/types";
import type { DadosNFCe, FormaPagamentoNFCe, ResultadoNFCe } from "./types";

const FORMA: Record<PaymentMethod, FormaPagamentoNFCe> = {
  dinheiro: "dinheiro",
  pix: "pix",
  cartao_debito: "debito",
  cartao_credito: "credito",
};

export function saleToDadosNFCe(venda: SalePayload): DadosNFCe {
  const documento = venda.cliente?.documento?.replace(/\D/g, "");
  return {
    tenant_id: "local",
    numero: "",
    serie: process.env.NFCE_SERIE?.trim() || "1",
    referencia_interna: venda.id,
    total: venda.total,
    cpf_consumidor: documento && documento.length === 11 ? documento : undefined,
    nome_consumidor: venda.cliente?.nome,
    pagamentos: [{ forma: FORMA[venda.payment_method] ?? "dinheiro", valor: venda.total }],
    itens: venda.items.map((item, index) => ({
      codigo: String(index + 1),
      descricao: item.descricao,
      ncm: item.ncm || "19059090",
      cfop: item.cfop || "5102",
      unidade: "UN",
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      valor_total: item.valor_total,
      icms_situacao_tributaria: "102",
    })),
  };
}

/** Traduz o resultado interno para o contrato que o caixa já consome. */
export function resultadoToResposta(resultado: ResultadoNFCe): FiscalEmitResponse {
  if (resultado.sucesso && resultado.status === "autorizada") {
    return {
      status: "autorizado",
      chave_nota: resultado.chave_acesso,
      xml: resultado.xml,
    };
  }
  return {
    status: resultado.status === "rejeitada" ? "rejeitado" : "erro",
    chave_nota: resultado.chave_acesso,
    xml: resultado.xml,
    mensagem: resultado.motivo || "Nota não autorizada",
    codigo: resultado.codigo_erro,
  };
}
