"use client";

import { Printer, X } from "lucide-react";
import { paymentMethodLabel } from "@/components/payment/PaymentMethodDisplay";
import { Button } from "@/components/ui/Button";
import { printSaleReceiptDialog, type PrintAttempt } from "@/lib/receipt-print";
import { DEMO_STORE_NAME } from "@/config/brand";
import { formatBRL } from "@/lib/utils";
import type { CompanySettings, CompletedSale } from "@/types";

type Props = {
  company: CompanySettings;
  sale: CompletedSale | null;
  printStatus: PrintAttempt | null;
  onClose: () => void;
};

export function SaleReceiptModal({ company, sale, printStatus, onClose }: Props) {
  if (!sale) return null;
  const when = new Date(sale.createdAt).toLocaleString("pt-BR");
  const subtotal = sale.lines.reduce((s, l) => s + l.subtotal, 0);
  const payments = sale.payments?.length
    ? sale.payments
    : [{ method: sale.payment_method, amount: sale.total }];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[1px]">
      <div className="flex max-h-[92vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-zinc-600 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Venda fechada</p>
            <h3 className="font-display text-lg font-semibold text-zinc-50">Cupom</h3>
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

        <div className="overflow-y-auto bg-white px-5 py-5 font-mono text-[12px] text-zinc-900">
          <div className="text-center">
            <p className="text-base font-bold">{company.name || DEMO_STORE_NAME}</p>
            {company.address ? <p className="text-[11px] text-zinc-500">{company.address}</p> : null}
            <p className="text-[11px] text-zinc-500">
              CNPJ {company.cnpj || "—"}
              {company.phone ? ` · ${company.phone}` : ""}
            </p>
            <p className="text-[11px] text-zinc-500">{when}</p>
            <p className="mt-1 text-xs">
              {sale.comandaNumber ? `Comanda ${sale.comandaNumber}` : "Venda de balcão"}
            </p>
          </div>
          <div className="my-2 border-t border-dashed border-zinc-300" />
          <ul className="space-y-1.5">
            {sale.lines.map((l, i) => (
              <li key={`${l.name}-${i}`} className="flex justify-between gap-3">
                <span>
                  {l.name}
                  <span className="block text-[10px] text-zinc-500">
                    {l.grams ? `${l.grams}g` : `${l.quantity ?? 1}×`}
                    {l.unitPrice != null ? ` · ${formatBRL(l.unitPrice)}` : ""}
                  </span>
                </span>
                <span className="shrink-0">{formatBRL(l.subtotal)}</span>
              </li>
            ))}
          </ul>
          <div className="my-2 border-t border-dashed border-zinc-300" />
          <div className="flex justify-between text-zinc-600">
            <span>Subtotal</span>
            <span>{formatBRL(subtotal)}</span>
          </div>
          {sale.discountAmount ? (
            <div className="flex justify-between text-zinc-600">
              <span>Desconto</span>
              <span>− {formatBRL(sale.discountAmount)}</span>
            </div>
          ) : null}
          <div className="mt-1 flex justify-between text-base font-extrabold">
            <span>Total</span>
            <span>{formatBRL(sale.total)}</span>
          </div>
          <div className="my-2 border-t border-dashed border-zinc-300" />
          {payments.map((p, i) => (
            <div key={`${p.method}-${i}`} className="flex justify-between">
              <span>
                {paymentMethodLabel(p.method)}
                {p.authCode ? ` · ${p.authCode}` : ""}
              </span>
              <span>{formatBRL(p.amount)}</span>
            </div>
          ))}
          {sale.changeGiven && sale.changeGiven > 0 ? (
            <>
              <div className="flex justify-between text-zinc-600">
                <span>Recebido</span>
                <span>{formatBRL(sale.amountTendered ?? 0)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Troco</span>
                <span>{formatBRL(sale.changeGiven)}</span>
              </div>
            </>
          ) : null}
          <div className="my-2 border-t border-dashed border-zinc-300" />
          <p className="text-center text-[10px] text-zinc-500">
            {sale.chave_nota
              ? `NFC-e (simulação) · ${sale.chave_nota}`
              : "Cupom não fiscal · simulação"}
          </p>
          <p className="mt-2 text-center text-[11px]">Obrigado e volte sempre</p>
        </div>

        <div className="space-y-2 border-t border-zinc-700 px-4 py-3">
          <p className="text-center text-[11px] text-zinc-400">
            {printStatus?.printed
              ? `Enviado para ${printStatus.printer || "a impressora"}.`
              : printStatus?.reason || "Prévia do cupom — impressora ainda não ligada."}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Fechar
            </Button>
            <Button
              type="button"
              className="flex-1 bg-brand hover:bg-brand-light"
              onClick={() => printSaleReceiptDialog(company, sale)}
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
