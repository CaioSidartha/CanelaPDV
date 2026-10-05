"use client";

import { useMemo, useState } from "react";
import { FileUp, X } from "lucide-react";
import {
  buildDraftFromNfeItem,
  NfeImportLinePanel,
  type ImportDraftLine,
  unitCostForLine,
} from "@/components/estoque/NfeImportLinePanel";
import { SupplierEditorModal } from "@/components/estoque/SupplierEditorModal";
import { buildProductPayloadFromForm, ProductFormPanel } from "@/components/products/ProductFormPanel";
import { Button } from "@/components/ui/Button";
import { fornecedorFromSupplier, supplierForImport } from "@/lib/supplier-from-nfe";
import { formatCnpjDisplay, formatSupplierAddress, supplierInitials } from "@/lib/supplier-format";
import { onlyDigits, parseNfeXml, type ParsedNfe } from "@/lib/nfe-xml";
import { parseUnitsPerPackage } from "@/lib/stock-package-entry";
import { DEFAULT_MARKUP_PERCENT, parseMoneyInput } from "@/lib/product-pricing";
import { formatBRL } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

function isHomologacaoRazao(razao: string) {
  return /homologa|sem\s+valor\s+fiscal/i.test(razao);
}

function emitenteHeading(emit: ParsedNfe["emitente"], knownRazao?: string) {
  const razao = (knownRazao ?? emit.razaoSocial).trim();
  const fant = emit.nomeFantasia?.trim();
  if (fant && isHomologacaoRazao(razao)) return { title: fant, subtitle: razao };
  if (fant && fant !== razao) return { title: razao, subtitle: `Nome fantasia: ${fant}` };
  return { title: razao };
}

function rowStatusClass(status: ImportDraftLine["status"], selected: boolean) {
  const base = selected ? "bg-brand/15 ring-1 ring-brand/40" : "hover:bg-white/[0.04]";
  if (status === "linked") return base;
  if (status === "registered") return `${base} bg-emerald-950/25`;
  return `${base} bg-amber-950/20`;
}

function statusLabel(status: ImportDraftLine["status"]) {
  if (status === "linked") return "Vinculado";
  if (status === "registered") return "Cadastrado";
  return "Novo";
}

