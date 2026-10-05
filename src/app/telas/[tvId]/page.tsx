"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ExternalLink, Monitor, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  DISPLAY_ROWS_PER_PAGE_MAX,
  DISPLAY_ROWS_PER_PAGE_MIN,
  tvNeedsRotationField,
} from "@/lib/display-schedule";
import { productUsage } from "@/lib/stock-usage";
import { formatBRL } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { DisplaySlot } from "@/types";

export default function TelaConfigPage() {
  const params = useParams();
  const router = useRouter();
  const tvId = typeof params.tvId === "string" ? params.tvId : "";

  const displayTvs = useAppStore((s) => s.displayTvs);
  const categories = useAppStore((s) => s.categories);
  const products = useAppStore((s) => s.products);
  const updateDisplayTv = useAppStore((s) => s.updateDisplayTv);
  const removeDisplayTv = useAppStore((s) => s.removeDisplayTv);
  const addDisplaySlot = useAppStore((s) => s.addDisplaySlot);
  const updateDisplaySlot = useAppStore((s) => s.updateDisplaySlot);
  const removeDisplaySlot = useAppStore((s) => s.removeDisplaySlot);

  const tv = useMemo(() => displayTvs.find((t) => t.id === tvId), [displayTvs, tvId]);

  const [addCatOpen, setAddCatOpen] = useState(false);
  const [pickCategoryId, setPickCategoryId] = useState("");
  const [editSlot, setEditSlot] = useState<DisplaySlot | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const showRotation = tv ? tvNeedsRotationField(tv, products) : false;

  const productsInCategory = useMemo(() => {
    if (!editSlot) return [];
    return products
      .filter(
        (p) => p.active && productUsage(p) === "revenda" && p.categoryId === editSlot.categoryId && !p.soldByWeight,
      )
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [editSlot, products]);

  const openEditSlot = (slot: DisplaySlot) => {
    setEditSlot(slot);
    const all = products.filter(
      (p) => p.active && productUsage(p) === "revenda" && p.categoryId === slot.categoryId && !p.soldByWeight,
    );
    if (slot.productIds.length === 0) {
      setSelectedIds(new Set(all.map((p) => p.id)));
    } else {
      setSelectedIds(new Set(slot.productIds));
    }
  };

  const saveEditSlot = () => {
    if (!tv || !editSlot) return;
    const allIds = productsInCategory.map((p) => p.id);
    const sel = [...selectedIds].filter((id) => allIds.includes(id));
    const allSelected = allIds.length > 0 && sel.length === allIds.length;
    updateDisplaySlot(tv.id, editSlot.id, allSelected ? [] : sel);
    setEditSlot(null);
  };

  const togglePid = (pid: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(pid)) n.delete(pid);
      else n.add(pid);
      return n;
    });
  };

  if (!tv) {
    return (
      <div className="p-6 lg:p-10">
        <p className="text-sm text-zinc-400">TV não encontrada.</p>
        <Link href="/telas" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
          ← Voltar às telas
        </Link>
      </div>
    );
  }

  const monitorUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/telas/monitor/${tv.id}`
      : `/telas/monitor/${tv.id}`;

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/telas" className="text-sm text-zinc-500 hover:text-brand">
          ← Telas
        </Link>
      </div>

      <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-muted text-brand">
            <Monitor className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-zinc-100 lg:text-3xl">
              Configurar: {tv.label}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Ordene as categorias na sequência em que devem aparecer no monitor. Cada categoria pode ter
              só alguns itens; o que não couber numa tela passa para a próxima, no mesmo tempo configurado.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={monitorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-2.5 text-sm font-medium text-zinc-200 backdrop-blur-sm hover:bg-zinc-800/50"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir monitor
          </a>
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              if (confirm(`Remover a TV "${tv.label}"?`)) {
                removeDisplayTv(tv.id);
                router.push("/telas");
              }
            }}
          >
            Excluir TV
          </Button>
        </div>
      </header>

      <section className="panel-glass mb-8 max-w-xl space-y-4 p-5">
        <div className="panel-glass-inner space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Nome / descrição</label>
          <Input
            value={tv.label}
            onChange={(e) => updateDisplayTv(tv.id, { label: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Itens por tela no monitor (mín. {DISPLAY_ROWS_PER_PAGE_MIN}, sem rolagem)
          </label>
          <Input
            type="number"
            min={DISPLAY_ROWS_PER_PAGE_MIN}
            max={DISPLAY_ROWS_PER_PAGE_MAX}
            inputMode="numeric"
            value={String(tv.maxRowsPerPage)}
            onChange={(e) => {
              const n = Number(e.target.value);
              updateDisplayTv(tv.id, {
                maxRowsPerPage: Number.isFinite(n) ? n : DISPLAY_ROWS_PER_PAGE_MIN,
              });
            }}
          />
          <p className="mt-1 text-xs text-zinc-500">
            Ex.: 10 = até 10 linhas visíveis por vez. Com 12 itens na categoria, a 2ª tela mostra os 2
            restantes. O monitor não usa scroll: só troca de quadro pelo tempo.
          </p>
        </div>
        {showRotation && (
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Segundos em cada tela / quadro
            </label>
            <Input
              inputMode="numeric"
              value={String(tv.rotationSeconds)}
              onChange={(e) =>
                updateDisplayTv(tv.id, { rotationSeconds: Number(e.target.value) || 20 })
              }
            />
            <p className="mt-1 text-xs text-zinc-500">
              Cada página de itens (ou cada categoria na sequência) fica esse tempo inteiro. Ex.: 20s nos
              primeiros 10 itens e mais 20s nos itens que faltarem da mesma categoria, depois passa à
              próxima categoria.
            </p>
          </div>
        )}
        </div>
      </section>

      <section className="panel-glass p-5">
        <div className="panel-glass-inner">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-200">Categorias no monitor</h2>
          <Button
            type="button"
            variant="secondary"
            className="inline-flex items-center gap-2"
            onClick={() => {
              setPickCategoryId(categories[0]?.id ?? "");
              setAddCatOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Adicionar categoria
          </Button>
        </div>

        {tv.slots.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">
            Nenhuma categoria. Adicione ao menos uma para o monitor exibir preços.
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.08]">
            {tv.slots.map((slot, idx) => {
              const cat = categories.find((c) => c.id === slot.categoryId);
              const list = products.filter(
                (p) => p.active && productUsage(p) === "revenda" && p.categoryId === slot.categoryId && !p.soldByWeight,
              );
              const shown =
                slot.productIds.length === 0
                  ? list.length
                  : list.filter((p) => slot.productIds.includes(p.id)).length;
              return (
                <li
                  key={slot.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0"
                >
                  <div>
                    <p className="text-xs text-zinc-500">Ordem {idx + 1}</p>
                    <p className="font-medium text-zinc-100">{cat?.name ?? slot.categoryId}</p>
                    <p className="text-xs text-zinc-500">
                      {shown} item(ns) na lista
                      {slot.productIds.length === 0 ? " (todos da categoria)" : " (seleção)"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => openEditSlot(slot)}>
                      Itens…
                    </Button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                      title="Remover categoria desta TV"
                      onClick={() => removeDisplaySlot(tv.id, slot.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        </div>
      </section>

      {addCatOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="panel-glass w-full max-w-md p-6 shadow-2xl">
            <div className="panel-glass-inner">
            <h3 className="font-semibold text-zinc-100">Adicionar categoria</h3>
            <p className="mt-1 text-sm text-zinc-400">Cada categoria só pode aparecer uma vez nesta TV.</p>
            <label className="mb-1 mt-4 block text-xs text-zinc-500">Categoria</label>
            <select
              className="w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2.5 text-sm text-zinc-100"
              value={pickCategoryId}
              onChange={(e) => setPickCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="mt-6 flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setAddCatOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (pickCategoryId) {
                    addDisplaySlot(tv.id, pickCategoryId);
                  }
                  setAddCatOpen(false);
                }}
              >
                Adicionar
              </Button>
            </div>
            </div>
          </div>
        </div>
      )}

      {editSlot && (
        <div className="fixed inset-0 z-[210] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
          <div className="panel-glass flex max-h-[min(88vh,640px)] w-full max-w-lg flex-col overflow-hidden shadow-2xl">
            <div className="border-b border-white/10 px-5 py-4">
              <h3 className="font-semibold text-zinc-100">Itens exibidos</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Marque os produtos desta categoria que aparecem no monitor. Todos marcados = “todos os
                da categoria” automaticamente.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3">
              <ul className="space-y-2">
                {productsInCategory.map((p) => (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 px-3 py-2 hover:bg-white/5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-zinc-600 bg-zinc-900/50"
                        checked={selectedIds.has(p.id)}
                        onChange={() => togglePid(p.id)}
                      />
                      <span className="flex-1 text-sm text-zinc-100">{p.name}</span>
                      <span className="text-sm font-medium text-brand">{formatBRL(p.price)}</span>
                    </label>
                  </li>
                ))}
              </ul>
              {productsInCategory.length === 0 && (
                <p className="py-8 text-center text-sm text-zinc-500">
                  Nenhum produto unitário nesta categoria.
                </p>
              )}
            </div>
            <div className="flex gap-2 border-t border-white/10 px-5 py-4">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditSlot(null)}>
                Cancelar
              </Button>
              <Button type="button" className="flex-1" onClick={saveEditSlot}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
