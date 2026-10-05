import type { IFiscalService } from "../IFiscalService";
import type { DadosNFCe, ResultadoNFCe, StatusNota } from "../types";

const PENDENTE = "FocusNFeAdapter: não implementado. Ativar só na migração, com FISCAL_PROVIDER=focusnfe.";

/** Reserva da migração. Existe desde já para a troca de provedor continuar sendo uma linha de ambiente. */
export class FocusNFeAdapter implements IFiscalService {
  async emitirNFCe(
    _dados: DadosNFCe,
    _certificado: Buffer,
    _senhaCert: string,
  ): Promise<ResultadoNFCe> {
    return {
      sucesso: false,
      status: "rejeitada",
      motivo: PENDENTE,
      codigo_erro: "FOCUS_NAO_IMPLEMENTADO",
    };
  }

  async cancelarNota(): Promise<boolean> {
    throw new Error(PENDENTE);
  }

  async consultarStatus(_chave: string): Promise<StatusNota> {
    throw new Error(PENDENTE);
  }

  async inutilizarNumeracao(): Promise<boolean> {
    throw new Error(PENDENTE);
  }

  async consultarStatusSefaz(): Promise<"online" | "offline" | "lento"> {
    throw new Error(PENDENTE);
  }

  async gerarDANFE(): Promise<string> {
    throw new Error(PENDENTE);
  }
}
