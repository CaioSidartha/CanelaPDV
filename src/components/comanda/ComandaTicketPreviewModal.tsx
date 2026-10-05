"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toBarcodeSafeCode } from "@/lib/comanda-code";
import { buildBarcodeSvg, printComandaSlip, type ComandaSlip } from "@/lib/comanda-print";
import type { CompanySettings } from "@/types";

type Props = {
  open: boolean;
  company: CompanySettings;
  slip: ComandaSlip | null;
  onClose: () => void;
};

/** Preview visual do ticket após emitir (número + nome + barcode). */
export function ComandaTicketPreviewModal({ open, company, slip, onClose }: Props) {
  const [barcodeHtml, setBarcodeHtml] = useState<string>("");
  const [barcodeErr, setBarcodeErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !slip) {
      setBarcodeHtml("");
      setBarcodeErr(null);
      return;
    }
    try {
      setBarcodeHtml(buildBarcodeSvg(slip.code));
      setBarcodeErr(null);
    } catch (e) {
      setBarcodeHtml("");
      setBarcodeErr(e instanceof Error ? e.message : "Falha ao gerar código de barras.");
    }
  }, [open, slip]);

  const safeCode = useMemo(
    () => (slip ? toBarcodeSafeCode(slip.code) || slip.code : ""),
    [slip],
  );

  if (!open || !slip) return null;

  const name = slip.customerName?.trim();
  const when = new Date(slip.createdAtISO).toLocaleString("pt-BR");

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-600 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Ticket emitido</p>
            <h3 className="font-display text-lg font-semibold text-zinc-50">Comanda {slip.number}</h3>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-white px-5 py-6 text-zinc-900">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider">{company.name}</p>
            <p className="text-[11px] text-zinc-500">CNPJ: {company.cnpj || "—"}</p>
            <p className="text-[11px] text-zinc-500">{when}</p>
            {name ? <p className="mt-2 text-base font-bold">{name}</p> : null}
          </div>
          <div className="my-3 border-t border-dashed border-zinc-300" />
          <div className="text-center">
            <p className="font-mono text-xs text-zinc-600">
              Código: <strong className="text-zinc-900">{safeCode}</strong>
            </p>
            {barcodeErr ? (
              <p className="mt-3 text-sm text-red-600">{barcodeErr}</p>
            ) : (
              <div
                className="mx-auto mt-3 max-w-[240px] [&_svg]:h-auto [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: barcodeHtml }}
              />
            )}
            <p className="mt-2 font-mono text-5xl font-extrabold tracking-wide">{slip.number}</p>
          </div>
          <div className="my-3 border-t border-dashed border-zinc-300" />
          <p className="text-center text-[11px] text-zinc-500">
            Apresente esta comanda para adicionar itens e fechar no caixa.
          </p>
        </div>

        <div className="flex gap-2 border-t border-zinc-700 px-4 py-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Fechar
          </Button>
          <Button
            type="button"
            className="flex-1 bg-brand hover:bg-brand-light"
            onClick={() => printComandaSlip(company, slip)}
            disabled={Boolean(barcodeErr)}
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>
    </div>
  );
}
