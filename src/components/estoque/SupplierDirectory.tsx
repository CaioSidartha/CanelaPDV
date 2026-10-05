"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Search } from "lucide-react";
import { SupplierEditorModal } from "@/components/estoque/SupplierEditorModal";
import { formatCnpjDisplay, formatSupplierAddress, supplierInitials } from "@/lib/supplier-format";
import { PostReceiptModal } from "@/components/estoque/PostReceiptModal";
import { SupplierPanel } from "@/components/estoque/SupplierPanel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { receiptIsPosted, receiptStatusLabel } from "@/lib/stock-insights";
import { STOCK_USAGE_LABEL } from "@/lib/stock-usage";
import { formatBRL } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { GoodsReceiptStatus, Supplier } from "@/types";

function dueLabel(iso?: string) {
  if (!iso) return "—";
  const date = parseISO(iso.slice(0, 10));
  if (Number.isNaN(date.getTime())) return iso;
  const days = Math.ceil((date.getTime() - Date.now()) / 86400000);
  if (days > 0 && days <= 30) return `em ${days} dia${days === 1 ? "" : "s"}`;
  return format(date, "dd MMM yyyy", { locale: ptBR });
}

type NoteFilter = "todas" | GoodsReceiptStatus;
type Side = "notas" | "painel";

const NOTE_FILTERS: { key: NoteFilter; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "a_lancar", label: "A ser lançada" },
  { key: "a_caminho", label: "Em rota" },
  { key: "recebida", label: "Lançada" },
];

function matchesStatus(status: GoodsReceiptStatus | undefined, filter: NoteFilter) {
  if (filter === "todas") return true;
  return (status ?? "recebida") === filter;
}

