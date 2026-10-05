export type ParsedNfeItem = {
  descricao: string;
  infAdProd?: string;
  ean?: string;
  ncm?: string;
  cfop?: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
};

export type ParsedNfe = {
  chave: string;
  numero?: string;
  dataEmissao?: string;
  total: number;
  /** Primeiro vencimento de duplicata (YYYY-MM-DD), se a nota trouxer. */
  vencimento?: string;
  emitente: {
    razaoSocial: string;
    nomeFantasia?: string;
    cnpj: string;
    ie?: string;
    phone?: string;
    email?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
  };
  itens: ParsedNfeItem[];
};

function normalizeXml(xml: string) {
  return xml
    .replace(/^\uFEFF/, "")
    .replace(/xmlns(:\w+)?="[^"]*"/g, "")
    .replace(/<(\/?)[A-Za-z0-9_.-]+:/g, "<$1");
}

function block(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  return re.exec(xml)?.[1] ?? "";
}

function text(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}\\b[^>]*>([^<]*)</${tag}>`, "i");
  return re.exec(xml)?.[1]?.trim() ?? "";
}

function blocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
  return [...xml.matchAll(re)].map((m) => m[1] ?? "");
}

function num(raw: string) {
  const n = Number(raw.replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}

/** EAN utilizável. "SEM GTIN" e códigos vazios ficam de fora. */
export function usableEan(raw?: string) {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 14) return undefined;
  return digits;
}

export function onlyDigits(raw: string) {
  return raw.replace(/\D/g, "");
}

/** Lê o XML da NF-e (modelo 55) do fornecedor. */
export function parseNfeXml(raw: string): { ok: true; nota: ParsedNfe } | { ok: false; error: string } {
  const xml = normalizeXml(raw);
  if (!xml.includes("<infNFe") && !xml.includes("<NFe")) {
    return { ok: false, error: "Esse arquivo não parece uma NF-e." };
  }
  const inf = block(xml, "infNFe") || xml;
  const id = /<infNFe\b[^>]*\bId="NFe(\d{44})"/i.exec(xml)?.[1] ?? "";
  const chave = id || onlyDigits(text(block(xml, "infProt"), "chNFe"));
  if (chave.length !== 44) {
    return { ok: false, error: "Não achei a chave de acesso (44 dígitos) nesta nota." };
  }

  const emit = block(inf, "emit");
  const ender = block(emit, "enderEmit");
  const cnpj = onlyDigits(text(emit, "CNPJ") || text(emit, "CPF"));
  const razao = text(emit, "xNome");
  if (!cnpj || !razao) {
    return { ok: false, error: "A nota não trouxe CNPJ e razão social do fornecedor." };
  }

  const ide = block(inf, "ide");
  const totalBlock = block(inf, "ICMSTot");
  const dup = block(inf, "dup");
  const vencimento = (text(dup, "dVenc") || "").slice(0, 10) || undefined;
  const dets = blocks(inf, "det");
  const itens: ParsedNfeItem[] = [];
  for (const det of dets) {
    const prod = block(det, "prod") || det;
    const descricao = text(prod, "xProd");
    const quantidade = num(text(prod, "qCom"));
    if (!descricao || quantidade <= 0) continue;
    itens.push({
      descricao,
      infAdProd: text(prod, "infAdProd") || undefined,
      ean: usableEan(text(prod, "cEAN")),
      ncm: text(prod, "NCM") || undefined,
      cfop: text(prod, "CFOP") || undefined,
      unidade: text(prod, "uCom") || "UN",
      quantidade,
      valorUnitario: num(text(prod, "vUnCom")),
      valorTotal: num(text(prod, "vProd")),
    });
  }
  if (!itens.length) {
    return { ok: false, error: "A nota não tem itens para dar entrada." };
  }

  return {
    ok: true,
    nota: {
      chave,
      numero: text(ide, "nNF") || undefined,
      dataEmissao: text(ide, "dhEmi") || text(ide, "dEmi") || undefined,
      total: num(text(totalBlock, "vNF")),
      vencimento,
      emitente: {
        razaoSocial: razao,
        nomeFantasia: text(emit, "xFant") || undefined,
        cnpj,
        ie: text(emit, "IE") || undefined,
        phone: text(ender, "fone") || text(emit, "fone") || undefined,
        email: text(emit, "email") || undefined,
        logradouro: text(ender, "xLgr") || undefined,
        numero: text(ender, "nro") || undefined,
        complemento: text(ender, "xCpl") || undefined,
        bairro: text(ender, "xBairro") || undefined,
        cidade: text(ender, "xMun") || undefined,
        uf: text(ender, "UF") || undefined,
        cep: text(ender, "CEP") || undefined,
      },
      itens,
    },
  };
}
