/** Converte quantidade da NF (embalagem) em unidades de venda no estoque. */
export function stockQtyFromPackages(packageQty: number, unitsPerPackage: number): number {
  const p = Number.isFinite(packageQty) ? packageQty : 0;
  const u = Math.max(1, unitsPerPackage);
  return p * u;
}

/** Custo por unidade de venda quando a NF cobra por embalagem. */
export function saleUnitCostFromNf(nfUnitCost: number, unitsPerPackage: number): number {
  const u = Math.max(1, unitsPerPackage);
  if (!(nfUnitCost > 0)) return 0;
  return nfUnitCost / u;
}

export function parseUnitsPerPackage(raw: string, fallback = 1): number {
  const n = Number(String(raw).replace(",", ".").trim());
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

/**
 * Sugestão a partir do texto da nota — o operador sempre pode alterar.
 * Não multiplica varetas/folhas; só padrões de embalagem (PCT/10CX, CX/50 UN…).
 */
export function suggestUnitsPerNfUnit(descricao: string, infAdProd?: string, uCom?: string): number {
  const text = `${descricao} ${infAdProd ?? ""}`.toUpperCase();

  const pctCx = text.match(/PCT\s*\/\s*(\d+)\s*CX/);
  if (pctCx) {
    const n = Number(pctCx[1]);
    if (n > 0) return n;
  }

  const cxUn =
    text.match(/CX\s*\/\s*(\d+)\s*UN/) ??
    text.match(/CX\s+C\s*\/\s*(\d+)\s*UNIDADES?/) ??
    text.match(/CX\s+C\s*\/\s*(\d+)\s*UN/);
  if (cxUn) {
    const n = Number(cxUn[1]);
    if (n > 0) return n;
  }

  if (uCom?.trim().toUpperCase() === "CX") {
    const cxSlash = text.match(/CX\s*\/\s*(\d+)/);
    if (cxSlash) {
      const n = Number(cxSlash[1]);
      if (n > 1) return n;
    }
  }

  return 1;
}
