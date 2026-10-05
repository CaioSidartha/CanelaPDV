"use client";

import {
  buildProductPayloadFromForm,
  mergeProductFromForm,
  ProductFormPanel,
} from "@/components/products/ProductFormPanel";
import { productUsage } from "@/lib/stock-usage";
import { resolveSaleUnit } from "@/lib/product-sale-unit";
import type { Product } from "@/types";

type Mode = "create" | "edit";

export function ProductEditorModal({
  open,
  mode,
  product,
  categories,
  onClose,
  onSave,
}: {
  open: boolean;
  mode: Mode;
  product: Product | null;
  categories: { id: string; name: string }[];
  onClose: () => void;
  onSave: (p: Omit<Product, "id"> & { id?: string }) => void;
}) {
  if (!open) return null;

  const title = mode === "create" ? "Novo produto" : "Editar produto";
  const submitLabel = mode === "create" ? "Salvar produto" : "Salvar alterações";

  const editInitial =
    mode === "edit" && product
      ? {
          name: product.name,
          barcode: product.barcode ?? "",
          referenceBarcode: product.referenceBarcode ?? product.barcode ?? "",
          categoryId: product.categoryId,
          saleUnit: resolveSaleUnit(product),
          usage: productUsage(product),
          costPrice: product.costPrice ?? 0,
          price: product.price,
          stockMin: product.stockMin ?? 0,
          imageUrl: product.imageUrl ?? "",
          active: product.active,
          onPromotion: product.onPromotion,
          promoPrice: product.promoPrice,
        }
      : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-zinc-900 p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl text-zinc-50">{title}</h2>
          <button
            type="button"
            className="text-sm text-zinc-400 hover:text-zinc-200"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
        <ProductFormPanel
          key={mode === "edit" ? product?.id ?? "edit" : "create"}
          showPromotionTab
          submitLabel={submitLabel}
          onCancel={onClose}
          initial={
            mode === "create"
              ? { categoryId: categories[0]?.id ?? "" }
              : editInitial
          }
          onSubmit={(values) => {
            if (mode === "edit" && product) {
              onSave(mergeProductFromForm(product, values));
            } else {
              onSave(buildProductPayloadFromForm(values));
            }
            onClose();
          }}
        />
      </div>
    </div>
  );
}
