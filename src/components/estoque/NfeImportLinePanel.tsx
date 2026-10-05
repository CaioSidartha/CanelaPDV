"use client";

import { useState } from "react";
import { ProductLinkSearch } from "@/components/estoque/ProductLinkSearch";
import { PackageToStockFields } from "@/components/estoque/PackageToStockFields";
import { UsageSelect } from "@/components/estoque/UsageSelect";
import { CostChangeBanner } from "@/components/products/CostChangeBanner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { suggestCategoryId } from "@/lib/category-suggest";
import {
  parseUnitsPerPackage,
  saleUnitCostFromNf,
  suggestUnitsPerNfUnit,
  stockQtyFromPackages,
} from "@/lib/stock-package-entry";
import { nfeUnitToSaleUnit } from "@/lib/product-sale-unit";
import { inferUsageFromCfop, productUsage } from "@/lib/stock-usage";
import { findActiveProductByBarcode } from "@/lib/product-catalog";
import { parseMoneyInput, profitFromCostAndSale, saleFromCostAndMarkup } from "@/lib/product-pricing";
import { SALE_UNIT_LABELS } from "@/lib/product-sale-unit";
import { formatBRL } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { Product, ProductSaleUnit, StockUsage } from "@/types";

const fieldLabel = "mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-brand-light/90";
const hintText = "text-[11px] leading-snug text-amber-100/85";
const metaText = "text-[11px] text-zinc-300/90";

export type NfeLineStatus = "linked" | "unlinked" | "registered";

export type ImportDraftLine = {
  descricao: string;
  ean?: string;
  ncm?: string;
  cfop?: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  productId: string;
  criarNovo: boolean;
  status: NfeLineStatus;
  nomeNovo: string;
  categoryId: string;
  precoVenda: string;
  usage: StockUsage;
  saleUnit: ProductSaleUnit;
  infAdProd?: string;
  unitsPerPackage: string;
  costUnitAccepted?: number;
};

export function unitCostForLine(line: ImportDraftLine): number {
  const factor = parseUnitsPerPackage(line.unitsPerPackage, 1);
  const fromNota = saleUnitCostFromNf(line.valorUnitario, factor);
  if (line.costUnitAccepted != null && line.costUnitAccepted > 0) return line.costUnitAccepted;
  return fromNota;
}

type Props = {
  line: ImportDraftLine;
  markupPercent: number;
  onChange: (patch: Partial<ImportDraftLine>) => void;
  onCadastrar: () => void;
};

function applyProductLink(
  id: string,
  line: ImportDraftLine,
  products: Product[],
  onChange: (patch: Partial<ImportDraftLine>) => void,
) {
  if (!id) {
    onChange({
      productId: "",
      criarNovo: true,
      status: "unlinked",
      costUnitAccepted: undefined,
    });
    return;
  }
  const p = products.find((x) => x.id === id);
  onChange({
    productId: id,
    criarNovo: false,
    status: line.status === "registered" ? "registered" : "linked",
    nomeNovo: p?.name ?? line.nomeNovo,
    categoryId: p?.categoryId ?? line.categoryId,
    precoVenda: p ? String(p.price).replace(".", ",") : line.precoVenda,
    saleUnit: p ? nfeUnitToSaleUnit(p.fiscal?.unidade_comercial ?? line.unidade) : line.saleUnit,
    usage: p ? productUsage(p) : line.usage,
    costUnitAccepted: undefined,
  });
}