export function SupplierDirectory() {
  const suppliers = useAppStore((s) => s.suppliers);
  const receipts = useAppStore((s) => s.goodsReceipts);
  const markReceiptEnRoute = useAppStore((s) => s.markReceiptEnRoute);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<NoteFilter>("todas");
  const [side, setSide] = useState<Side>("notas");
  const [form, setForm] = useState<Supplier | null | undefined>(undefined);
  const [postId, setPostId] = useState<string | null>(null);
  const [openNote, setOpenNote] = useState<string | null>(null);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return suppliers
      .filter((s) => {
        if (!term) return true;
        return (
          s.razaoSocial.toLowerCase().includes(term) ||
          s.cnpj.includes(term.replace(/\D/g, ""))
        );
      })
      .sort((a, b) => a.razaoSocial.localeCompare(b.razaoSocial, "pt-BR"));
  }, [suppliers, q]);

  const selected = suppliers.find((s) => s.id === selectedId) ?? null;
  const notes = useMemo(() => {
    return receipts
      .filter((receipt) => (selected ? receipt.supplierId === selected.id : true))
      .filter((receipt) => matchesStatus(receipt.status, statusFilter))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [receipts, selected, statusFilter]);
  const posting = receipts.find((r) => r.id === postId) ?? null;
  const postingSupplier = suppliers.find((s) => s.id === posting?.supplierId);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-xl text-zinc-50">Fornecedores</h2>
          <Button type="button" size="sm" onClick={() => setForm(null)}>
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        </div>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar fornecedor..." className="pl-10" />
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedId(null);
            setSide("notas");
          }}
          className={`mb-2 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${
            selectedId == null && side === "notas" ? "bg-brand/15 text-zinc-50" : "text-zinc-300 hover:bg-white/5"
          }`}
        >
          <span>Todas as notas</span>
          <span className="text-[11px] text-zinc-500">{receipts.length}</span>
        </button>
        {visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            Nenhum fornecedor. Cadastre aqui ou importe o XML da nota.
          </p>
        ) : (
          <ul className="space-y-1">
            {visible.map((supplier) => {
              const count = receipts.filter((r) => r.supplierId === supplier.id).length;
              const active = supplier.id === selected?.id && side === "notas";
              return (
                <li key={supplier.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(supplier.id);
                      setSide("notas");
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left ${
                      active ? "bg-brand/15" : "hover:bg-white/5"
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand/20 text-xs font-semibold text-brand-light">
                      {supplier.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={supplier.logoUrl} alt="" className="h-full w-full object-contain" />
                      ) : (
                        supplierInitials(supplier.razaoSocial)
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-zinc-100">{supplier.razaoSocial}</span>
                      <span className="block truncate text-[11px] text-zinc-500">{formatCnpjDisplay(supplier.cnpj)}</span>
                    </span>
                    <span className="text-[11px] text-zinc-500">{count} nota{count === 1 ? "" : "s"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(
            [
              ["notas", "Notas"],
              ["painel", "Painel"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSide(key)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                side === key ? "bg-primary text-primary-foreground" : "text-zinc-400 hover:bg-white/5"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {side === "painel" ? (
          <SupplierPanel />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Notas de entrada</p>
                <h2 className="font-display text-2xl text-zinc-50">
                  {selected ? selected.razaoSocial : "Todas as notas"}
                </h2>
                <p className="text-xs text-zinc-500">
                  {selected
                    ? `CNPJ ${formatCnpjDisplay(selected.cnpj)}${selected.ie ? ` · IE ${selected.ie}` : ""}${selected.phone ? ` · ${selected.phone}` : ""}${selected.email ? ` · ${selected.email}` : ""}`
                    : "As notas da loja, sem precisar abrir um fornecedor. Clique num nome à esquerda para ver só as dele."}
                </p>
                {selected && formatSupplierAddress(selected) ? (
                  <p className="mt-1 text-xs text-zinc-400">{formatSupplierAddress(selected)}</p>
                ) : null}
                {selected?.note && <p className="mt-1 text-xs text-zinc-400">{selected.note}</p>}
              </div>
              {selected && (
                <Button type="button" variant="secondary" size="sm" onClick={() => setForm(selected)}>
                  Editar cadastro
                </Button>
              )}
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              {NOTE_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setStatusFilter(filter.key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    statusFilter === filter.key ? "bg-white/15 text-zinc-50" : "text-zinc-400 hover:bg-white/5"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            {notes.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-500">
                Nenhuma nota nesse filtro. A importação do XML aparece aqui.
              </p>
            ) : (
              <ul className="space-y-3">
                {notes.map((note) => {
                  const posted = receiptIsPosted(note);
                  const waiting = note.status === "a_lancar";
                  const open = openNote === note.id;
                  const supplier = suppliers.find((item) => item.id === note.supplierId);
                  const simulated = note.id.startsWith("demo-");
                  const badge = posted
                    ? "bg-emerald-500/15 text-emerald-300"
                    : waiting
                      ? "bg-zinc-500/20 text-zinc-300"
                      : "bg-amber-500/15 text-amber-200";
                  return (
                    <li key={note.id} className="rounded-xl border border-white/10 px-3 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${badge}`}>
                          {receiptStatusLabel(note)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-zinc-100">
                            NF-e {note.nfeNumero ?? note.nfeChave.slice(-8)}
                            {!selected && supplier ? ` · ${supplier.razaoSocial}` : ""}
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            {posted && note.receivedAt
                              ? `Lançada em ${format(new Date(note.receivedAt), "dd MMM yyyy", { locale: ptBR })}`
                              : `Emitida ${note.dataEmissao ? format(parseISO(note.dataEmissao.slice(0, 10)), "dd MMM yyyy", { locale: ptBR }) : format(new Date(note.createdAt), "dd MMM yyyy", { locale: ptBR })}`}
                            {" · "}
                            {note.itens.length} itens
                            {simulated ? " · simulação" : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-zinc-100">{formatBRL(note.total)}</p>
                          <p className="text-[11px] text-zinc-500">Venc. {dueLabel(note.vencimento)}</p>
                        </div>
                        {posted ? (
                          <button type="button" className="text-sm text-brand-light" onClick={() => setOpenNote(open ? null : note.id)}>
                            {open ? "Ocultar" : "Ver nota"}
                          </button>
                        ) : waiting ? (
                          <Button type="button" size="sm" variant="secondary" onClick={() => markReceiptEnRoute(note.id)}>
                            Marcar em rota
                          </Button>
                        ) : (
                          <Button type="button" size="sm" onClick={() => setPostId(note.id)}>Dar baixa</Button>
                        )}
                      </div>
                      {open && (
                        <ul className="mt-3 space-y-1 border-t border-white/10 pt-2 text-xs text-zinc-400">
                          {note.itens.map((item) => (
                            <li key={item.id} className="flex justify-between gap-3">
                              <span>
                                {item.productName}
                                {item.usage ? ` · ${STOCK_USAGE_LABEL[item.usage]}` : ""}
                                {item.cfop ? ` · CFOP ${item.cfop}` : ""}
                              </span>
                              <span className="font-mono">
                                {item.quantidadeRecebida ?? item.quantidade} {item.unidade} · {formatBRL(item.valorTotal)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </section>

      {form !== undefined && (
        <SupplierEditorModal
          open
          supplier={form}
          onClose={() => setForm(undefined)}
        />
      )}
      {posting && postingSupplier && (
        <PostReceiptModal receipt={posting} supplierName={postingSupplier.razaoSocial} onClose={() => setPostId(null)} />
      )}
    </div>
  );
}
