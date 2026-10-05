"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { buildMonthStockPicture, buildStockInsights, type StockInsightBoard } from "@/lib/stock-insights";
import { STOCK_USAGE_LABEL } from "@/lib/stock-usage";
import { formatBRL } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

function formatPct(value: number) {
  return `${(value * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

const INSIGHT_FILTERS: {
  key: keyof StockInsightBoard;
  label: string;
  qtyLabel: string;
  empty: string;
}[] = [
  {
    key: "topSold",
    label: "Mais vendidos",
    qtyLabel: "Saíram",
    empty: "Ainda não há saída de revenda nestes 45 dias.",
  },
  {
    key: "topBought",
    label: "Mais comprados",
    qtyLabel: "Entraram",
    empty: "Ainda não há entrada de nota ou remessa nestes 45 dias.",
  },
  {
    key: "stalled",
    label: "Compra e não vende",
    qtyLabel: "Em estoque",
    empty: "Nenhum item de revenda parado depois da compra.",
  },
  {
    key: "fast",
    label: "Sai rápido",
    qtyLabel: "Saíram",
    empty: "Nenhum item com cobertura menor que 7 dias.",
  },
];

export function StockOverview() {
  const products = useAppStore((s) => s.products);
  const receipts = useAppStore((s) => s.goodsReceipts);
  const sales = useAppStore((s) => s.sales);
  const ledger = useAppStore((s) => s.stockLedger ?? []);
  const month = format(new Date(), "MMMM", { locale: ptBR });
  const picture = buildMonthStockPicture(products, receipts, sales);
  const insights = buildStockInsights(products, ledger);
  const [insight, setInsight] = useState<keyof StockInsightBoard>("topSold");
  const active = INSIGHT_FILTERS.find((item) => item.key === insight) ?? INSIGHT_FILTERS[0];
  const insightRows = insights[active.key];
  const maxUsage = Math.max(picture.byUsage.revenda, picture.byUsage.materia_prima, picture.byUsage.consumo, 1);

  return (
    <div className="mb-6 space-y-4">
      <div className="grid gap-3 lg:grid-cols-3">
        <article className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Compras em {month}
          </p>
          <p className="mt-2 font-display text-3xl text-zinc-50">{formatBRL(picture.purchases)}</p>
          <p className="mt-2 text-xs text-zinc-400">
            Revenda {formatBRL(picture.byUsage.revenda)} · Matéria-prima {formatBRL(picture.byUsage.materia_prima)} · Consumo {formatBRL(picture.byUsage.consumo)}
          </p>
          {picture.pendingCount > 0 && (
            <p className="mt-1 text-xs text-amber-200/90">
              Ainda não lançadas: {formatBRL(picture.pendingTotal)} em {picture.pendingCount} nota(s)
            </p>
          )}
        </article>

        <article className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Faturamento em {month}
          </p>
          <p className="mt-2 font-display text-3xl text-zinc-50">{formatBRL(picture.revenue)}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.min(100, (picture.purchaseShare ?? 0) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {picture.purchaseShare == null
              ? "As compras recebidas entram aqui quando houver venda no mês."
              : `Compras recebidas representam ${formatPct(picture.purchaseShare)} das vendas.`}
          </p>
        </article>

        <article className="rounded-2xl border border-primary bg-primary p-4 text-primary-foreground">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-foreground/70">
            Margem dos itens de revenda
          </p>
          <p className="mt-2 font-display text-3xl">
            {picture.margin == null ? "—" : formatPct(picture.margin)}
          </p>
          <p className="mt-3 text-xs text-primary-foreground/70">
            {picture.margin == null
              ? "Aparece quando uma venda de revenda tem custo da nota."
              : `Vendeu ${formatBRL(picture.revRevenue)} desses itens, com custo ${formatBRL(picture.revCost)}.`}
          </p>
        </article>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Compras recebidas por finalidade
        </p>
        <div className="mt-3 space-y-2">
          {(["revenda", "materia_prima", "consumo"] as const).map((usage) => (
            <div key={usage} className="grid grid-cols-[8.5rem_1fr_5.5rem] items-center gap-3 text-sm">
              <span className="text-zinc-300">{STOCK_USAGE_LABEL[usage]}</span>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full ${usage === "revenda" ? "bg-accent" : usage === "materia_prima" ? "bg-info" : "bg-muted-foreground"}`}
                  style={{ width: `${(picture.byUsage[usage] / maxUsage) * 100}%` }}
                />
              </div>
              <span className="text-right font-mono text-xs text-zinc-300">{formatBRL(picture.byUsage[usage])}</span>
            </div>
          ))}
        </div>
      </div>

      <section className="overflow-hidden rounded-md border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
          {INSIGHT_FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setInsight(item.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                insight === item.key ? "bg-white/15 text-zinc-50" : "text-zinc-400 hover:bg-white/5"
              }`}
            >
              {item.label}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-zinc-500">Últimos 45 dias</span>
        </div>
        {insightRows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">{active.empty}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2">Produto</th>
                <th className="px-4 py-2 text-right">{active.qtyLabel}</th>
                <th className="px-4 py-2">Leitura</th>
              </tr>
            </thead>
            <tbody>
              {insightRows.map((row) => (
                <tr key={row.productId} className="border-t border-white/[0.06]">
                  <td className="px-4 py-2 text-zinc-100">{row.name}</td>
                  <td className="px-4 py-2 text-right font-mono text-zinc-200">
                    {row.qty.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}
                  </td>
                  <td className="px-4 py-2 text-xs text-zinc-500">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
