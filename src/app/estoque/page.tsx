"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ClipboardList,
  Pencil,
  Plus,
  Search,
  Truck,
} from "lucide-react";
import { ProductEditorModal } from "@/components/config/ProductEditorModal";
import { ImportNfeModal } from "@/components/estoque/ImportNfeModal";
import { InventoryReportModal } from "@/components/estoque/InventoryReportModal";
import { PackageToStockFields } from "@/components/estoque/PackageToStockFields";
import { QuickReceiveModal } from "@/components/estoque/QuickReceiveModal";
import { parseUnitsPerPackage, stockQtyFromPackages } from "@/lib/stock-package-entry";
import { StockOverview } from "@/components/estoque/StockOverview";
import { BarcodeLabelsPanel } from "@/components/estoque/BarcodeLabelsPanel";
import { SupplierDirectory } from "@/components/estoque/SupplierDirectory";
import { UsageSelect } from "@/components/estoque/UsageSelect";
import { Button } from "@/components/ui/Button";
import { STOCK_PAGE_SIZE, TablePagination } from "@/components/ui/TablePagination";
import { Input } from "@/components/ui/Input";
import { STOCK_REASON_LABEL } from "@/lib/stock-ledger-labels";
import { productMatchesTextSearch } from "@/lib/product-catalog";
import {
  formatEntryDate,
  profitUnitAmount,
  stockTableRows,
  unitTypeLabel,
} from "@/lib/stock-display";
import { productUsage, usageHint } from "@/lib/stock-usage";
import { formatBRL } from "@/lib/utils";
import {
  NEAR_EXPIRY_DAYS,
  productHasExpiredBatch,
  productIsNearExpiry,
  productNearestExpiryDays,
} from "@/lib/stock-validity";
import { useAppStore } from "@/store/useAppStore";
import type { Product, StockMovement, StockUsage } from "@/types";

type Filter = "todos" | "baixo" | "sem_controle";
type View = "itens" | "historico" | "fornecedores" | "etiquetas";
type SortKey = "nome" | "estoque" | "minimo" | "validade";
type SortDir = "asc" | "desc";

