import { BrasilNFeAdapter } from "./adapters/BrasilNFeAdapter";
import { FocusNFeAdapter } from "./adapters/FocusNFeAdapter";
import type { IFiscalService } from "./IFiscalService";
import type { AmbienteFiscal } from "./types";

function ambienteAtual(): AmbienteFiscal {
  return process.env.FISCAL_AMBIENTE === "producao" ? "producao" : "homologacao";
}

/**
 * Único lugar que escolhe o provedor. Trocar de Brasil NFe para Focus = mudar FISCAL_PROVIDER.
 */
export function getFiscalService(): IFiscalService {
  const provedor = (process.env.FISCAL_PROVIDER ?? "brasilnfe").trim().toLowerCase();

  if (provedor === "focusnfe") {
    return new FocusNFeAdapter();
  }

  if (provedor === "brasilnfe") {
    return new BrasilNFeAdapter({
      token: process.env.BRASILNFE_TOKEN?.trim() ?? "",
      userToken: process.env.BRASILNFE_USER_TOKEN?.trim() || undefined,
      ambiente: ambienteAtual(),
      serie: process.env.NFCE_SERIE?.trim() || "1",
    });
  }

  throw new Error(`Provedor fiscal não reconhecido: ${provedor}`);
}

export function fiscalConfigPublica() {
  const token = Boolean(process.env.BRASILNFE_TOKEN?.trim());
  return {
    provider: (process.env.FISCAL_PROVIDER ?? "brasilnfe").trim().toLowerCase(),
    ambiente: ambienteAtual(),
    modo: token ? ("provedor" as const) : ("simulacao" as const),
  };
}
