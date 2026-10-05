"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, ImagePlus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { HardwareSettingsPanel } from "@/components/config/HardwareSettingsPanel";
import { ProductEditorModal } from "@/components/config/ProductEditorModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { effectiveUnitPrice } from "@/lib/product-catalog";
import { newEntityId } from "@/lib/id";
import { formatBRL } from "@/lib/utils";
import { TenantAppSettings } from "@/components/tenant/TenantAppSettings";
import { useAppStore } from "@/store/useAppStore";
import type { Product, WeightPriceConfig } from "@/types";

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState<"empresa" | "peso" | "produtos" | "hardwares" | "app">("empresa");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("tab");
    if (q === "app") setTab("app");
  }, []);
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; product: Product | null }>({
    mode: "create",
    product: null,
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [newCat, setNewCat] = useState("");
  const newCatInputRef = useRef<HTMLInputElement>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [qProd, setQProd] = useState("");
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(() => new Set());

  const company = useAppStore((s) => s.company);
  const setCompany = useAppStore((s) => s.setCompany);
  const weightPrices = useAppStore((s) => s.weightPrices);
  const upsertWeightPrice = useAppStore((s) => s.upsertWeightPrice);
  const categories = useAppStore((s) => s.categories);
  const addCategory = useAppStore((s) => s.addCategory);
  const updateCategory = useAppStore((s) => s.updateCategory);
  const removeCategory = useAppStore((s) => s.removeCategory);
  const removeWeightPrice = useAppStore((s) => s.removeWeightPrice);
  const products = useAppStore((s) => s.products);
  const addProduct = useAppStore((s) => s.addProduct);
  const updateProduct = useAppStore((s) => s.updateProduct);
  const removeProduct = useAppStore((s) => s.removeProduct);
  const toggleProductActive = useAppStore((s) => s.toggleProductActive);

  const grouped = useMemo(() => {
    const q = qProd.trim().toLowerCase();
    const filtered = q
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.barcode ?? "").toLowerCase().includes(q)
        )
      : products;
    return categories
      .map((c) => ({
        ...c,
        items: filtered
          .filter((p) => p.categoryId === c.id)
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      }));
  }, [categories, products, qProd]);

  const submitNewCategory = () => {
    const name = newCat.trim();
    if (!name) return;
    addCategory(name);
    setNewCat("");
    requestAnimationFrame(() => newCatInputRef.current?.focus());
  };

  const productCountInCategory = (categoryId: string) =>
    products.filter((p) => p.categoryId === categoryId).length;

  const requestRemoveCategory = (id: string, name: string) => {
    const n = productCountInCategory(id);
    if (n > 0) {
      window.alert(`Não é possível excluir "${name}": há ${n} produto(s) nesta categoria.`);
      return;
    }
    if (window.confirm(`Excluir a categoria "${name}"?`)) removeCategory(id);
  };

  const toggleCat = (id: string) => {
    setCollapsedCats((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  return (
    <div className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-zinc-100">Configurações</h1>
        <p className="text-sm text-zinc-400">Gerencie sua padaria</p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["empresa", "Empresa"],
            ["peso", "Preços no peso"],
            ["produtos", "Produtos"],
            ["hardwares", "Hardwares"],
            ["app", "App e offline"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === k
                ? "bg-brand text-white shadow-sm"
                : "border border-white/10 bg-zinc-900/40 text-zinc-400 shadow-card hover:bg-zinc-800/50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "empresa" && (
        <section className="panel-glass max-w-2xl overflow-hidden">
          <div className="flex flex-col sm:flex-row">
            <aside className="flex flex-col items-center gap-3 border-b border-white/10 bg-zinc-950/45 p-6 sm:w-48 sm:shrink-0 sm:border-b-0 sm:border-r">
              <BrandMark logoUrl={company.logoUrl} size="lg" />
              <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-zinc-900/50 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-brand/40 hover:bg-brand-muted/20">
                <ImagePlus className="h-4 w-4 text-brand" />
                Enviar imagem
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = reader.result;
                      if (typeof result === "string") setCompany({ logoUrl: result });
                    };
                    reader.readAsDataURL(file);
                    e.target.value = "";
                  }}
                />
              </label>
              <div className="w-full">
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  Logo por URL
                </label>
                <Input
                  value={company.logoUrl ?? ""}
                  onChange={(e) => setCompany({ logoUrl: e.target.value.trim() || undefined })}
                  placeholder="https://..."
                  className="text-xs"
                />
              </div>
            </aside>
            <div className="flex flex-1 flex-col justify-center gap-4 p-6 sm:p-8">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Cartão da loja</p>
                <h2 className="font-display text-2xl font-semibold text-zinc-100">{company.name || "Nome fantasia"}</h2>
              </div>
              <Field
                label="Nome fantasia"
                value={company.name}
                onChange={(v) => setCompany({ name: v })}
              />
              <Field label="CNPJ" value={company.cnpj} onChange={(v) => setCompany({ cnpj: v })} />
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Endereço</label>
                <Input
                  value={company.address}
                  onChange={(e) => setCompany({ address: e.target.value })}
                />
              </div>
              <Field label="Telefone" value={company.phone} onChange={(v) => setCompany({ phone: v })} />
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Markup sugerido na revenda (% sobre o custo)
                </label>
                <Input
                  inputMode="decimal"
                  value={String(company.defaultMarkupPercent ?? 120)}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(",", "."));
                    if (Number.isFinite(n) && n >= 0) setCompany({ defaultMarkupPercent: n });
                  }}
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Ex.: 120 → venda sugerida = custo × 2,2. Usado na importação de NF-e e cadastro.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={company.storeOpen}
                  onChange={(e) => setCompany({ storeOpen: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-900/50 text-brand focus:ring-brand"
                />
                Loja aberta (exibido no PDV)
              </label>
            </div>
          </div>
        </section>
      )}

      {tab === "peso" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-400">Tarifas por quilograma (buffet, refeições…)</p>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                upsertWeightPrice({
                  id: newEntityId("weight"),
                  label: "Nova tarifa",
                  pricePerKg: 0,
                  active: true,
                })
              }
            >
              <Plus className="h-4 w-4" />
              Nova tarifa
            </Button>
          </div>
          {weightPrices.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-500">
              Nenhuma tarifa cadastrada. Clique em &quot;Nova tarifa&quot; para começar.
            </p>
          ) : null}
          {weightPrices.map((w) => (
            <WeightRow
              key={w.id}
              initial={w}
              onSave={upsertWeightPrice}
              onRemove={() => {
                if (window.confirm(`Excluir a tarifa "${w.label || "sem nome"}"?`)) removeWeightPrice(w.id);
              }}
            />
          ))}
        </section>
      )}

      {tab === "hardwares" && <HardwareSettingsPanel />}

      {tab === "app" && <TenantAppSettings />}

      {tab === "produtos" && (
        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-zinc-100">Cardápio de produtos</h2>
            <Button
              onClick={() => {
                setEditor({ mode: "create", product: null });
                setEditorOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Novo produto
            </Button>
          </div>

          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={qProd}
                onChange={(e) => setQProd(e.target.value)}
                placeholder="Buscar produto por nome ou EAN..."
                className="pl-10"
              />
            </div>
            <p className="text-xs text-zinc-500">Agrupado por categoria · filtro ao vivo</p>
          </div>

          <div className="panel-glass mb-6 flex flex-wrap items-end gap-2 p-4">
            <div className="panel-glass-inner min-w-[200px] flex-1">
              <label className="mb-1 block text-xs text-zinc-500">Nova categoria</label>
              <Input
                ref={newCatInputRef}
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitNewCategory();
                  }
                }}
                placeholder="Ex.: Lanches · Enter para adicionar"
              />
            </div>
            <Button variant="secondary" type="button" disabled={!newCat.trim()} onClick={submitNewCategory}>
              Adicionar categoria
            </Button>
          </div>

          <div className="space-y-3">
            {categories.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-500">
                Nenhuma categoria ainda. Digite o nome acima e pressione Enter.
              </p>
            ) : null}
            {grouped.map((cat) => {
              const open = !collapsedCats.has(cat.id);
              return (
                <div
                  key={cat.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/25 shadow-card backdrop-blur-sm"
                >
                  <div className="flex w-full items-center gap-2 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleCat(cat.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left transition hover:opacity-90"
                    >
                      {open ? (
                        <ChevronDown className="h-5 w-5 shrink-0 text-zinc-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 shrink-0 text-zinc-400" />
                      )}
                      {editingCatId === cat.id ? (
                        <Input
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              updateCategory(cat.id, editingCatName);
                              setEditingCatId(null);
                            }
                            if (e.key === "Escape") setEditingCatId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="max-w-xs"
                          autoFocus
                        />
                      ) : (
                        <h3 className="font-display text-lg font-semibold text-zinc-100">{cat.name}</h3>
                      )}
                      <span className="ml-auto shrink-0 text-xs font-medium text-zinc-500">
                        {cat.items.length} itens
                      </span>
                    </button>
                    {editingCatId === cat.id ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="shrink-0"
                        onClick={() => {
                          updateCategory(cat.id, editingCatName);
                          setEditingCatId(null);
                        }}
                      >
                        Ok
                      </Button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="shrink-0 rounded-lg p-2 text-brand hover:bg-brand-muted"
                          aria-label="Renomear categoria"
                          onClick={() => {
                            setEditingCatId(cat.id);
                            setEditingCatName(cat.name);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="shrink-0 rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                          aria-label="Excluir categoria"
                          onClick={() => requestRemoveCategory(cat.id, cat.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                  {open && (
                    <ul className="space-y-2 border-t border-white/[0.06] p-4">
                      {cat.items.length === 0 ? (
                        <li className="py-4 text-center text-sm text-zinc-500">
                          Nenhum produto nesta categoria. Use &quot;Novo produto&quot; para cadastrar.
                        </li>
                      ) : null}
                      {cat.items.map((p) => (
                        <li
                          key={p.id}
                          className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/35 px-4 py-3 shadow-sm backdrop-blur-sm"
                        >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-zinc-100">{p.name}</p>
                        <p className="text-sm text-brand">
                          {p.onPromotion ? (
                            <span className="inline-flex flex-wrap items-baseline gap-1.5">
                              <span>{formatBRL(effectiveUnitPrice(p))}</span>
                              <span className="text-xs font-normal text-zinc-500 line-through">
                                {formatBRL(p.price)}
                              </span>
                            </span>
                          ) : (
                            formatBRL(p.price)
                          )}
                        </p>
                        {p.onPromotion && (
                          <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wide text-amber-400/90">
                            Promo
                          </span>
                        )}
                        {p.barcode && (
                          <p className="text-xs text-zinc-500">EAN extra: {p.barcode}</p>
                        )}
                        {p.batches?.length ? (
                          <p className="text-xs text-zinc-500">
                            {p.batches.length} remessa(s) · estoque somado por lote
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={p.active}
                        onClick={() => toggleProductActive(p.id)}
                        className={`relative h-7 w-12 rounded-full transition ${
                          p.active ? "bg-brand" : "bg-zinc-700"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                            p.active ? "left-6" : "left-0.5"
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-2 text-brand hover:bg-brand-muted"
                        onClick={() => {
                          setEditor({ mode: "edit", product: p });
                          setEditorOpen(true);
                        }}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                        onClick={() => removeProduct(p.id)}
                        aria-label="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <ProductEditorModal
        open={editorOpen}
        mode={editor.mode}
        product={editor.product}
        categories={categories}
        onClose={() => setEditorOpen(false)}
        onSave={(payload) => {
          if (payload.id) {
            const { id, ...rest } = payload;
            updateProduct(id, rest);
          } else {
            const { id: _id, ...rest } = payload;
            void _id;
            addProduct(rest as Omit<Product, "id">);
          }
        }}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-500">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function WeightRow({
  initial,
  onSave,
  onRemove,
}: {
  initial: WeightPriceConfig;
  onSave: (w: WeightPriceConfig) => void;
  onRemove: () => void;
}) {
  const [label, setLabel] = useState(initial.label);
  const [price, setPrice] = useState(String(initial.pricePerKg));
  const [active, setActive] = useState(initial.active);

  return (
    <div className="panel-glass flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
      <div className="panel-glass-inner flex-1">
        <label className="mb-1 block text-xs text-zinc-500">Nome da tarifa</label>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <div className="w-full sm:w-40">
        <label className="mb-1 block text-xs text-zinc-500">R$ / kg</label>
        <Input value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-600 bg-zinc-900/50 text-brand"
        />
        Ativa
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            onSave({
              ...initial,
              label: label.trim(),
              pricePerKg: Number(price.replace(",", ".")),
              active,
            })
          }
        >
          Salvar
        </Button>
        <Button type="button" variant="secondary" className="text-red-400 hover:bg-red-500/10" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
          Excluir
        </Button>
      </div>
    </div>
  );
}
