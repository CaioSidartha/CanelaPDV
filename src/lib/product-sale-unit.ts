import type { Product, ProductSaleUnit } from "@/types";

export const SALE_UNIT_LABELS: Record<ProductSaleUnit, string> = {
  unidade: "Unidade",
  kg: "Quilo (kg)",
  pacote: "Pacote",
};

export function resolveSaleUnit(product: Product): ProductSaleUnit {
  if (product.saleUnit) return product.saleUnit;
  return product.soldByWeight ? "kg" : "unidade";
}

export function isProductSoldByKg(product: Product): boolean {
  return resolveSaleUnit(product) === "kg";
}

/** Converte unidade da NF-e (uCom) para forma de venda no cadastro. */
export function nfeUnitToSaleUnit(unidade: string): ProductSaleUnit {
  const u = unidade.trim().toUpperCase();
  if (u === "KG" || u === "KGM" || u === "KILO") return "kg";
  if (u === "PCT" || u === "PAC" || u === "PC" || u.includes("PCT")) return "pacote";
  return "unidade";
}

export function saleUnitToFiscal(product: ProductSaleUnit): {
  soldByWeight: boolean;
  unidade_comercial: string;
} {
  if (product === "kg") return { soldByWeight: true, unidade_comercial: "KG" };
  if (product === "pacote") return { soldByWeight: false, unidade_comercial: "UN" };
  return { soldByWeight: false, unidade_comercial: "UN" };
}
