/** Prefixo 20 = faixa interna (loja), comum em PDV para códigos gerados na loja. */
const INTERNAL_PREFIX = "20";

function ean13CheckDigit(digits12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = Number(digits12[i]);
    sum += i % 2 === 0 ? n : n * 3;
  }
  const mod = (10 - (sum % 10)) % 10;
  return String(mod);
}

/** Gera EAN-13 interno (13 dígitos) para produto sem código do fornecedor. */
export function generateStoreBarcode(existing: string[] = []): string {
  const used = new Set(existing.map((c) => c.replace(/\D/g, "")));
  for (let attempt = 0; attempt < 50; attempt++) {
    const body = String(Math.floor(Math.random() * 1e10)).padStart(10, "0");
    const base = `${INTERNAL_PREFIX}${body}`.slice(0, 12);
    const check = ean13CheckDigit(base);
    const code = `${base}${check}`;
    if (!used.has(code)) return code;
  }
  const t = String(Date.now()).slice(-10);
  const base = `${INTERNAL_PREFIX}${t}`.slice(0, 12);
  return `${base}${ean13CheckDigit(base)}`;
}

export function productNeedsCustomLabel(p: {
  barcode?: string;
  referenceBarcode?: string;
  barcodeCustomized?: boolean;
}): boolean {
  const code = (p.barcode ?? "").replace(/\D/g, "");
  if (code.length < 8) return false;
  if (p.barcodeCustomized) return true;
  const ref = (p.referenceBarcode ?? "").replace(/\D/g, "");
  if (!ref) return false;
  return ref !== code;
}
