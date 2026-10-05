import type { IFiscalService } from "../IFiscalService";
import type { AmbienteFiscal, DadosNFCe, ResultadoNFCe, StatusNota } from "../types";

interface BrasilNFeConfig {
  token: string;
  userToken?: string;
  ambiente: AmbienteFiscal;
  serie: string;
}

const FORMA_SEFAZ: Record<DadosNFCe["pagamentos"][number]["forma"], string> = {
  dinheiro: "01",
  credito: "03",
  debito: "04",
  pix: "17",
};

const HOMOLOG_DESCRICAO = "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL";

type Sdk = {
  notaFiscal: {
    enviarNotaFiscal: (nota: Record<string, unknown>, crt?: number) => Promise<{
      ReturnNF?: {
        Ok?: boolean;
        ChaveNF?: string;
        NumeroProtocolo?: string;
        CodStatusRespostaSefaz?: number;
        DsStatusRespostaSefaz?: string;
      };
      Base64Xml?: string;
      Base64File?: string;
      Error?: string;
    }>;
  };
  eventos: {
    cancelarNotaFiscal: (envio: Record<string, unknown>) => Promise<{ Status?: number; DsMotivo?: string }>;
    inutilizarNumeracao: (envio: Record<string, unknown>) => Promise<{ Status?: number; DsMotivo?: string }>;
  };
  consultas: {
    consultarStatusSefaz: (envio: { ModeloDocumento?: number }) => Promise<{
      CodStatusRespostaSefaz?: number;
      DsStatusRespostaSefaz?: string;
    }>;
  };
  arquivos: {
    obterArquivoNotaFiscal: (envio: Record<string, unknown>) => Promise<Buffer>;
  };
};

/**
 * Brasil NFe guarda o certificado A1 na conta do emitente.
 * O buffer recebido na interface fica disponível para upload futuro; a emissão usa o token.
 * Sem token, devolve a mesma autorização simulada que o PDV já usava — a venda não para.
 */
export class BrasilNFeAdapter implements IFiscalService {
  constructor(private config: BrasilNFeConfig) {}

  private get ligado() {
    return this.config.token.length > 0;
  }

  private tipoAmbiente() {
    return this.config.ambiente === "producao" ? 1 : 2;
  }

  private async sdk(): Promise<Sdk> {
    const { BrasilNFe } = await import("brasilnfe");
    return new BrasilNFe(this.config.token, this.config.userToken) as unknown as Sdk;
  }

  async emitirNFCe(dados: DadosNFCe, _certificado: Buffer, _senhaCert: string): Promise<ResultadoNFCe> {
    if (!this.ligado) {
      return this.simular(dados);
    }

    try {
      const client = await this.sdk();
      const resp = await client.notaFiscal.enviarNotaFiscal(this.toNota(dados), 1);
      const info = resp.ReturnNF;
      if (!info?.Ok) {
        return {
          sucesso: false,
          status: "rejeitada",
          motivo: info?.DsStatusRespostaSefaz || resp.Error || "NFC-e rejeitada",
          codigo_erro: info?.CodStatusRespostaSefaz ? String(info.CodStatusRespostaSefaz) : undefined,
          chave_acesso: info?.ChaveNF,
        };
      }
      const xml = resp.Base64Xml ? Buffer.from(resp.Base64Xml, "base64").toString("utf8") : undefined;
      return {
        sucesso: true,
        status: "autorizada",
        chave_acesso: info.ChaveNF,
        numero_protocolo: info.NumeroProtocolo,
        xml,
        danfe_pdf_base64: resp.Base64File,
      };
    } catch (err) {
      const motivo = err instanceof Error ? err.message : "Falha ao falar com a Brasil NFe";
      return { sucesso: false, status: "rejeitada", motivo, codigo_erro: "BRASILNFE_REDE" };
    }
  }

  async cancelarNota(chave: string, motivo: string, _certificado: Buffer, _senhaCert: string): Promise<boolean> {
    if (!this.ligado) return false;
    if (motivo.trim().length < 15) return false;
    const client = await this.sdk();
    const resp = await client.eventos.cancelarNotaFiscal({
      ChaveNF: chave,
      Justificativa: motivo.trim(),
      TipoAmbiente: this.tipoAmbiente(),
      TipoDocumento: 0,
    });
    return resp.Status === 1;
  }

  async consultarStatus(chave: string): Promise<StatusNota> {
    if (!this.ligado) {
      return { chave, status: "autorizada", motivo: "Simulação local — sem consulta à SEFAZ." };
    }
    try {
      const client = await this.sdk();
      const xml = await client.arquivos.obterArquivoNotaFiscal({
        ChaveNF: chave,
        FileType: 1,
        TipoDocumentoFiscal: 1,
      });
      if (xml?.length) return { chave, status: "autorizada" };
      return { chave, status: "rejeitada", motivo: "Nota não encontrada no provedor." };
    } catch (err) {
      const motivo = err instanceof Error ? err.message : "Falha ao consultar a nota";
      return { chave, status: "rejeitada", motivo };
    }
  }

