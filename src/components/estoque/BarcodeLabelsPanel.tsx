"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Bluetooth, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { isBluetoothPrintSupported, printLabelsViaBluetooth } from "@/lib/bluetooth-label-printer";
import { productNeedsCustomLabel } from "@/lib/store-barcode";
import { formatBRL } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

type LabelFormat = "50x55" | "40x30" | "a4-3col";

const FORMATS: { id: LabelFormat; label: string; hint: string }[] = [
  { id: "50x55", label: "50 × 55 mm", hint: "Etiquetas térmicas comuns (Bluetooth)" },
  { id: "40x30", label: "40 × 30 mm", hint: "Etiqueta menor" },
  { id: "a4-3col", label: "A4 (grade)", hint: "Impressora comum — várias por folha" },
];

function LabelBlock({
  name,
  code,
  price,
  format,
  svgId,
}: {
  name: string;
  code: string;
  price: number;
  format: LabelFormat;
  svgId: string;
}) {
  const sizeClass =
    format === "50x55"
      ? "label-50x55"
      : format === "40x30"
        ? "label-40x30"
        : "label-a4-cell";

  return (
    <div className={`label-sheet-item ${sizeClass} flex flex-col items-center justify-center border border-dashed border-zinc-300 bg-white p-1 text-black`}>
      <p className="mb-0.5 w-full truncate text-center text-[9px] font-semibold leading-tight">{name}</p>
      <svg id={svgId} className="max-h-[28px] w-full" />
      <p className="mt-0.5 font-mono text-[10px]">{code}</p>
      {price > 0 ? <p className="text-[10px] font-bold">{formatBRL(price)}</p> : null}
    </div>
  );
}

