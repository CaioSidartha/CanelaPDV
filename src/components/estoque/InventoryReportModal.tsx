"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatEntryDate, stockTableRows, unitTypeLabel } from "@/lib/stock-display";
import {
  formatQty,
  productUsage,
  STOCK_USAGE_LABEL,
  STOCK_USAGES,
  stockUnit,
  usageBadgeClass,
} from "@/lib/stock-usage";
import { formatBRL } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

type PrintMode = "tudo" | "por_tipo";

export function InventoryReportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const products = useAppStore((s) => s.products);
  const company = useAppStore((s) => s.company);
  const [printMode, setPrintMode] = useState<PrintMode>("tudo");

  const rows = useMemo(() => {
    return products
      .filter((p) => p.trackStock !== false && p.active)
      .flatMap((p) =>
        stockTableRows(p).map((row) => {
          const qty = row.qty;
          const cost = p.costPrice ?? 0;
          return {
            product: p,
            row,
            qty,
            cost,
            total: qty * cost,
            usage: productUsage(p),
          };
        }),
      )
      .sort((a, b) => a.product.name.localeCompare(b.product.name, "pt-BR"));
  }, [products]);

  if (!open) return null;

  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const when = format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR });

  const print = (mode: PrintMode) => {
    const sections: { title: string; items: typeof rows }[] =
      mode === "tudo"
        ? [{ title: "Todos os itens", items: rows }]
        : STOCK_USAGES.map((u) => ({
            title: STOCK_USAGE_LABEL[u],
            items: rows.filter((r) => r.usage === u),
          })).filter((s) => s.items.length > 0);

    const sectionHtml = sections
      .map((sec) => {
        const body = sec.items
          .map(
            (row) => `<tr>
          <td>${row.product.name}${row.row.batch ? ` <span style="color:#888">(remessa)</span>` : ""}</td>
          <td>${STOCK_USAGE_LABEL[row.usage]}</td>
          <td>${formatQty(row.qty, unitTypeLabel(row.product))}</td>
          <td>${formatEntryDate(row.row.batch?.receivedAt)}</td>
          <td>${row.cost > 0 ? formatBRL(row.cost) : "—"}</td>
          <td>${formatBRL(row.total)}</td>
        </tr>`,
          )
          .join("");
        const sub = sec.items.reduce((s, r) => s + r.total, 0);
        return `<h2 style="font-size:14px;margin:20px 0 8px;color:#6b5c4e">${sec.title}</h2>
        <table><thead><tr><th>Produto</th><th>Tipo</th><th>Quantidade</th><th>Entrada</th><th>Custo unit.</th><th>Total</th></tr></thead>
        <tbody>${body}</tbody>
        <tfoot><tr><td colspan="5">Subtotal ${sec.title}</td><td>${formatBRL(sub)}</td></tr></tfoot></table>`;
      })
      .join("");

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Inventário</title>
      <style>
        body { font-family: Georgia, serif; color: #1c140e; padding: 24px; }
        h1 { font-size: 22px; margin: 0; }
        p { color: #6b5c4e; font-family: sans-serif; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-family: sans-serif; font-size: 13px; }
        th, td { text-align: left; border-bottom: 1px solid #e7dfd6; padding: 8px 6px; }
        th { font-size: 11px; letter-spacing: .04em; text-transform: uppercase; color: #6b5c4e; }
        tfoot td { font-weight: 700; }
      </style></head><body>
      <h1>Inventário de estoque</h1>
      <p>${company.name} · posição em ${when}</p>
      <p>${rows.length} linhas · valor total ${formatBRL(total)}</p>
      ${sectionHtml}
      </body></html>`;
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(() => frame.remove(), 1000);
  };

  const displayRows =
    printMode === "tudo"
      ? [{ title: null as string | null, items: rows }]
      : STOCK_USAGES.map((u) => ({
          title: STOCK_USAGE_LABEL[u],
          items: rows.filter((r) => r.usage === u),
        })).filter((s) => s.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-3 px-5 py-4">
          <div>
            <h2 className="font-display text-2xl text-zinc-50">Inventário do estoque</h2>
            <p className="text-xs text-zinc-500">Posição em {when}. Quantidade × custo da última compra.</p>
          </div>
          <button type="button" className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10" onClick={onClose} aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mx-5 grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Linhas</p>
            <p className="font-display text-2xl text-zinc-50">{rows.length}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Valor total</p>
            <p className="font-display text-2xl text-zinc-50">{formatBRL(total)}</p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Button type="button" variant="secondary" onClick={() => print("tudo")}>
              <Printer className="h-4 w-4" />
              Imprimir tudo
            </Button>
            <Button type="button" variant="secondary" onClick={() => print("por_tipo")}>
              <Printer className="h-4 w-4" />
              Imprimir por tipo
            </Button>
          </div>
        </div>
        <div className="mx-5 mt-2 flex gap-2">
          <button
            type="button"
            className={`rounded-lg px-3 py-1 text-xs ${printMode === "tudo" ? "bg-brand text-white" : "bg-zinc-800 text-zinc-400"}`}
            onClick={() => setPrintMode("tudo")}
          >
            Visão única
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-1 text-xs ${printMode === "por_tipo" ? "bg-brand text-white" : "bg-zinc-800 text-zinc-400"}`}
            onClick={() => setPrintMode("por_tipo")}
          >
            Por revenda / matéria-prima / consumo
          </button>
        </div>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-auto px-5 py-4">
          {displayRows.map((block) => (
            <div key={block.title ?? "all"} className="mb-6">
              {block.title && (
                <h3 className="mb-2 text-sm font-semibold text-primary">{block.title}</h3>
              )}
              <table className="w-full text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="py-2 pr-3">Produto</th>
                    <th className="py-2 pr-3">Tipo</th>
                    <th className="py-2 pr-3">Quantidade</th>
                    <th className="py-2 pr-3">Entrada</th>
                    <th className="py-2 pr-3">Custo unit.</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {block.items.map((row) => {
                    const usage = row.usage;
                    return (
                      <tr key={row.row.key}>
                        <td className="py-2.5 pr-3 text-zinc-100">
                          {row.product.name}
                          {row.row.batch ? (
                            <span className="ml-1 text-[10px] text-zinc-500">remessa</span>
                          ) : null}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${usageBadgeClass(usage)}`}>
                            {STOCK_USAGE_LABEL[usage]}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-zinc-300">
                          {formatQty(row.qty, stockUnit(row.product))}
                        </td>
                        <td className="py-2.5 pr-3 text-zinc-400">
                          {formatEntryDate(row.row.batch?.receivedAt)}
                        </td>
                        <td className="py-2.5 pr-3 text-zinc-300">{row.cost > 0 ? formatBRL(row.cost) : "—"}</td>
                        <td className="py-2.5 text-right text-zinc-100">{formatBRL(row.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <div className="flex justify-end border-t border-white/10 px-5 py-3">
          <Button type="button" onClick={onClose}>Concluir</Button>
        </div>
      </div>
    </div>
  );
}
