"use client";

import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { onlyDigits } from "@/lib/nfe-xml";
import type { Supplier } from "@/types";

export type SupplierFormValues = {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  ie: string;
  phone: string;
  email: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  logoUrl: string;
  note: string;
};

type Props = {
  initial?: Partial<SupplierFormValues>;
  onSubmit: (values: SupplierFormValues) => void;
  onCancel?: () => void;
  submitLabel?: string;
  readOnlyCnpj?: boolean;
};

export function supplierFormFromRecord(s: Partial<Supplier>): SupplierFormValues {
  return {
    razaoSocial: s.razaoSocial ?? "",
    nomeFantasia: s.nomeFantasia ?? "",
    cnpj: s.cnpj ?? "",
    ie: s.ie ?? "",
    phone: s.phone ?? "",
    email: s.email ?? "",
    logradouro: s.logradouro ?? "",
    numero: s.numero ?? "",
    complemento: s.complemento ?? "",
    bairro: s.bairro ?? "",
    cidade: s.cidade ?? "",
    uf: s.uf ?? "",
    cep: s.cep ?? "",
    logoUrl: s.logoUrl ?? "",
    note: s.note ?? "",
  };
}

export function SupplierFormPanel({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Salvar fornecedor",
  readOnlyCnpj,
}: Props) {
  const [razao, setRazao] = useState("");
  const [fantasia, setFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [ie, setIe] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [cep, setCep] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [note, setNote] = useState("");
  const [tab, setTab] = useState<"dados" | "endereco">("dados");

  useEffect(() => {
    const v = supplierFormFromRecord(initial ?? {});
    setRazao(v.razaoSocial);
    setFantasia(v.nomeFantasia);
    setCnpj(v.cnpj);
    setIe(v.ie);
    setPhone(v.phone);
    setEmail(v.email);
    setLogradouro(v.logradouro);
    setNumero(v.numero);
    setComplemento(v.complemento);
    setBairro(v.bairro);
    setCidade(v.cidade);
    setUf(v.uf);
    setCep(v.cep);
    setLogoUrl(v.logoUrl);
    setNote(v.note);
    setTab("dados");
  }, [initial]);

  const submit = () => {
    onSubmit({
      razaoSocial: razao,
      nomeFantasia: fantasia,
      cnpj: onlyDigits(cnpj) || cnpj.trim(),
      ie,
      phone,
      email,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf: uf.toUpperCase().slice(0, 2),
      cep,
      logoUrl,
      note,
    });
  };

  const tabBtn = (id: "dados" | "endereco", label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        tab === id ? "bg-brand text-white" : "text-zinc-400 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );

  const label = "mb-1 block text-xs font-medium text-zinc-500";

  return (
    <div className="panel-glass p-4">
      <div className="mb-3 flex gap-2 border-b border-white/10 pb-3">
        {tabBtn("dados", "Identificação")}
        {tabBtn("endereco", "Endereço")}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <aside className="flex flex-col items-center gap-2 lg:w-32">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-zinc-950/60">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-full w-full object-contain p-1" />
            ) : (
              <span className="text-center text-[10px] text-zinc-600">Logo</span>
            )}
          </div>
          <label className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 px-2 py-1.5 text-[10px] text-zinc-400 hover:border-brand/40">
            <ImagePlus className="h-3.5 w-3.5" />
            Enviar
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === "string") setLogoUrl(reader.result);
                };
                reader.readAsDataURL(f);
              }}
            />
          </label>
          <Input
            className="text-[10px]"
            placeholder="URL da logo"
            value={logoUrl.startsWith("data:") ? "" : logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
          />
        </aside>

        <div className="min-w-0 flex-1 space-y-3">
          {tab === "dados" ? (
            <>
              <div>
                <label className={label}>Razão social</label>
                <Input value={razao} onChange={(e) => setRazao(e.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={label}>Nome fantasia</label>
                  <Input value={fantasia} onChange={(e) => setFantasia(e.target.value)} />
                </div>
                <div>
                  <label className={label}>CNPJ</label>
                  <Input
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    readOnly={readOnlyCnpj}
                    className={readOnlyCnpj ? "opacity-80" : ""}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={label}>Inscrição estadual</label>
                  <Input value={ie} onChange={(e) => setIe(e.target.value)} />
                </div>
                <div>
                  <label className={label}>Telefone</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <label className={label}>E-mail</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
              </div>
              <div>
                <label className={label}>Observação (prazo, vendedor, pedido)</label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
                <div>
                  <label className={label}>Logradouro</label>
                  <Input value={logradouro} onChange={(e) => setLogradouro(e.target.value)} />
                </div>
                <div>
                  <label className={label}>Número</label>
                  <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={label}>Complemento</label>
                  <Input value={complemento} onChange={(e) => setComplemento(e.target.value)} />
                </div>
                <div>
                  <label className={label}>Bairro</label>
                  <Input value={bairro} onChange={(e) => setBairro(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_80px_120px]">
                <div>
                  <label className={label}>Cidade</label>
                  <Input value={cidade} onChange={(e) => setCidade(e.target.value)} />
                </div>
                <div>
                  <label className={label}>UF</label>
                  <Input value={uf} onChange={(e) => setUf(e.target.value)} maxLength={2} />
                </div>
                <div>
                  <label className={label}>CEP</label>
                  <Input value={cep} onChange={(e) => setCep(e.target.value)} />
                </div>
              </div>
            </>
          )}

          <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
            <Button type="button" onClick={submit}>{submitLabel}</Button>
            {onCancel ? (
              <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
