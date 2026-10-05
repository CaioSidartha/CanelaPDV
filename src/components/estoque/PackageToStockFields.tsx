"use client";

import { Input } from "@/components/ui/Input";
import {
  parseUnitsPerPackage,
  saleUnitCostFromNf,
  stockQtyFromPackages,
} from "@/lib/stock-package-entry";
import { formatBRL } from "@/lib/utils";

type Props = {
  /** UN, CX, PCT… ou "emb." no ajuste manual */
  nfUnitLabel: string;
  packageQty: number;
  onPackageQtyChange?: (value: string) => void;
  unitsPerPackage: string;
  onUnitsPerPackageChange: (value: string) => void;
  nfUnitCost?: number;
  /** Total de unidades de venda (editável na baixa / conferência) */
  stockQty?: string;
  onStockQtyChange?: (value: string) => void;
  compact?: boolean;
  accentTitle?: boolean;
  /** Preenche a coluna do painel de importação (altura total). */
  fill?: boolean;
};

export function PackageToStockFields({
  nfUnitLabel,
  packageQty,
  onPackageQtyChange,
  unitsPerPackage,
  onUnitsPerPackageChange,
  nfUnitCost,
  stockQty,
  onStockQtyChange,
  compact,
  accentTitle,
  fill,
}: Props) {
  const factor = parseUnitsPerPackage(unitsPerPackage, 1);
  const pkg = Number.isFinite(packageQty) ? packageQty : 0;
  const autoStock = stockQtyFromPackages(pkg, factor);
  const stockDisplay =
    stockQty != null && stockQty !== "" && onStockQtyChange
      ? Number(String(stockQty).replace(",", "."))
      : autoStock;
  const stockFinite = Number.isFinite(stockDisplay) ? stockDisplay : autoStock;
  const unitCost = nfUnitCost != null ? saleUnitCostFromNf(nfUnitCost, factor) : undefined;

  const text = fill ? "text-sm" : compact ? "text-[10px]" : "text-xs";
  const inputH = fill ? "h-9" : "h-7";

  return (
    <div
      className={`rounded-lg border border-white/10 bg-zinc-950/40 ${fill ? "flex h-full flex-col justify-center gap-3 p-3" : "space-y-1.5 p-2"} ${text}`}
    >
      <p
        className={`font-semibold uppercase tracking-wide ${
          accentTitle ? (fill ? "text-xs text-brand-light" : "text-[10px] text-brand-light/90") : "font-medium text-zinc-400"
        }`}
      >
        Unidade de venda no estoque
      </p>
      <div className={`flex flex-wrap items-center gap-2 text-zinc-200 ${fill ? "text-sm" : ""}`}>
        <span className={accentTitle ? "text-zinc-400" : "text-zinc-500"}>Na nota/compra:</span>
        {onPackageQtyChange ? (
          <Input
            className={`${inputH} w-16 px-2 font-mono text-xs`}
            value={String(packageQty)}
            inputMode="decimal"
            onChange={(e) => onPackageQtyChange(e.target.value)}
          />
        ) : (
          <span className={`font-mono font-semibold text-zinc-100 ${fill ? "text-base" : ""}`}>{packageQty}</span>
        )}
        <span className="text-zinc-500">{nfUnitLabel}</span>
        <span className="text-zinc-600">×</span>
        <Input
          className={`${inputH} w-16 px-2 font-mono text-xs`}
          value={unitsPerPackage}
          inputMode="decimal"
          onChange={(e) => onUnitsPerPackageChange(e.target.value)}
          aria-label="Unidades de venda por embalagem"
        />
        <span className="text-zinc-500">un./{nfUnitLabel}</span>
      </div>
      <div className={`flex flex-wrap items-center gap-2 ${fill ? "text-sm" : ""}`}>
        <span className="font-medium text-emerald-300/95">→ Estoque:</span>
        {onStockQtyChange ? (
          <Input
            className={`${inputH} w-20 px-2 font-mono text-xs`}
            value={stockQty ?? String(autoStock)}
            inputMode="decimal"
            onChange={(e) => onStockQtyChange(e.target.value)}
          />
        ) : (
          <span className={`font-mono font-semibold text-emerald-200 ${fill ? "text-lg" : ""}`}>{stockFinite}</span>
        )}
        <span className="text-zinc-500">un. de venda</span>
      </div>
      {unitCost != null && unitCost > 0 ? (
        <p className={accentTitle ? (fill ? "text-sm text-brand-light" : "text-brand-light/80") : "text-zinc-500"}>
          Custo/un. venda: <span className={`font-mono font-semibold ${fill ? "text-base" : ""}`}>{formatBRL(unitCost)}</span>
        </p>
      ) : null}
    </div>
  );
}
