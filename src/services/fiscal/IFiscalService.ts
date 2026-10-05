import type { DadosNFCe, ResultadoNFCe, StatusNota } from "./types";

/**
 * Contrato único de emissão. Não adicionar método de um provedor específico.
 * Trocar Brasil NFe por Focus NFe não pode exigir mudança aqui.
 */
export interface IFiscalService {
  emitirNFCe(dados: DadosNFCe, certificado: Buffer, senhaCert: string): Promise<ResultadoNFCe>;
  cancelarNota(chave: string, motivo: string, certificado: Buffer, senhaCert: string): Promise<boolean>;
  consultarStatus(chave: string): Promise<StatusNota>;
  inutilizarNumeracao(serie: string, numInicio: number, numFim: number, motivo: string): Promise<boolean>;
  consultarStatusSefaz(): Promise<"online" | "offline" | "lento">;
  /** HTML ou PDF em base64, conforme o provedor. */
  gerarDANFE(xml: string): Promise<string>;
}

export type { DadosNFCe, ResultadoNFCe, StatusNota };
