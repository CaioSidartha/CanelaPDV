"use client";

import { useState } from "react";
import { SupplierFormPanel, supplierFormFromRecord, type SupplierFormValues } from "@/components/estoque/SupplierFormPanel";
import { useAppStore } from "@/store/useAppStore";
import type { Supplier } from "@/types";

export function SupplierEditorModal({
  open,
  supplier,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  supplier: Supplier | null;
  initial?: Partial<Supplier>;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const saveSupplier = useAppStore((s) => s.saveSupplier);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const title = supplier ? "Editar fornecedor" : "Cadastrar fornecedor";
  const mergedInitial = supplier ? supplierFormFromRecord(supplier) : supplierFormFromRecord(initial ?? {});

  const handleSubmit = (values: SupplierFormValues) => {
    const res = saveSupplier({
      id: supplier?.id,
      razaoSocial: values.razaoSocial,
      nomeFantasia: values.nomeFantasia || undefined,
      cnpj: values.cnpj,
      ie: values.ie || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      logradouro: values.logradouro || undefined,
      numero: values.numero || undefined,
      complemento: values.complemento || undefined,
      bairro: values.bairro || undefined,
      cidade: values.cidade || undefined,
      uf: values.uf || undefined,
      cep: values.cep || undefined,
      logoUrl: values.logoUrl || undefined,
      note: values.note || undefined,
    });
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setErr(null);
    const list = useAppStore.getState().suppliers;
    const cnpj = values.cnpj.replace(/\D/g, "");
    const saved = supplier?.id
      ? list.find((s) => s.id === supplier.id)
      : list.find((s) => s.cnpj.replace(/\D/g, "") === cnpj);
    if (saved) onSaved?.(saved.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-zinc-900 p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-50">{title}</h2>
            <p className="text-xs text-zinc-500">Dados vindos da NF-e podem ser revisados antes de salvar.</p>
          </div>
          <button type="button" className="text-sm text-zinc-400 hover:text-zinc-200" onClick={onClose}>
            Fechar
          </button>
        </div>
        {err ? <p className="mb-2 text-sm text-red-300">{err}</p> : null}
        <SupplierFormPanel
          key={supplier?.id ?? mergedInitial.cnpj ?? "new"}
          readOnlyCnpj={Boolean(supplier?.cnpj || initial?.cnpj)}
          initial={mergedInitial}
          submitLabel={supplier ? "Salvar alterações" : "Cadastrar fornecedor"}
          onCancel={onClose}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