export function NfeImportLinePanel({ line, markupPercent, onChange, onCadastrar }: Props) {
  const products = useAppStore((s) => s.products);
  const categories = useAppStore((s) => s.categories);
  const activeProducts = products.filter((p) => p.active).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const addCategory = useAppStore((s) => s.addCategory);
  const [newCat, setNewCat] = useState("");
  const [addingCat, setAddingCat] = useState(false);

  const product = line.productId ? products.find((p) => p.id === line.productId) : undefined;
  const unitCost = unitCostForLine(line);
  const factor = parseUnitsPerPackage(line.unitsPerPackage, 1);
  const fromNota = saleUnitCostFromNf(line.valorUnitario, factor);
  const registeredCost = product?.costPrice ?? 0;
  const stockIn = stockQtyFromPackages(line.quantidade, factor);

  const saleNum = parseMoneyInput(line.precoVenda);
  const profit = unitCost > 0 && saleNum > 0 ? profitFromCostAndSale(unitCost, saleNum) : 0;

  const applyNotaCost = () => {
    const suggested = saleFromCostAndMarkup(fromNota, markupPercent);
    onChange({
      costUnitAccepted: fromNota,
      precoVenda: String(suggested).replace(".", ","),
    });
  };

  const suggestSale = () => {
    if (unitCost <= 0) return;
    onChange({ precoVenda: String(saleFromCostAndMarkup(unitCost, markupPercent)).replace(".", ",") });
  };

  const selectClass =
    "h-8 w-full rounded-lg border border-white/15 bg-zinc-950 px-2 text-xs text-zinc-100";

  const showUnlinkedHint = line.status === "unlinked" && !line.productId;

  return (
    <div className="flex h-[248px] shrink-0 flex-col border-t border-brand/20 bg-zinc-950/95 px-3 py-2 shadow-[0_-8px_24px_rgba(0,0,0,0.35)]">
      <div className="mb-1.5 flex shrink-0 items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className={fieldLabel}>Item selecionado</p>
          <p className="truncate text-xs font-medium text-zinc-50" title={line.descricao}>{line.descricao}</p>
          <p className={metaText}>
            {line.quantidade} {line.unidade} → <span className="text-emerald-300/90">+{stockIn} un.</span>
            <span className="text-zinc-500"> · </span>
            custo un. <span className="font-mono text-brand-light/95">{formatBRL(fromNota)}</span>
          </p>
        </div>
        {line.status === "unlinked" && !line.productId ? (
          <Button type="button" className="h-8 shrink-0 px-3 text-xs" onClick={onCadastrar}>
            Cadastrar novo
          </Button>
        ) : null}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 xl:grid-cols-3">
        <PackageToStockFields
          fill
          accentTitle
          nfUnitLabel={line.unidade}
          packageQty={line.quantidade}
          unitsPerPackage={line.unitsPerPackage}
          onUnitsPerPackageChange={(v) => onChange({ unitsPerPackage: v, costUnitAccepted: undefined })}
          nfUnitCost={line.valorUnitario}
        />

        <div className="flex h-full min-h-0 flex-col rounded-lg border border-white/10 bg-zinc-900/50 p-2">
          <p className={fieldLabel}>Vínculo no estoque</p>
          <p className={`mb-1 min-h-[2rem] ${showUnlinkedHint ? hintText : "invisible text-[11px]"}`}>
            Sem match automático — busque ou cadastre.
          </p>
          <ProductLinkSearch
            products={activeProducts}
            selectedId={line.productId}
            onSelect={(id) => applyProductLink(id, line, products, onChange)}
          />
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            <div className="col-span-3 flex flex-wrap items-end gap-1 sm:col-span-1">
              <div className="min-w-0 flex-1">
                <label className={fieldLabel}>Categoria</label>
                <select
                  className={selectClass}
                  value={line.categoryId}
                  onChange={(e) => onChange({ categoryId: e.target.value })}
                  disabled={line.status !== "unlinked" && Boolean(product)}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {addingCat ? (
                <div className="flex gap-1">
                  <Input
                    className="h-8 w-24 text-xs"
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                    placeholder="Nova"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const id = addCategory(newCat);
                        if (id) {
                          onChange({ categoryId: id });
                          setNewCat("");
                          setAddingCat(false);
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 px-2 text-xs"
                    onClick={() => {
                      const id = addCategory(newCat);
                      if (id) {
                        onChange({ categoryId: id });
                        setNewCat("");
                        setAddingCat(false);
                      }
                    }}
                  >
                    Ok
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 shrink-0 px-2 text-xs"
                  disabled={line.status !== "unlinked" && Boolean(product)}
                  onClick={() => setAddingCat(true)}
                >
                  Cad.
                </Button>
              )}
            </div>
            <div>
              <label className={fieldLabel}>Finalidade</label>
              <UsageSelect compact value={line.usage} onChange={(u) => onChange({ usage: u })} ariaLabel="Finalidade" />
            </div>
            <div>
              <label className={fieldLabel}>Un. venda</label>
              <select
                className={selectClass}
                value={line.saleUnit}
                onChange={(e) => onChange({ saleUnit: e.target.value as ProductSaleUnit })}
              >
                {(Object.keys(SALE_UNIT_LABELS) as ProductSaleUnit[]).map((k) => (
                  <option key={k} value={k}>{SALE_UNIT_LABELS[k]}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex h-full min-h-0 flex-col gap-1.5">
          <CostChangeBanner
            reserveSlot
            registeredCost={product && registeredCost > 0 ? registeredCost : 0}
            notaCost={fromNota}
            onApplyNotaCost={applyNotaCost}
          />
          <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-white/10 bg-zinc-900/50 p-2">
            <p className={fieldLabel}>Preços (un. venda)</p>
            <p className={`mb-1 min-h-[1rem] ${product ? metaText : "invisible"}`}>
              Cadastro: {formatBRL(registeredCost)} → PDV {product ? formatBRL(product.price) : "—"}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-zinc-400">Custo</span>
                <p className="font-mono text-xs text-zinc-100">{formatBRL(unitCost)}</p>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400">Lucro</span>
                <p className="font-mono text-xs text-emerald-300">{formatBRL(profit)}</p>
              </div>
              <div>
                <label className={fieldLabel}>Venda PDV</label>
                <Input
                  className="h-7 text-xs"
                  value={line.precoVenda}
                  onChange={(e) => onChange({ precoVenda: e.target.value })}
                  inputMode="decimal"
                />
              </div>
            </div>
            <p className="mt-1 min-h-[1rem]">
              {unitCost > 0 && line.usage === "revenda" ? (
                <button
                  type="button"
                  className="text-[11px] font-medium text-brand-light hover:underline"
                  onClick={suggestSale}
                >
                  Sugestão {markupPercent}% → {formatBRL(saleFromCostAndMarkup(unitCost, markupPercent))}
                </button>
              ) : (
                <span className="invisible text-[11px]">—</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function buildDraftFromNfeItem(
  item: {
    descricao: string;
    ean?: string;
    ncm?: string;
    cfop?: string;
    unidade: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    infAdProd?: string;
  },
  categories: { id: string; name: string }[],
  products: Product[],
  markupPercent: number,
): ImportDraftLine {
  const byBarcode = item.ean ? findActiveProductByBarcode(products, item.ean) : undefined;
  const norm = (s: string) => s.trim().toLowerCase();
  const byName = products.find((p) => p.active && norm(p.name) === norm(item.descricao));
  const hit = byBarcode ?? byName;
  const unitsPerPackage = String(suggestUnitsPerNfUnit(item.descricao, item.infAdProd, item.unidade));
  const factor = parseUnitsPerPackage(unitsPerPackage, 1);
  const unitCost = saleUnitCostFromNf(item.valorUnitario, factor);
  const suggestedCat = suggestCategoryId(item.descricao, categories) ?? categories[0]?.id ?? "";
  const suggestedPrice = unitCost > 0 ? saleFromCostAndMarkup(unitCost, markupPercent) : item.valorUnitario;

  return {
    descricao: item.descricao,
    ean: item.ean,
    ncm: item.ncm,
    cfop: item.cfop,
    unidade: item.unidade,
    quantidade: item.quantidade,
    valorUnitario: item.valorUnitario,
    valorTotal: item.valorTotal,
    infAdProd: item.infAdProd,
    productId: hit?.id ?? "",
    criarNovo: !hit,
    status: hit ? "linked" : "unlinked",
    nomeNovo: item.descricao,
    categoryId: hit?.categoryId ?? suggestedCat,
    precoVenda: String((hit?.price ?? suggestedPrice).toFixed(2)).replace(".", ","),
    usage: hit ? productUsage(hit) : inferUsageFromCfop(item.cfop),
    saleUnit: hit ? nfeUnitToSaleUnit(hit.fiscal?.unidade_comercial ?? item.unidade) : nfeUnitToSaleUnit(item.unidade),
    unitsPerPackage,
  };
}
