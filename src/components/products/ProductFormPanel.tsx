"use client";

import { useEffect, useMemo, useState } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { defaultFiscalFields } from "@/lib/default-fiscal";
import {
  DEFAULT_MARKUP_PERCENT,
  parseMoneyInput,
  profitFromCostAndSale,
  roundMoney,
  saleFromCostAndMarkup,
} from "@/lib/product-pricing";
import { SALE_UNIT_LABELS, saleUnitToFiscal } from "@/lib/product-sale-unit";
import { STOCK_USAGES, STOCK_USAGE_LABEL } from "@/lib/stock-usage";
import { BarcodeField } from "@/components/products/BarcodeField";
import { useAppStore } from "@/store/useAppStore";
import type { ProductSaleUnit, StockUsage } from "@/types";
import { formatBRL } from "@/lib/utils";

export type ProductFormValues = {
  name: string;
  barcode: string;
  categoryId: string;
  saleUnit: ProductSaleUnit;
  usage: StockUsage;
  costPrice: number;
  price: number;
  stockMin: number;
  imageUrl: string;
  active: boolean;
  onPromotion: boolean;
  promoPrice: number;
  referenceBarcode?: string;
  barcodeCustomized?: boolean;
};

type Props = {
  initial?: Partial<ProductFormValues> & { ncm?: string; cfop?: string; referenceBarcode?: string };
  markupPercent?: number;
  onCancel?: () => void;
  onSubmit: (values: ProductFormValues & { ncm?: string; cfop?: string }) => void;
  submitLabel?: string;
  compact?: boolean;
  /** Abas Produto + Promoção (modal de cadastro/edição). */
  showPromotionTab?: boolean;
};

