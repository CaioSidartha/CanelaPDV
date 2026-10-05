import type { Supplier } from "@/types";

export function formatCnpjDisplay(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (d.length !== 14) return raw;
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function formatCepDisplay(raw?: string) {
  const d = (raw ?? "").replace(/\D/g, "");
  if (d.length !== 8) return raw ?? "";
  return d.replace(/^(\d{5})(\d{3})$/, "$1-$2");
}

export function formatSupplierAddress(s: Pick<
  Supplier,
  "logradouro" | "numero" | "complemento" | "bairro" | "cidade" | "uf" | "cep"
>): string {
  const street = [s.logradouro, s.numero].filter(Boolean).join(", ");
  const line1 = [street, s.complemento].filter(Boolean).join(" — ");
  const line2 = [s.bairro, s.cidade && s.uf ? `${s.cidade} - ${s.uf}` : s.cidade, formatCepDisplay(s.cep)]
    .filter(Boolean)
    .join(" · ");
  return [line1, line2].filter(Boolean).join(" · ") || "";
}

export function supplierInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "F";
}
