import JsBarcode from "jsbarcode";
import { toBarcodeSafeCode } from "@/lib/comanda-code";
import type { CompanySettings } from "@/types";

export type ComandaSlip = {
  code: string;
  number: string;
  createdAtISO: string;
  customerName?: string;
};

export function buildBarcodeSvg(code: string): string {
  const safe = toBarcodeSafeCode(code) || code.replace(/[^\x20-\x7E]/g, "");
  if (!safe) {
    throw new Error("Código da comanda inválido para barcode.");
  }
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, safe, {
    format: "CODE128",
    displayValue: false,
    height: 48,
    margin: 0,
  });
  return svg.outerHTML;
}

export function buildComandaSlipHtml(
  company: CompanySettings,
  slip: ComandaSlip,
  barcodeSvg: string,
): string {
  const date = new Date(slip.createdAtISO);
  const name = slip.customerName?.trim();
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Comanda ${escapeHtml(slip.number)}</title>
      <style>
        @page { margin: 6mm; }
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color: #111; }
        .center { text-align: center; }
        .muted { color: #555; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .sep { border-top: 1px dashed #bbb; margin: 10px 0; }
        .big { font-size: 54px; font-weight: 800; letter-spacing: 1px; line-height: 1; }
        .h { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
        .small { font-size: 12px; }
        .name { font-size: 16px; font-weight: 700; margin-top: 6px; }
        svg { width: 100%; height: auto; }
      </style>
    </head>
    <body>
      <div class="center">
        <div class="h">${escapeHtml(company.name || "Comanda")}</div>
        <div class="small muted">CNPJ: ${escapeHtml(company.cnpj || "—")}</div>
        <div class="small muted">${escapeHtml(date.toLocaleString("pt-BR"))}</div>
        ${name ? `<div class="name">${escapeHtml(name)}</div>` : ""}
      </div>
      <div class="sep"></div>
      <div class="center">
        <div class="mono small">Código: <strong>${escapeHtml(toBarcodeSafeCode(slip.code) || slip.code)}</strong></div>
        <div style="margin: 10px 0">${barcodeSvg}</div>
        <div class="big">${escapeHtml(slip.number)}</div>
      </div>
      <div class="sep"></div>
      <div class="center muted small">
        Apresente esta comanda para adicionar itens e fechar no caixa.
      </div>
    </body>
  </html>`;
}

export function printComandaSlip(company: CompanySettings, slip: ComandaSlip): void {
  if (typeof window === "undefined") return;
  const barcodeSvg = buildBarcodeSvg(slip.code);
  const html = buildComandaSlipHtml(company, slip, barcodeSvg);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Comanda para impressão");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;left:-9999px;top:0;width:80mm;min-height:100mm;border:0;opacity:0;pointer-events:none";
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

  const printFrame = () => {
    try {
      win.focus();
      win.print();
    } finally {
      setTimeout(cleanup, 750);
    }
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(printFrame, 150);
    });
  });
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
