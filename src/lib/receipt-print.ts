import { paymentMethodLabel } from "@/components/payment/PaymentMethodDisplay";
import { DEMO_STORE_NAME } from "@/config/brand";
import { formatBRL } from "@/lib/utils";
import type { CompanySettings, CompletedSale } from "@/types";

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function lineQty(line: CompletedSale["lines"][number]) {
  if (line.grams) return `${line.grams}g`;
  const q = line.quantity ?? 1;
  return `${q}×`;
}

export function buildSaleReceiptHtml(company: CompanySettings, sale: CompletedSale): string {
  const when = new Date(sale.createdAt).toLocaleString("pt-BR");
  const subtotal = sale.lines.reduce((s, l) => s + l.subtotal, 0);
  const payments = sale.payments?.length
    ? sale.payments
    : [{ method: sale.payment_method, amount: sale.total }];
  const rows = sale.lines
    .map(
      (l) => `<tr>
        <td>${escapeHtml(l.name)}<div class="muted">${escapeHtml(lineQty(l))}${
          l.unitPrice != null ? ` · ${escapeHtml(formatBRL(l.unitPrice))}` : ""
        }</div></td>
        <td class="right">${escapeHtml(formatBRL(l.subtotal))}</td>
      </tr>`,
    )
    .join("");
  const payRows = payments
    .map(
      (p) =>
        `<tr><td>${escapeHtml(paymentMethodLabel(p.method))}${
          p.authCode ? ` · ${escapeHtml(p.authCode)}` : ""
        }</td><td class="right">${escapeHtml(formatBRL(p.amount))}</td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Cupom</title>
  <style>
    @page { margin: 4mm; size: 80mm auto; }
    body { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: #111; width: 72mm; margin: 0 auto; font-size: 12px; }
    .center { text-align: center; }
    .muted { color: #555; font-size: 11px; }
    h1 { font-size: 16px; margin: 0; }
    .sep { border-top: 1px dashed #999; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; padding: 2px 0; }
    .right { text-align: right; white-space: nowrap; }
    .total { font-size: 16px; font-weight: 800; }
  </style>
</head>
<body>
  <div class="center">
    <h1>${escapeHtml(company.name || DEMO_STORE_NAME)}</h1>
    <div class="muted">${escapeHtml(company.address || "")}</div>
    <div class="muted">CNPJ ${escapeHtml(company.cnpj || "—")} · ${escapeHtml(company.phone || "")}</div>
    <div class="muted">${escapeHtml(when)}</div>
    ${sale.comandaNumber ? `<div>Comanda <strong>${escapeHtml(sale.comandaNumber)}</strong></div>` : `<div class="muted">Venda de balcão</div>`}
  </div>
  <div class="sep"></div>
  <table>${rows}</table>
  <div class="sep"></div>
  <table>
    <tr><td>Subtotal</td><td class="right">${escapeHtml(formatBRL(subtotal))}</td></tr>
    ${
      sale.discountAmount
        ? `<tr><td>Desconto</td><td class="right">− ${escapeHtml(formatBRL(sale.discountAmount))}</td></tr>`
        : ""
    }
    <tr><td class="total">Total</td><td class="right total">${escapeHtml(formatBRL(sale.total))}</td></tr>
  </table>
  <div class="sep"></div>
  <table>${payRows}</table>
  ${
    sale.changeGiven && sale.changeGiven > 0
      ? `<table><tr><td>Recebido</td><td class="right">${escapeHtml(formatBRL(sale.amountTendered ?? 0))}</td></tr>
         <tr><td>Troco</td><td class="right"><strong>${escapeHtml(formatBRL(sale.changeGiven))}</strong></td></tr></table>`
      : ""
  }
  ${
    sale.chave_nota
      ? `<div class="sep"></div><div class="muted center">NFC-e (simulação)<br/>${escapeHtml(sale.chave_nota)}</div>`
      : `<div class="sep"></div><div class="muted center">Cupom não fiscal · simulação</div>`
  }
  <div class="center muted" style="margin-top:10px">Obrigado e volte sempre</div>
</body>
</html>`;
}

export type PrintAttempt =
  | { printed: true; printer?: string }
  | { printed: false; reason: string };

/** Tenta impressão silenciosa no Electron. Sem impressora, só devolve o motivo. */
export async function trySilentPrint(
  company: CompanySettings,
  sale: CompletedSale,
): Promise<PrintAttempt> {
  const html = buildSaleReceiptHtml(company, sale);
  const printHtml = window.padariaDesktop?.printHtml;
  if (!printHtml) {
    return { printed: false, reason: "App no navegador — use o botão Imprimir." };
  }
  try {
    const res = await printHtml(html);
    if (res.printed) return { printed: true, printer: res.printer };
    return { printed: false, reason: res.reason || "Nenhuma impressora encontrada." };
  } catch (e) {
    return {
      printed: false,
      reason: e instanceof Error ? e.message : "Falha ao imprimir.",
    };
  }
}

/** Abre o diálogo do sistema (quando há impressora ou PDF). */
export function printSaleReceiptDialog(company: CompanySettings, sale: CompletedSale): void {
  if (typeof window === "undefined") return;
  const html = buildSaleReceiptHtml(company, sale);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Cupom");
  iframe.style.cssText =
    "position:fixed;left:-9999px;top:0;width:80mm;min-height:120mm;border:0;opacity:0;pointer-events:none";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const cleanup = () => {
    try {
      iframe.remove();
    } catch {
      /* ignore */
    }
  };
  requestAnimationFrame(() => {
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } finally {
        setTimeout(cleanup, 800);
      }
    }, 120);
  });
}