export default function EstoquePage() {
  const products = useAppStore((s) => s.products);
  const categories = useAppStore((s) => s.categories);
  const goodsReceipts = useAppStore((s) => s.goodsReceipts);
  const stockLedger = useAppStore((s) => s.stockLedger ?? []);
  const adjustStock = useAppStore((s) => s.adjustStock);
  const updateProduct = useAppStore((s) => s.updateProduct);
  const addProduct = useAppStore((s) => s.addProduct);
  const appendProductBatches = useAppStore((s) => s.appendProductBatches);

  const [view, setView] = useState<View>("itens");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [categoryFilter, setCategoryFilter] = useState<string>("todos");
  const [usageFilter, setUsageFilter] = useState<StockUsage | "todos">("todos");
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [histProductId, setHistProductId] = useState<string>("");
  const [adjustOpen, setAdjustOpen] = useState<Product | null>(null);
  const [delta, setDelta] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustKind, setAdjustKind] = useState<"entrada" | "saida">("entrada");
  const [inPackages, setInPackages] = useState("1");
  const [inUnitsPer, setInUnitsPer] = useState("1");
  const [inStockQty, setInStockQty] = useState("");
  const [editor, setEditor] = useState<{ open: boolean; mode: "create" | "edit"; product: Product | null }>({
    open: false,
    mode: "edit",
    product: null,
  });
  const [quickOpen, setQuickOpen] = useState(false);
  const [nfeOpen, setNfeOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("nome");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [stockPage, setStockPage] = useState(1);

  const rows = useMemo(() => {
    const term = q.trim();
    return products
      .filter((p) => {
        if (term && !productMatchesTextSearch(p, term)) return false;
        const tracked = p.trackStock !== false;
        const qty = p.stockQty ?? 0;
        const min = p.stockMin ?? 0;
        if (categoryFilter !== "todos" && p.categoryId !== categoryFilter) return false;
        if (usageFilter !== "todos" && productUsage(p) !== usageFilter) return false;
        if (filter === "baixo") return tracked && qty <= min;
        if (filter === "sem_controle") return !tracked;
        return true;
      })
      .sort((a, b) => {
        const ta = a.trackStock !== false;
        const tb = b.trackStock !== false;
        if (ta && !tb) return -1;
        if (!ta && tb) return 1;

        const dir = sortDir === "asc" ? 1 : -1;
        const qa = a.stockQty ?? 0;
        const qb = b.stockQty ?? 0;
        const ma = a.stockMin ?? 0;
        const mb = b.stockMin ?? 0;

        const keyCmp = () => {
          if (sortKey === "nome") return a.name.localeCompare(b.name, "pt-BR");
          if (sortKey === "estoque") return qa - qb;
          if (sortKey === "minimo") return ma - mb;
          // validade: menor diff primeiro (vencido < próximo < no prazo < sem validade)
          const ea = productNearestExpiryDays(a);
          const eb = productNearestExpiryDays(b);
          const na = ea == null ? Number.POSITIVE_INFINITY : ea;
          const nb = eb == null ? Number.POSITIVE_INFINITY : eb;
          return na - nb;
        };

        // Sempre prioriza zerados e abaixo do mínimo quando estiver ordenando por nome
        if (sortKey === "nome") {
          const lowA = ta && qa <= ma ? 0 : 1;
          const lowB = tb && qb <= mb ? 0 : 1;
          if (lowA !== lowB) return lowA - lowB;
        }

        const c = keyCmp();
        if (c !== 0) return c * dir;
        return a.name.localeCompare(b.name, "pt-BR");
      });
  }, [products, q, filter, categoryFilter, usageFilter, sortDir, sortKey]);

  const stockTotalPages = Math.max(1, Math.ceil(rows.length / STOCK_PAGE_SIZE));

  useEffect(() => {
    setStockPage(1);
  }, [q, filter, categoryFilter, usageFilter, sortKey, sortDir]);

  useEffect(() => {
    if (stockPage > stockTotalPages) setStockPage(stockTotalPages);
  }, [stockPage, stockTotalPages]);

  const pagedProducts = useMemo(() => {
    const start = (stockPage - 1) * STOCK_PAGE_SIZE;
    return rows.slice(start, start + STOCK_PAGE_SIZE);
  }, [rows, stockPage]);

  const categoryNameById = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const cfopByProduct = useMemo(() => {
    const map = new Map<string, string>();
    for (const receipt of [...goodsReceipts].reverse()) {
      for (const item of receipt.itens) {
        if (item.cfop) map.set(item.productId, item.cfop);
      }
    }
    return map;
  }, [goodsReceipts]);

  const onSort = (k: SortKey) => {
    setSortKey((prev) => {
      if (prev !== k) {
        setSortDir("asc");
        return k;
      }
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return prev;
    });
  };

  const stats = useMemo(() => {
    const tracked = products.filter((p) => p.trackStock !== false);
    const low = tracked.filter((p) => (p.stockQty ?? 0) <= (p.stockMin ?? 0));
    return {
      skus: tracked.length,
      low: low.length,
      ignored: products.length - tracked.length,
    };
  }, [products]);

  const ledgerRows = useMemo(() => {
    let list: StockMovement[] = stockLedger ?? [];
    if (histProductId) {
      list = list.filter((m) => m.productId === histProductId);
    }
    return list;
  }, [stockLedger, histProductId]);

  const resetAdjustForm = () => {
    setDelta("");
    setAdjustNote("");
    setAdjustKind("entrada");
    setInPackages("1");
    setInUnitsPer("1");
    setInStockQty("");
  };

  const applyDelta = () => {
    if (!adjustOpen) return;
    let n: number;
    if (adjustKind === "saida") {
      n = Number(String(delta).replace(",", ".").replace(/^\+/, ""));
      if (Number.isNaN(n) || n === 0) return;
      if (n > 0) n = -n;
    } else {
      const pkg = Number(String(inPackages).replace(",", "."));
      const factor = parseUnitsPerPackage(inUnitsPer, 1);
      const manual = inStockQty.trim();
      n = manual
        ? Number(manual.replace(",", "."))
        : stockQtyFromPackages(pkg, factor);
      if (Number.isNaN(n) || n <= 0) return;
    }
    adjustStock(adjustOpen.id, n, adjustNote.trim() || undefined);
    resetAdjustForm();
    setAdjustOpen(null);
  };

  return (
    <div className="p-6 lg:p-10">
      <header className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Operação · Estoque</p>
          <h1 className="font-display text-4xl text-zinc-50">Estoque</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Compras, insumos e mercadoria. Validade avisa a partir de {NEAR_EXPIRY_DAYS} dias.
            {stats.low > 0 ? ` ${stats.low} item(ns) no mínimo ou abaixo.` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setEditor({ open: true, mode: "create", product: null })}>
            <Plus className="h-4 w-4" />
            Novo produto
          </Button>
          <Button type="button" variant="secondary" onClick={() => setInventoryOpen(true)}>
            <ClipboardList className="h-4 w-4" />
            Inventário
          </Button>
          <Button type="button" onClick={() => setNfeOpen(true)}>
            <Truck className="h-4 w-4" />
            Importar XML
          </Button>
        </div>
      </header>

      <div className="mb-5 flex gap-6 border-b border-white/10 text-sm">
        {(
          [
            ["itens", "Itens"],
            ["historico", "Histórico (Kardex)"],
            ["fornecedores", "Fornecedores"],
            ["etiquetas", "Etiquetas"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={`border-b-2 pb-2 ${
              view === key ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "itens" && <StockOverview />}

      {view === "itens" && (
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar item, categoria ou CFOP..."
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ["todos", "Todos"],
                ["baixo", "Estoque baixo"],
                ["sem_controle", "Sem controle"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  filter === k
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-white/10 bg-zinc-900/40 text-zinc-400 shadow-card hover:bg-zinc-800/50"
                }`}
              >
                {label}
              </button>
            ))}
            <Button
              type="button"
              variant="secondary"
              className="border-brand/40 bg-brand-muted/30 text-brand-light hover:bg-brand-muted/50"
              onClick={() => setQuickOpen(true)}
            >
              Adição rápida (remessas)
            </Button>
          </div>
        </div>
      )}

      {view === "itens" && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Categoria</span>
          <select
            className="h-9 rounded-xl border border-white/10 bg-zinc-900/50 px-3 text-sm text-zinc-200"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="todos">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Tipo</span>
          {(
            [
              ["todos", "Tudo"],
              ["revenda", "Só revenda"],
              ["materia_prima", "Só matéria-prima"],
              ["consumo", "Só consumo"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setUsageFilter(key)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                usageFilter === key ? "bg-white/15 text-zinc-50" : "text-zinc-400 hover:bg-white/5"
              }`}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto text-xs text-zinc-500">
            {rows.length} {rows.length === 1 ? "produto" : "produtos"}
            {rows.length > STOCK_PAGE_SIZE ? ` · pág. ${stockPage}/${stockTotalPages}` : ""}
          </span>
        </div>
      )}

      {view === "historico" && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="max-w-xs flex-1">
            <label className="mb-1 block text-xs text-zinc-500">Filtrar por produto</label>
            <select
              className="w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-brand focus:ring-2 focus:ring-orange-500/25"
              value={histProductId}
              onChange={(e) => setHistProductId(e.target.value)}
            >
              <option value="">Todos os produtos</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-zinc-500 sm:pb-2">
            Até 500 movimentações mais recentes ficam salvas neste dispositivo.
          </p>
        </div>
      )}

      {view === "historico" && (
        <div className="overflow-hidden table-glass shadow-card">
          <div className="scrollbar-thin max-h-[min(70vh,720px)] overflow-y-auto overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-white/[0.08] bg-zinc-950/70 text-xs font-semibold uppercase tracking-wide text-zinc-500 backdrop-blur-md">
                <tr>
                  <th className="px-4 py-3">Data / hora</th>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3 text-right">Δ</th>
                  <th className="px-4 py-3 text-right">Saldo após</th>
                  <th className="px-4 py-3">Ref.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {ledgerRows.map((m) => (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-zinc-400">
                      {format(new Date(m.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-zinc-100">{m.productName}</span>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-400">
                      {STOCK_REASON_LABEL[m.reason]}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-mono tabular-nums ${
                        m.delta < 0 ? "text-red-400" : m.delta > 0 ? "text-emerald-400" : "text-zinc-500"
                      }`}
                    >
                      {m.delta > 0 ? `+${m.delta}` : String(m.delta)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-zinc-200 tabular-nums">
                      {m.balanceAfter}
                    </td>
                    <td className="max-w-[200px] px-4 py-2.5 text-xs text-zinc-500">
                      {m.reason === "venda_balcao" || m.reason === "venda_mesa" ? (
                        <span className="break-all">
                          Venda {m.saleId?.replace(/^sale_/, "#")}
                          {m.mesaId != null ? ` · Mesa ${m.mesaId}` : ""}
                        </span>
                      ) : m.reason === "entrada_remessa" ? (
                        <span className="break-all">{m.note ?? "Entrada de remessa"}</span>
                      ) : (
                        m.note ?? "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ledgerRows.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-zinc-500">
              Nenhuma movimentação registrada ainda.
            </p>
          )}
        </div>
      )}

      {view === "fornecedores" && <SupplierDirectory />}

      {view === "etiquetas" && <BarcodeLabelsPanel />}

      {view === "itens" && (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500">Nenhum item encontrado.</p>
          ) : (
            <>
            {rows.length > STOCK_PAGE_SIZE && (
              <div className="border-b border-white/[0.06] px-4 py-2.5">
                <TablePagination
                  page={stockPage}
                  pageSize={STOCK_PAGE_SIZE}
                  totalItems={rows.length}
                  onPageChange={setStockPage}
                  itemLabel="produtos"
                />
              </div>
            )}
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
                <thead className="border-b border-white/10 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-2.5">
                      <button type="button" className="inline-flex items-center gap-1 hover:text-zinc-300" onClick={() => onSort("nome")}>
                        Produto
                        <span className="text-[10px] opacity-70">{sortKey === "nome" ? (sortDir === "asc" ? "↑" : "↓") : ""}</span>
                      </button>
                    </th>
                    <th className="px-4 py-2.5">Categoria</th>
                    <th className="px-4 py-2.5">Tipo / CFOP</th>
                    <th className="px-4 py-2.5">
                      <button type="button" className="inline-flex items-center gap-1 hover:text-zinc-300" onClick={() => onSort("estoque")}>
                        Qtd
                        <span className="text-[10px] opacity-70">{sortKey === "estoque" ? (sortDir === "asc" ? "↑" : "↓") : ""}</span>
                      </button>
                    </th>
                    <th className="px-4 py-2.5">Unid.</th>
                    <th className="px-4 py-2.5">Custo</th>
                    <th className="px-4 py-2.5">Venda</th>
                    <th className="px-4 py-2.5">Lucro</th>
                    <th className="px-4 py-2.5">Entrada</th>
                    <th className="px-4 py-2.5">
                      <button type="button" className="inline-flex items-center gap-1 hover:text-zinc-300" onClick={() => onSort("validade")}>
                        Status
                        <span className="text-[10px] opacity-70">{sortKey === "validade" ? (sortDir === "asc" ? "↑" : "↓") : ""}</span>
                      </button>
                    </th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
          {pagedProducts.flatMap((p) => stockTableRows(p)).map((row) => {
                    const p = row.product;
                    const tracked = p.trackStock !== false;
                    const qty = row.qty;
                    const min = p.stockMin ?? 0;
                    const low = tracked && (p.stockQty ?? 0) <= min;
                    const zero = tracked && qty <= 0;
                    const exp = tracked && productHasExpiredBatch(p);
                    const near = tracked && !exp && productIsNearExpiry(p);
                    const cfop = cfopByProduct.get(p.id) ?? p.fiscal?.cfop;
                    const unitLbl = unitTypeLabel(p);
                    const usage = productUsage(p);
                    const profit = profitUnitAmount(p);
                    const isRemessa = Boolean(row.batch);
                    return (
                      <tr key={row.key} className="border-t border-white/[0.06]">
                        <td className="px-4 py-2.5">
                          <div className={isRemessa ? "pl-3 border-l-2 border-brand/30" : ""}>
                            <p className="font-medium text-zinc-100">{p.name}</p>
                            <p className="text-[11px] text-zinc-500">
                              {isRemessa ? "Remessa" : usageHint(usage)}
                              {!p.active ? " · inativo no PDV" : ""}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-zinc-400">
                          {categoryNameById.get(p.categoryId) ?? "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <UsageSelect
                              compact
                              ariaLabel={`Finalidade de ${p.name}`}
                              value={usage}
                              onChange={(next) => updateProduct(p.id, { usage: next })}
                            />
                            {cfop ? <span className="text-xs text-zinc-400">CFOP {cfop}</span> : null}
                          </div>
                        </td>
                        <td
                          className={`px-4 py-2.5 font-mono font-medium ${zero ? "text-red-300" : low ? "text-amber-200" : "text-zinc-100"}`}
                        >
                          {tracked ? qty : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-zinc-400">{tracked ? unitLbl : "—"}</td>
                        <td className="px-4 py-2.5 text-zinc-300 tabular-nums">
                          {p.costPrice != null && p.costPrice > 0 ? formatBRL(p.costPrice) : "—"}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums">
                          {usage === "revenda" && p.price > 0 ? (
                            <span className="text-primary">{formatBRL(p.price)}</span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums">
                          {profit != null && usage === "revenda" ? (
                            <span className="font-medium text-emerald-300/95">{formatBRL(profit)}</span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-zinc-400">
                          {formatEntryDate(row.batch?.receivedAt)}
                        </td>
                        <td className="px-4 py-2.5">
                          {!tracked ? (
                            <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400">sem controle</span>
                          ) : exp ? (
                            <span className="rounded-md bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-300">Vencido</span>
                          ) : near ? (
                            <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-200">A vencer</span>
                          ) : low ? (
                            <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-200">Baixo</span>
                          ) : (
                            <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">Estável</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              type="button"
                              disabled={!tracked}
                              className="text-sm font-medium text-primary disabled:opacity-30"
                              onClick={() => {
                                if (!tracked) return;
                                resetAdjustForm();
                                setAdjustOpen(p);
                              }}
                            >
                              Ajustar
                            </button>
                            <button
                              type="button"
                              className="text-zinc-500 hover:text-zinc-200"
                              title="Editar cadastro"
                              onClick={() => setEditor({ open: true, mode: "edit", product: p })}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {rows.length > STOCK_PAGE_SIZE && (
              <div className="border-t border-white/[0.06] px-4 py-2.5">
                <TablePagination
                  page={stockPage}
                  pageSize={STOCK_PAGE_SIZE}
                  totalItems={rows.length}
                  onPageChange={setStockPage}
                  itemLabel="produtos"
                />
              </div>
            )}
            </>
          )}
        </div>
      )}

      {adjustOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="panel-glass w-full max-w-md p-6 shadow-xl">
            <div className="panel-glass-inner">
            <h3 className="text-lg font-semibold text-zinc-100">Ajuste — {adjustOpen.name}</h3>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${
                  adjustKind === "entrada" ? "bg-brand text-white" : "border border-white/10 text-zinc-400"
                }`}
                onClick={() => setAdjustKind("entrada")}
              >
                Entrada
              </button>
              <button
                type="button"
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${
                  adjustKind === "saida" ? "bg-brand text-white" : "border border-white/10 text-zinc-400"
                }`}
                onClick={() => setAdjustKind("saida")}
              >
                Saída
              </button>
            </div>
            {adjustKind === "entrada" ? (
              <div className="mt-4">
                <PackageToStockFields
                  nfUnitLabel="emb."
                  packageQty={Number(String(inPackages).replace(",", ".")) || 0}
                  onPackageQtyChange={(v) => {
                    setInPackages(v);
                    const pkg = Number(String(v).replace(",", ".")) || 0;
                    setInStockQty(
                      String(stockQtyFromPackages(pkg, parseUnitsPerPackage(inUnitsPer, 1))),
                    );
                  }}
                  unitsPerPackage={inUnitsPer}
                  onUnitsPerPackageChange={(v) => {
                    setInUnitsPer(v);
                    const pkg = Number(String(inPackages).replace(",", ".")) || 0;
                    setInStockQty(String(stockQtyFromPackages(pkg, parseUnitsPerPackage(v, 1))));
                  }}
                  stockQty={inStockQty}
                  onStockQtyChange={setInStockQty}
                />
              </div>
            ) : (
              <>
                <p className="mt-2 text-xs text-zinc-500">Quantidade que sai do estoque (unidades de venda).</p>
                <Input
                  className="mt-2"
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                  placeholder="Ex.: 12"
                  autoFocus
                />
              </>
            )}
            <div className="mt-3">
              <label className="mb-1 block text-xs text-zinc-500">Observação (opcional)</label>
              <Input
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="Ex.: Compra fornecedor X"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" onClick={applyDelta}>
                Aplicar
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setAdjustOpen(null);
                  resetAdjustForm();
                }}
              >
                Cancelar
              </Button>
            </div>
            </div>
          </div>
        </div>
      )}

      <InventoryReportModal open={inventoryOpen} onClose={() => setInventoryOpen(false)} />

      <ImportNfeModal open={nfeOpen} onClose={() => setNfeOpen(false)} />

      <QuickReceiveModal
        open={quickOpen}
        products={products}
        categories={categories}
        onClose={() => setQuickOpen(false)}
        onConfirm={(productId, entries, note) => appendProductBatches(productId, entries, note)}
      />

      <ProductEditorModal
        open={editor.open}
        mode={editor.mode}
        product={editor.product}
        categories={categories}
        onClose={() => setEditor({ open: false, mode: "edit", product: null })}
        onSave={(payload) => {
          if (payload.id) {
            const { id, ...rest } = payload;
            updateProduct(id, rest);
            return;
          }
          const { id: _id, ...rest } = payload;
          addProduct(rest);
        }}
      />
    </div>
  );
}