export function ImportNfeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const products = useAppStore((s) => s.products);
  const categories = useAppStore((s) => s.categories);
  const suppliers = useAppStore((s) => s.suppliers);
  const goodsReceipts = useAppStore((s) => s.goodsReceipts);
  const company = useAppStore((s) => s.company);
  const receiveSupplierInvoice = useAppStore((s) => s.receiveSupplierInvoice);
  const addProduct = useAppStore((s) => s.addProduct);

  const markupPercent = company.defaultMarkupPercent ?? DEFAULT_MARKUP_PERCENT;

  const [nota, setNota] = useState<ParsedNfe | null>(null);
  const [lines, setLines] = useState<ImportDraftLine[]>([]);
  const [selected, setSelected] = useState(0);
  const [registerIdx, setRegisterIdx] = useState<number | null>(null);
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  const knownSupplier = useMemo(() => {
    if (!nota) return undefined;
    const cnpj = onlyDigits(nota.emitente.cnpj);
    return suppliers.find((supplier) => onlyDigits(supplier.cnpj) === cnpj);
  }, [nota, suppliers]);

  const supplierView = useMemo(() => {
    if (!nota) return null;
    return supplierForImport(knownSupplier, nota.emitente);
  }, [nota, knownSupplier]);

  if (!open) return null;

  const reset = () => {
    setNota(null);
    setLines([]);
    setSelected(0);
    setRegisterIdx(null);
    setSupplierFormOpen(false);
    setErr(null);
    setFileName("");
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setErr(null);
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseNfeXml(text);
    if (!parsed.ok) {
      setNota(null);
      setLines([]);
      setErr(parsed.error);
      return;
    }
    const chave = onlyDigits(parsed.nota.chave);
    if (goodsReceipts.some((r) => r.nfeChave === chave)) {
      setNota(null);
      setLines([]);
      setErr("Nota já lançada. Esta NF-e já consta no estoque — não é possível importar de novo.");
      return;
    }
    setNota(parsed.nota);
    setLines(
      parsed.nota.itens.map((item) => buildDraftFromNfeItem(item, categories, products, markupPercent)),
    );
    setSelected(0);
    const cnpj = onlyDigits(parsed.nota.emitente.cnpj);
    const exists = suppliers.some((s) => onlyDigits(s.cnpj) === cnpj);
    setSupplierFormOpen(!exists);
  };

  const patch = (index: number, partial: Partial<ImportDraftLine>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...partial } : line)));
  };

  const selectedLine = lines[selected];

  const confirm = (lancarAgora: boolean) => {
    if (!nota) return;
    const pending = lines.find((l) => l.status === "unlinked" || !l.productId);
    if (pending) {
      setErr(`Cadastre ou vincule: ${pending.descricao}`);
      return;
    }
    const res = receiveSupplierInvoice({
      chave: nota.chave,
      numero: nota.numero,
      dataEmissao: nota.dataEmissao,
      vencimento: nota.vencimento,
      total: nota.total,
      lancarAgora,
      fornecedor: fornecedorFromSupplier(supplierForImport(knownSupplier, nota.emitente)),
      itens: lines.map((line) => {
        const price = parseMoneyInput(line.precoVenda);
        return {
          descricaoNota: line.descricao,
          ean: line.ean,
          ncm: line.ncm,
          cfop: line.cfop,
          unidade: line.unidade,
          quantidade: line.quantidade,
          unitsPerNfUnit: parseUnitsPerPackage(line.unitsPerPackage, 1),
          valorUnitario: line.valorUnitario,
          valorTotal: line.valorTotal,
          usage: line.usage,
          saleUnit: line.saleUnit,
          productId: line.productId,
          precoVendaAtualizado: price > 0 ? price : undefined,
          novoProduto: undefined,
        };
      }),
    });
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    reset();
    onClose();
  };

  const registerLine = lines[registerIdx ?? -1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4">
      <div className="flex max-h-[96vh] w-full max-w-[min(1400px,98vw)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Estoque</p>
            <h2 className="font-display text-2xl text-zinc-50">Importar nota do fornecedor</h2>
            <p className="text-xs text-zinc-500">Clique na linha para configurar conversão, vínculo e preços.</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            onClick={() => {
              reset();
              onClose();
            }}
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <label className="mb-4 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-white/15 bg-zinc-900/40 px-4 py-5 text-center">
              <FileUp className="h-5 w-5 text-brand-light" />
              <span className="text-sm text-zinc-200">{fileName || "Escolher arquivo .xml"}</span>
              <input type="file" accept=".xml,text/xml,application/xml" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
            </label>

            {err && (
              <p className="mb-3 rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-100">{err}</p>
            )}

            {nota && (
              <>
                {supplierView && (
                <div className="mb-4 rounded-xl border border-white/10 bg-zinc-900/40 px-3 py-2.5 text-sm">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-zinc-950/80">
                      {supplierView.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={supplierView.logoUrl} alt="" className="h-full w-full object-contain p-1" />
                      ) : (
                        <span className="text-sm font-semibold text-brand-light">{supplierInitials(supplierView.razaoSocial)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-light/80">Fornecedor</p>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${knownSupplier ? "bg-emerald-500/15 text-emerald-300" : "bg-primary/15 text-primary"}`}>
                          {knownSupplier ? "Cadastrado" : "Novo"}
                        </span>
                      </div>
                      {(() => {
                        const { title, subtitle } = emitenteHeading(nota.emitente, knownSupplier?.razaoSocial);
                        return (
                          <>
                            <p className="text-sm font-semibold leading-snug text-zinc-50">{title}</p>
                            {subtitle ? <p className="text-[11px] text-zinc-400">{subtitle}</p> : null}
                          </>
                        );
                      })()}
                      <dl className="mt-1.5 grid gap-x-4 gap-y-0.5 text-[11px] sm:grid-cols-2">
                        <div className="text-zinc-400">
                          <span className="text-brand-light/70">CNPJ </span>
                          <span className="font-mono text-zinc-200">{formatCnpjDisplay(supplierView.cnpj)}</span>
                        </div>
                        {supplierView.ie ? (
                          <div className="text-zinc-400">
                            <span className="text-brand-light/70">IE </span>
                            <span className="text-zinc-200">{supplierView.ie}</span>
                          </div>
                        ) : null}
                        {supplierView.phone ? (
                          <div className="text-zinc-400">
                            <span className="text-brand-light/70">Tel </span>
                            <span className="text-zinc-200">{supplierView.phone}</span>
                          </div>
                        ) : null}
                        {supplierView.email ? (
                          <div className="text-zinc-400">
                            <span className="text-brand-light/70">E-mail </span>
                            <span className="text-zinc-200">{supplierView.email}</span>
                          </div>
                        ) : null}
                        {formatSupplierAddress(supplierView) ? (
                          <div className="sm:col-span-2 text-zinc-300">
                            <span className="text-brand-light/70">Endereço </span>
                            {formatSupplierAddress(supplierView)}
                          </div>
                        ) : null}
                        <div className="sm:col-span-2 text-zinc-500">
                          {nota.numero ? `NF ${nota.numero}` : "NF-e"}
                          {nota.dataEmissao ? ` · Emissão ${nota.dataEmissao.slice(0, 10)}` : ""}
                          {lines.length ? ` · ${lines.length} itens` : ""}
                        </div>
                      </dl>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {nota.total > 0 ? (
                        <div className="rounded-lg border border-brand/30 bg-brand/10 px-3 py-1.5 text-right">
                          <p className="text-[9px] font-semibold uppercase text-brand-light/90">Total da nota</p>
                          <p className="text-xl font-bold tabular-nums text-zinc-50">{formatBRL(nota.total)}</p>
                        </div>
                      ) : null}
                      <Button type="button" size="sm" variant="secondary" onClick={() => setSupplierFormOpen(true)}>
                        {knownSupplier ? "Editar fornecedor" : "Cadastrar fornecedor"}
                      </Button>
                    </div>
                  </div>
                </div>
                )}

                <div className="mb-2 flex flex-wrap gap-3 text-[10px] text-zinc-500">
                  <span className="flex items-center gap-1"><span className="h-2 w-6 rounded bg-emerald-900/50 ring-1 ring-emerald-600/40" /> Vinculado</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-6 rounded bg-amber-900/40 ring-1 ring-amber-600/30" /> Novo (cadastrar)</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-6 rounded bg-emerald-950/60 ring-1 ring-emerald-400/50" /> Cadastrado agora</span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full min-w-[820px] text-left text-xs">
                    <thead className="bg-zinc-950/80 text-[9px] uppercase tracking-wide text-brand-light/70">
                      <tr>
                        <th className="px-2 py-1">#</th>
                        <th className="px-2 py-1">Descrição (nota)</th>
                        <th className="px-2 py-1">Qtd</th>
                        <th className="px-2 py-1">Un.</th>
                        <th className="px-2 py-1">V. unit.</th>
                        <th className="px-2 py-1">Total</th>
                        <th className="px-2 py-1">Status</th>
                        <th className="px-2 py-1">Estoque</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, index) => {
                        const factor = parseUnitsPerPackage(line.unitsPerPackage, 1);
                        const stockIn = line.quantidade * factor;
                        const linked = products.find((p) => p.id === line.productId);
                        return (
                          <tr
                            key={`${line.descricao}-${index}`}
                            className={`cursor-pointer border-t border-white/5 ${rowStatusClass(line.status, selected === index)}`}
                            onClick={() => setSelected(index)}
                          >
                            <td className="px-2 py-1 font-mono text-[11px] text-zinc-500">{index + 1}</td>
                            <td className="max-w-[280px] px-2 py-1">
                              <p className="truncate text-[11px] font-medium leading-tight text-zinc-100" title={line.descricao}>
                                {line.descricao}
                              </p>
                              <p className="text-[10px] text-brand-light/75">{line.ean ? `EAN ${line.ean}` : "—"}</p>
                            </td>
                            <td className="px-2 py-1 font-mono text-[11px]">{line.quantidade}</td>
                            <td className="px-2 py-1 text-[11px] text-zinc-400">{line.unidade}</td>
                            <td className="px-2 py-1 font-mono text-[11px] tabular-nums text-zinc-200">{formatBRL(line.valorUnitario)}</td>
                            <td className="px-2 py-1 font-mono text-[11px] tabular-nums text-zinc-200">{formatBRL(line.valorTotal)}</td>
                            <td className="px-2 py-1">
                              <span className="rounded bg-black/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-zinc-300">
                                {statusLabel(line.status)}
                              </span>
                            </td>
                            <td className="px-2 py-1 text-[10px] leading-tight text-zinc-400">
                              <span className="line-clamp-1">{linked ? linked.name : "—"}</span>
                              <span className="text-emerald-400/90">+{stockIn} un.</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {nota && selectedLine ? (
            <NfeImportLinePanel
              line={selectedLine}
              markupPercent={markupPercent}
              onChange={(p) => patch(selected, p)}
              onCadastrar={() => setRegisterIdx(selected)}
            />
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-white/10 px-5 py-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => { reset(); onClose(); }}>
            Cancelar
          </Button>
          <Button type="button" variant="secondary" className="flex-1" disabled={!nota} onClick={() => confirm(false)}>
            Registrar sem lançar
          </Button>
          <Button type="button" className="flex-1" disabled={!nota} onClick={() => confirm(true)}>
            Dar baixa agora
          </Button>
        </div>
      </div>

      {registerIdx != null && registerLine ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-zinc-900 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-xl text-zinc-50">Cadastrar produto</h3>
              <button type="button" className="text-zinc-400 hover:text-zinc-200" onClick={() => setRegisterIdx(null)}>✕</button>
            </div>
            <ProductFormPanel
              markupPercent={markupPercent}
              initial={{
                name: registerLine.nomeNovo || registerLine.descricao,
                barcode: registerLine.ean ?? "",
                referenceBarcode: registerLine.ean ?? "",
                categoryId: registerLine.categoryId,
                saleUnit: registerLine.saleUnit,
                usage: registerLine.usage,
                costPrice: unitCostForLine(registerLine),
                price: parseMoneyInput(registerLine.precoVenda),
                stockMin: 0,
                ncm: registerLine.ncm,
                cfop: registerLine.cfop,
              }}
              submitLabel="Cadastrar e vincular"
              onCancel={() => setRegisterIdx(null)}
              onSubmit={(values) => {
                const payload = buildProductPayloadFromForm(values);
                addProduct(payload);
                const list = useAppStore.getState().products;
                const created = values.barcode
                  ? list.find((p) => p.barcode === values.barcode.trim())
                  : list.find((p) => p.name === values.name);
                const id = created?.id ?? list.at(-1)?.id;
                if (!id) return;
                patch(registerIdx, {
                  productId: id,
                  criarNovo: false,
                  status: "registered",
                  nomeNovo: values.name,
                  categoryId: values.categoryId,
                  precoVenda: String(values.price).replace(".", ","),
                  saleUnit: values.saleUnit,
                  usage: values.usage,
                  costUnitAccepted: values.costPrice,
                });
                setRegisterIdx(null);
              }}
            />
          </div>
        </div>
      ) : null}

      {supplierFormOpen && nota ? (
        <SupplierEditorModal
          open
          supplier={knownSupplier ?? null}
          initial={supplierForImport(knownSupplier, nota.emitente)}
          onClose={() => setSupplierFormOpen(false)}
        />
      ) : null}
    </div>
  );
}