  async inutilizarNumeracao(serie: string, numInicio: number, numFim: number, motivo: string): Promise<boolean> {
    if (!this.ligado) return false;
    if (motivo.trim().length < 15) return false;
    const client = await this.sdk();
    const resp = await client.eventos.inutilizarNumeracao({
      TipoAmbiente: this.tipoAmbiente(),
      ModeloDocumento: 65,
      Serie: Number(serie) || Number(this.config.serie) || 1,
      NumeracaoInicial: numInicio,
      NumeracaoFinal: numFim,
      Justificativa: motivo.trim(),
    });
    return resp.Status === 1;
  }

  async consultarStatusSefaz(): Promise<"online" | "offline" | "lento"> {
    if (!this.ligado) return "offline";
    try {
      const client = await this.sdk();
      const resp = await client.consultas.consultarStatusSefaz({ ModeloDocumento: 65 });
      const cod = resp.CodStatusRespostaSefaz;
      if (cod === 107) return "online";
      if (cod === 108) return "lento";
      if (cod === 109) return "offline";
      const texto = (resp.DsStatusRespostaSefaz ?? "").toLowerCase();
      if (texto.includes("operacao") || texto.includes("operação")) return "online";
      return "lento";
    } catch {
      return "offline";
    }
  }

  async gerarDANFE(xmlOrChave: string): Promise<string> {
    const chave = xmlOrChave.replace(/\D/g, "");
    if (!this.ligado || chave.length !== 44) return "";
    const client = await this.sdk();
    const pdf = await client.arquivos.obterArquivoNotaFiscal({
      ChaveNF: chave,
      FileType: 2,
      TipoDocumentoFiscal: 1,
    });
    return pdf.toString("base64");
  }

  private simular(dados: DadosNFCe): ResultadoNFCe {
    const chave = `MOCK${Date.now()}${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    return {
      sucesso: true,
      status: "autorizada",
      simulacao: true,
      chave_acesso: chave,
      xml: `<?xml version="1.0"?><nfe><infNFe Id="NFe${chave}"><total>${dados.total}</total></infNFe></nfe>`,
      motivo: "Simulação local. Defina BRASILNFE_TOKEN para emitir na SEFAZ.",
    };
  }

  private toNota(dados: DadosNFCe): Record<string, unknown> {
    const numero = Number(dados.numero);
    const serie = Number(dados.serie || this.config.serie);
    const homolog = this.config.ambiente !== "producao";

    return {
      TipoAmbiente: this.tipoAmbiente(),
      ModeloDocumento: 65,
      Finalidade: 1,
      NaturezaOperacao: "VENDA",
      IndicadorPresenca: 1,
      ConsumidorFinal: true,
      CalcularIBPT: true,
      IdentificadorInterno: dados.referencia_interna,
      ...(Number.isFinite(serie) && serie > 0 ? { Serie: serie } : {}),
      ...(Number.isFinite(numero) && numero > 0 ? { Numero: numero } : {}),
      ...(dados.cpf_consumidor
        ? {
            Cliente: {
              CpfCnpj: dados.cpf_consumidor.replace(/\D/g, ""),
              NmCliente: dados.nome_consumidor || "CONSUMIDOR",
              IndicadorIe: 9,
            },
          }
        : {}),
      Produtos: dados.itens.map((item, index) => ({
        CodProdutoServico: item.codigo || String(index + 1),
        NmProduto: homolog && index === 0 ? HOMOLOG_DESCRICAO : item.descricao,
        NCM: (item.ncm || "19059090").replace(/\D/g, "").padStart(8, "0").slice(0, 8),
        CFOP: Number(item.cfop) || 5102,
        UnidadeComercial: item.unidade || "UN",
        Quantidade: item.quantidade,
        ValorUnitario: item.valor_unitario,
        ValorTotal: item.valor_total,
        OrigemProduto: 0,
        Imposto: {
          ICMS: { CodSituacaoTributaria: item.icms_situacao_tributaria || "102", AliquotaICMS: 0 },
          PIS: { CodSituacaoTributaria: "07", Aliquota: 0 },
          COFINS: { CodSituacaoTributaria: "07", Aliquota: 0 },
        },
      })),
      Pagamentos: dados.pagamentos.map((p) => ({
        IndicadorPagamento: 0,
        FormaPagamento: FORMA_SEFAZ[p.forma],
        VlPago: p.valor,
      })),
      Transporte: { ModalidadeFrete: 9 },
    };
  }
}