export function BarcodeLabelsPanel() {
  const products = useAppStore((s) => s.products);
  const categories = useAppStore((s) => s.categories);
  const [format, setFormat] = useState<LabelFormat>("50x55");
  const [categoryId, setCategoryId] = useState<string>("todos");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [btBusy, setBtBusy] = useState(false);
  const [btMsg, setBtMsg] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const btSupported = isBluetoothPrintSupported();

  const eligible = useMemo(() => {
    return products
      .filter((p) => p.active && productNeedsCustomLabel(p))
      .filter((p) => categoryId === "todos" || p.categoryId === categoryId)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [products, categoryId]);

  useEffect(() => {
    setSelected(new Set(eligible.map((p) => p.id)));
  }, [eligible]);

  const toPrint = useMemo(() => eligible.filter((p) => selected.has(p.id)), [eligible, selected]);

  useEffect(() => {
    toPrint.forEach((p) => {
      const code = (p.barcode ?? "").replace(/\D/g, "");
      if (code.length < 8) return;
      try {
        JsBarcode(`#barcode-svg-${p.id}`, code, {
          format: code.length === 13 ? "EAN13" : "CODE128",
          width: 1.2,
          height: 36,
          displayValue: false,
          margin: 0,
        });
      } catch {
        JsBarcode(`#barcode-svg-${p.id}`, code, { format: "CODE128", width: 1.2, height: 36, displayValue: false });
      }
    });
  }, [toPrint, format]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(eligible.map((p) => p.id)));
  const clearSel = () => setSelected(new Set());

  const print = () => {
    if (!toPrint.length) return;
    const html = printRef.current?.innerHTML;
    if (!html) return;
    const w = window.open("", "_blank", "width=800,height=600");
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html><html><head><title>Etiquetas</title>
      <style>
        @page { margin: 4mm; }
        body { margin: 0; font-family: system-ui, sans-serif; }
        .sheet { display: flex; flex-wrap: wrap; gap: 2mm; justify-content: flex-start; }
        .label-50x55 { width: 50mm; height: 55mm; box-sizing: border-box; page-break-inside: avoid; }
        .label-40x30 { width: 40mm; height: 30mm; box-sizing: border-box; page-break-inside: avoid; }
        .label-a4-cell { width: 63mm; height: 38mm; box-sizing: border-box; page-break-inside: avoid; }
        p { margin: 0; color: #000; }
        svg { max-width: 100%; }
      </style></head><body><div class="sheet">${html}</div>
      <script>window.onload = () => { window.print(); }</script>
      </body></html>`);
    w.document.close();
  };

  const printBluetooth = async () => {
    if (!toPrint.length || format === "a4-3col") return;
    setBtMsg(null);
    setBtBusy(true);
    try {
      const items = toPrint
        .map((p) => ({
          name: p.name,
          code: (p.barcode ?? "").replace(/\D/g, ""),
          price: p.price,
        }))
        .filter((i) => i.code.length >= 8);
      if (!items.length) {
        setBtMsg("Nenhum código válido para enviar à impressora.");
        return;
      }
      await printLabelsViaBluetooth(items, format === "40x30" ? "40x30" : "50x55");
      setBtMsg(`Enviado ${items.length} etiqueta(s) via Bluetooth.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao imprimir via Bluetooth.";
      if (msg.includes("cancel") || msg.includes("Cancel")) {
        setBtMsg("Seleção da impressora cancelada.");
      } else {
        setBtMsg(msg);
      }
    } finally {
      setBtBusy(false);
    }
  };

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-light/90">Estoque · Etiquetas</p>
        <h2 className="text-lg font-semibold text-zinc-50">Imprimir códigos de barras</h2>
        <p className="text-xs text-zinc-500">
          Só entram produtos em que você <strong className="text-zinc-400">gerou ou alterou</strong> o código (diferente
          do da nota). O EAN original do fornecedor não precisa de etiqueta nova.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-white/10 bg-zinc-900/40 p-3">
        <div>
          <label className="mb-1 block text-[10px] uppercase text-zinc-500">Formato da etiqueta</label>
          <select
            className="h-9 rounded-lg border border-white/10 bg-zinc-950 px-2 text-sm text-zinc-100"
            value={format}
            onChange={(e) => setFormat(e.target.value as LabelFormat)}
          >
            {FORMATS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-zinc-500">{FORMATS.find((f) => f.id === format)?.hint}</p>
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase text-zinc-500">Categoria</label>
          <select
            className="h-9 rounded-lg border border-white/10 bg-zinc-950 px-2 text-sm text-zinc-100"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setSelected(new Set());
            }}
          >
            <option value="todos">Todas (elegíveis)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={selectAll}>Selecionar todos</Button>
          <Button type="button" variant="secondary" size="sm" onClick={clearSel}>Limpar seleção</Button>
          <Button type="button" size="sm" className="gap-1" disabled={!toPrint.length} onClick={print}>
            <Printer className="h-4 w-4" />
            Imprimir ({toPrint.length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="gap-1"
            disabled={!toPrint.length || btBusy || format === "a4-3col" || !btSupported}
            onClick={() => void printBluetooth()}
            title={
              btSupported
                ? "Etiquetadora térmica Bluetooth (ESC/POS)"
                : "Use Chrome/Edge em localhost para Bluetooth"
            }
          >
            <Bluetooth className="h-4 w-4" />
            {btBusy ? "Conectando…" : "Bluetooth"}
          </Button>
        </div>
        {btMsg ? <p className="w-full text-xs text-zinc-400">{btMsg}</p> : null}
        {btSupported ? (
          <p className="w-full text-[10px] text-zinc-500">
            Bluetooth: ligue a etiquetadora, escolha o dispositivo na janela do navegador e confirme. Compatível com
            modelos ESC/POS (térmicas 50×55 / 40×30).
          </p>
        ) : (
          <p className="w-full text-[10px] text-amber-200/80">
            Bluetooth indisponível aqui — use Chrome ou Edge no PC. No celular, prefira o app do fabricante ou
            &quot;Imprimir&quot; com driver instalado.
          </p>
        )}
      </div>

      {eligible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-500">
          Nenhum produto com código personalizado. Gere ou altere o código no cadastro ou na importação da nota.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950/80 text-[10px] uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2 w-10" />
                <th className="px-3 py-2">Produto</th>
                <th className="px-3 py-2">Categoria</th>
                <th className="px-3 py-2">Código atual</th>
                <th className="px-3 py-2">Ref. nota</th>
              </tr>
            </thead>
            <tbody>
              {eligible.map((p) => (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                  </td>
                  <td className="px-3 py-2 text-zinc-100">{p.name}</td>
                  <td className="px-3 py-2 text-zinc-400">{catName(p.categoryId)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-brand-light">{p.barcode}</td>
                  <td className="px-3 py-2 font-mono text-xs text-zinc-500">{p.referenceBarcode ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div ref={printRef} className="pointer-events-none fixed -left-[9999px] top-0 opacity-0" aria-hidden>
        {toPrint.map((p) => {
          const code = (p.barcode ?? "").replace(/\D/g, "");
          if (!code) return null;
          return (
            <LabelBlock
              key={p.id}
              name={p.name}
              code={code}
              price={p.price}
              format={format}
              svgId={`barcode-svg-${p.id}`}
            />
          );
        })}
      </div>
    </div>
  );
}
