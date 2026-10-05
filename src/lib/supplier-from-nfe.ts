import type { ParsedNfe } from "@/lib/nfe-xml";
import type { Supplier } from "@/types";

export type SupplierDraft = Omit<Supplier, "id" | "active" | "createdAt">;

export function supplierDraftFromEmitente(emit: ParsedNfe["emitente"]): SupplierDraft {
  return {
    razaoSocial: emit.razaoSocial,
    nomeFantasia: emit.nomeFantasia,
    cnpj: emit.cnpj,
    ie: emit.ie,
    phone: emit.phone,
    email: emit.email,
    logradouro: emit.logradouro,
    numero: emit.numero,
    complemento: emit.complemento,
    bairro: emit.bairro,
    cidade: emit.cidade,
    uf: emit.uf,
    cep: emit.cep,
  };
}

/** Mescla cadastro existente com dados da nota (preenche lacunas). */
export function mergeSupplierWithEmitente(existing: Supplier, emit: ParsedNfe["emitente"]): Supplier {
  const draft = supplierDraftFromEmitente(emit);
  const pick = <T>(a: T | undefined, b: T | undefined) => a ?? b;
  return {
    ...existing,
    razaoSocial: existing.razaoSocial || draft.razaoSocial,
    nomeFantasia: pick(existing.nomeFantasia, draft.nomeFantasia),
    ie: pick(existing.ie, draft.ie),
    phone: pick(existing.phone, draft.phone),
    email: pick(existing.email, draft.email),
    logradouro: pick(existing.logradouro, draft.logradouro),
    numero: pick(existing.numero, draft.numero),
    complemento: pick(existing.complemento, draft.complemento),
    bairro: pick(existing.bairro, draft.bairro),
    cidade: pick(existing.cidade, draft.cidade),
    uf: pick(existing.uf, draft.uf),
    cep: pick(existing.cep, draft.cep),
  };
}

/** Dados exibidos / enviados na importação (cadastro + NF). */
export function supplierForImport(known: Supplier | undefined, emit: ParsedNfe["emitente"]): Supplier {
  const draft = supplierDraftFromEmitente(emit);
  if (!known) {
    return {
      id: "",
      ...draft,
      active: true,
      createdAt: "",
    };
  }
  return mergeSupplierWithEmitente(known, emit);
}

export function fornecedorFromSupplier(s: Supplier) {
  return {
    razaoSocial: s.razaoSocial,
    nomeFantasia: s.nomeFantasia,
    cnpj: s.cnpj,
    ie: s.ie,
    phone: s.phone,
    email: s.email,
    note: s.note,
    logradouro: s.logradouro,
    numero: s.numero,
    complemento: s.complemento,
    bairro: s.bairro,
    cidade: s.cidade,
    uf: s.uf,
    cep: s.cep,
    logoUrl: s.logoUrl,
  };
}