export function ProductFormPanel({
  initial,
  markupPercent: markupProp,
  onCancel,
  onSubmit,
  submitLabel = "Salvar produto",
  compact,
  showPromotionTab = false,
}: Props) {
  const categories = useAppStore((s) => s.categories);
  const addCategory = useAppStore((s) => s.addCategory);
  const companyMarkup = useAppStore((s) => s.company.defaultMarkupPercent ?? DEFAULT_MARKUP_PERCENT);
  const markupPercent = markupProp ?? companyMarkup;

  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saleUnit, setSaleUnit] = useState<ProductSaleUnit>("unidade");
  const [usage, setUsage] = useState<StockUsage>("revenda");
  const [cost, setCost] = useState("");
  const [sale, setSale] = useState("");
  const [profit, setProfit] = useState("");
  const [stockMin, setStockMin] = useState("0");
  const [imageUrl, setImageUrl] = useState("");
  const [active, setActive] = useState(true);
  const [newCat, setNewCat] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [tab, setTab] = useState<"produto" | "promocao">("produto");
  const [onPromotion, setOnPromotion] = useState(false);
  const [promoPrice, setPromoPrice] = useState("");
  const [referenceBarcode, setReferenceBarcode] = useState("");
  const [barcodeGenerated, setBarcodeGenerated] = useState(false);

  useEffect(() => {
    const c = initial?.costPrice ?? 0;
    const p = initial?.price ?? (c > 0 ? saleFromCostAndMarkup(c, markupPercent) : 0);
    setName(initial?.name ?? "");
    setBarcode(initial?.barcode ?? "");
    setCategoryId(initial?.categoryId ?? categories[0]?.id ?? "");
    setSaleUnit(initial?.saleUnit ?? "unidade");
    setUsage(initial?.usage ?? "revenda");
    setCost(c > 0 ? String(c).replace(".", ",") : "");
    setSale(p > 0 ? String(p).replace(".", ",") : "");
    setProfit(c > 0 && p > 0 ? String(roundMoney(p - c)).replace(".", ",") : "");
    setStockMin(String(initial?.stockMin ?? 0));
    setImageUrl(initial?.imageUrl ?? "");
    setActive(initial?.active ?? true);
    setOnPromotion(!!initial?.onPromotion);
    setPromoPrice(
      initial?.promoPrice != null && initial.promoPrice > 0
        ? String(initial.promoPrice).replace(".", ",")
        : "",
    );
    setTab("produto");
    setReferenceBarcode(initial?.referenceBarcode ?? "");
    setBarcodeGenerated(false);
  }, [initial, categories, markupPercent]);

  const normBarcode = (s: string) => s.replace(/\D/g, "");

  const costNum = parseMoneyInput(cost);
  const saleNum = parseMoneyInput(sale);
  const suggested = useMemo(
    () => (costNum > 0 ? saleFromCostAndMarkup(costNum, markupPercent) : 0),
    [costNum, markupPercent],
  );

  const syncFromCost = (nextCost: string) => {
    setCost(nextCost);
    const c = parseMoneyInput(nextCost);
    if (c <= 0) return;
    const s = saleFromCostAndMarkup(c, markupPercent);
    setSale(String(s).replace(".", ","));
    setProfit(String(roundMoney(s - c)).replace(".", ","));
  };

  const syncFromProfit = (nextProfit: string) => {
    setProfit(nextProfit);
    const pr = parseMoneyInput(nextProfit);
    const c = parseMoneyInput(cost);
    if (c <= 0) return;
    const s = roundMoney(c + pr);
    setSale(String(s).replace(".", ","));
  };

  const syncFromSale = (nextSale: string) => {
    setSale(nextSale);
    const s = parseMoneyInput(nextSale);
    const c = parseMoneyInput(cost);
    if (c <= 0) return;
    setProfit(String(profitFromCostAndSale(c, s)).replace(".", ","));
  };

  const applySuggested = () => {
    if (suggested <= 0) return;
    setSale(String(suggested).replace(".", ","));
    if (costNum > 0) {
      setProfit(String(roundMoney(suggested - costNum)).replace(".", ","));
    }
  };

  const submit = () => {
    if (!name.trim() || !categoryId) return;
    const price = parseMoneyInput(sale);
    if (price <= 0 && usage === "revenda") return;
    const promoNum = parseMoneyInput(promoPrice);
    const promoOk = onPromotion && promoNum >= 0 && !Number.isNaN(promoNum);
    const code = barcode.trim();
    const ref = referenceBarcode.trim();
    const customized =
      barcodeGenerated ||
      (ref ? normBarcode(ref) !== normBarcode(code) && code.length > 0 : barcodeGenerated);
    onSubmit({
      name: name.trim(),
      barcode: code,
      referenceBarcode: ref || undefined,
      barcodeCustomized: customized && code.length > 0,
      categoryId,
      saleUnit,
      usage,
      costPrice: costNum,
      price: usage === "revenda" ? price : 0,
      stockMin: Math.max(0, parseMoneyInput(stockMin)),
      imageUrl: imageUrl.trim(),
      active,
      onPromotion: promoOk,
      promoPrice: promoOk ? promoNum : 0,
      ncm: initial?.ncm,
      cfop: initial?.cfop,
    });
  };

  const pad = compact ? "p-4" : "p-5";
  const promoNum = parseMoneyInput(promoPrice);
  const promoDiscountPct =
    onPromotion && promoNum > 0 && saleNum > 0 && promoNum < saleNum
      ? roundMoney(((saleNum - promoNum) / saleNum) * 100)
      : null;

  const tabBtn = (id: "produto" | "promocao", label: string) => (
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

  return (
    <div className={`panel-glass ${pad}`}>
      {showPromotionTab ? (
        <div className="mb-4 flex gap-2 border-b border-white/10 pb-3">
          {tabBtn("produto", "Produto")}
          {tabBtn("promocao", "Promoção")}
        </div>
      ) : null}

      {showPromotionTab && tab === "promocao" ? (
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Preço normal do PDV:{" "}
            <span className="font-mono font-medium text-zinc-100">
              {saleNum > 0 ? formatBRL(saleNum) : "—"}
            </span>
            {usage !== "revenda" ? (
              <span className="ml-2 text-xs text-amber-200/80">(item não é revenda — promoção só no caixa)</span>
            ) : null}
          </p>
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
              onPromotion ? "border-brand/50 bg-brand/10" : "border-white/10 bg-zinc-950/30"
            }`}
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={onPromotion}
              onChange={(e) => setOnPromotion(e.target.checked)}
              disabled={usage !== "revenda"}
            />
            <span>
              <span className="block font-medium text-zinc-100">Em promoção no PDV</span>
              <span className="text-xs text-zinc-500">
                O caixa e o cardápio usam o preço promocional enquanto estiver ativo.
              </span>
            </span>
          </label>
          {onPromotion ? (
            <div className="max-w-xs">
              <label className="mb-1 block text-xs font-medium text-brand-light">Preço promocional (R$)</label>
              <Input
                value={promoPrice}
                onChange={(e) => setPromoPrice(e.target.value)}
                inputMode="decimal"
                placeholder="Ex.: 2,99"
              />
              {promoDiscountPct != null ? (
                <p className="mt-2 text-xs text-emerald-300/90">
                  Desconto de {promoDiscountPct}% em relação ao preço de venda.
                </p>
              ) : null}
              {onPromotion && promoNum > 0 && saleNum > 0 && promoNum >= saleNum ? (
                <p className="mt-2 text-xs text-amber-200/90">
                  O promocional deve ser menor que o preço de venda ({formatBRL(saleNum)}).
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <Button type="button" onClick={submit}>{submitLabel}</Button>
            {onCancel ? (
              <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
            ) : null}
          </div>
        </div>
      ) : (
      <div className="flex flex-col gap-4 lg:flex-row">
        <aside className="flex flex-col items-center gap-2 lg:w-36">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-zinc-950/60">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs text-zinc-600">Sem foto</span>
            )}
          </div>
          <label className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 px-2 py-1.5 text-[10px] text-zinc-400 hover:border-brand/40">
            <ImagePlus className="h-3.5 w-3.5" />
            Foto
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === "string") setImageUrl(reader.result);
                };
                reader.readAsDataURL(f);
              }}
            />
          </label>
          <Input
            className="text-[10px]"
            placeholder="URL da imagem"
            value={imageUrl.startsWith("data:") ? "" : imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </aside>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <BarcodeField
                value={barcode}
                referenceHint={referenceBarcode || undefined}
                onChange={(v, meta) => {
                  setBarcode(v);
                  if (meta?.generated) setBarcodeGenerated(true);
                }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Unidade de venda</label>
              <select
                className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
                value={saleUnit}
                onChange={(e) => setSaleUnit(e.target.value as ProductSaleUnit)}
              >
                {(Object.keys(SALE_UNIT_LABELS) as ProductSaleUnit[]).map((k) => (
                  <option key={k} value={k}>{SALE_UNIT_LABELS[k]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-500">Descrição</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[160px] flex-1">
              <label className="mb-1 block text-xs text-zinc-500">Grupo (categoria)</label>
              <select
                className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {!categoryId && <option value="">Selecione…</option>}
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {addingCat ? (
              <div className="flex gap-1">
                <Input
                  className="h-10 w-32"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  placeholder="Nova categoria"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const id = addCategory(newCat);
                      if (id) {
                        setCategoryId(id);
                        setNewCat("");
                        setAddingCat(false);
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10"
                  onClick={() => {
                    const id = addCategory(newCat);
                    if (id) {
                      setCategoryId(id);
                      setNewCat("");
                      setAddingCat(false);
                    }
                  }}
                >
                  Ok
                </Button>
              </div>
            ) : (
              <Button type="button" variant="secondary" className="h-10 shrink-0" onClick={() => setAddingCat(true)}>
                Cad.
              </Button>
            )}
          </div>

          <div className="grid gap-3 rounded-xl border border-white/10 bg-zinc-950/40 p-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-[10px] uppercase text-zinc-500">Preço compra</label>
              <Input value={cost} onChange={(e) => syncFromCost(e.target.value)} inputMode="decimal" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase text-zinc-500">Lucro (R$)</label>
              <Input value={profit} onChange={(e) => syncFromProfit(e.target.value)} inputMode="decimal" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase text-zinc-500">Preço venda</label>
              <Input value={sale} onChange={(e) => syncFromSale(e.target.value)} inputMode="decimal" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase text-zinc-500">Est. mínimo</label>
              <Input value={stockMin} onChange={(e) => setStockMin(e.target.value)} inputMode="decimal" />
            </div>
            {suggested > 0 && usage === "revenda" ? (
              <p className="sm:col-span-4 text-xs text-zinc-400">
                Sugestão ({markupPercent}% markup):{" "}
                <button type="button" className="font-medium text-brand-light hover:underline" onClick={applySuggested}>
                  {formatBRL(suggested)}
                </button>
                {saleNum > 0 && costNum > 0 ? (
                  <span className="text-zinc-600">
                    {" "}
                    · margem {roundMoney(((saleNum - costNum) / saleNum) * 100)}%
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Finalidade</label>
              <select
                className="h-9 rounded-lg border border-white/10 bg-zinc-950 px-2 text-sm text-zinc-100"
                value={usage}
                onChange={(e) => setUsage(e.target.value as StockUsage)}
              >
                {STOCK_USAGES.map((u) => (
                  <option key={u} value={u}>{STOCK_USAGE_LABEL[u]}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Ativo no PDV
            </label>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" onClick={submit}>{submitLabel}</Button>
            {onCancel ? (
              <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
            ) : null}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

export function mergeProductFromForm(
  existing: import("@/types").Product,
  values: ProductFormValues & { ncm?: string; cfop?: string },
): Omit<import("@/types").Product, "id"> & { id: string } {
  const base = buildProductPayloadFromForm(values);
  return {
    ...existing,
    ...base,
    id: existing.id,
    stockQty: existing.stockQty,
    batches: existing.batches,
    trackStock: existing.trackStock ?? base.trackStock,
    onPromotion: values.onPromotion,
    promoPrice: values.onPromotion && values.promoPrice > 0 ? values.promoPrice : undefined,
    referenceBarcode: values.referenceBarcode ?? existing.referenceBarcode,
    barcodeCustomized: values.barcodeCustomized ?? existing.barcodeCustomized,
    fiscal: {
      ...existing.fiscal,
      ...base.fiscal,
      ncm: values.ncm || existing.fiscal?.ncm || base.fiscal.ncm,
      cfop: values.cfop || existing.fiscal?.cfop || base.fiscal.cfop,
    },
  };
}

export function buildProductPayloadFromForm(
  values: ProductFormValues & { ncm?: string; cfop?: string },
): Omit<import("@/types").Product, "id"> {
  const unitMeta = saleUnitToFiscal(values.saleUnit);
  return {
    name: values.name,
    price: values.price,
    categoryId: values.categoryId,
    saleUnit: values.saleUnit,
    barcode: values.barcode || undefined,
    referenceBarcode:
      values.barcodeCustomized && values.referenceBarcode
        ? values.referenceBarcode
        : values.referenceBarcode || values.barcode || undefined,
    barcodeCustomized: values.barcodeCustomized,
    imageUrl: values.imageUrl || undefined,
    active: values.active,
    soldByWeight: unitMeta.soldByWeight,
    trackStock: true,
    stockQty: 0,
    stockMin: values.stockMin,
    costPrice: values.costPrice,
    usage: values.usage,
    onPromotion: values.onPromotion,
    promoPrice: values.onPromotion && values.promoPrice > 0 ? values.promoPrice : undefined,
    fiscal: {
      ...defaultFiscalFields,
      ncm: values.ncm || defaultFiscalFields.ncm,
      cfop: values.cfop || defaultFiscalFields.cfop,
      unidade_comercial: unitMeta.unidade_comercial,
    },
  };
}
