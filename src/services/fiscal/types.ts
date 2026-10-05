/** Tipos internos do módulo fiscal. O caixa não conhece o provedor. */

export type AmbienteFiscal = "homologacao" | "producao";

export type FormaPagamentoNFCe = "dinheiro" | "pix" | "debito" | "credito";

export type StatusEmissaoNFCe = "autorizada" | "rejeitada" | "contingencia" | "cancelada";

export interface ItemNFCe {
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  icms_situacao_tributaria: string;
}

export interface PagamentoNFCe {
  forma: FormaPagamentoNFCe;
  valor: number;
}

export interface DadosNFCe {
  tenant_id: string;
  /** Vazio = o provedor numera. Não usar o id interno da venda como número de NFC-e. */
  numero: string;
  serie: string;
  /** Id da venda no PDV, para rastrear a nota no provedor. */
  referencia_interna?: string;
  itens: ItemNFCe[];
  pagamentos: PagamentoNFCe[];
  total: number;
  cpf_consumidor?: string;
  nome_consumidor?: string;
}

export interface ResultadoNFCe {
  sucesso: boolean;
  chave_acesso?: string;
  numero_protocolo?: string;
  xml?: string;
  danfe_html?: string;
  danfe_pdf_base64?: string;
  status: StatusEmissaoNFCe;
  motivo?: string;
  codigo_erro?: string;
  /** true quando não houve chamada à SEFAZ (sem token ainda). */
  simulacao?: boolean;
}

export interface StatusNota {
  chave: string;
  status: "autorizada" | "rejeitada" | "cancelada" | "inutilizada";
  motivo?: string;
}
