import type { CompletedSale } from "@/types";

function esc(cell: string | number | undefined | null): string {
  const s = cell == null ? "" : String(cell);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** CSV de vendas do período (abre no Excel). */
export function buildSalesCsv(sales: CompletedSale[], title = "Vendas"): string {
  const lines: string[][] = [[title], []];
  lines.push([
    "Data",
    "Hora",
    "Canal",
    "Total",
    "Desconto",
    "Pagamento",
    "Itens",
    "Chave",
    "Comanda",
  ]);
  for (const s of sales) {
    const d = new Date(s.createdAt);
    const pay = s.payments?.length
      ? s.payments.map((p) => `${p.method}:${p.amount}`).join(" | ")
      : s.payment_method;
    lines.push([
      d.toLocaleDateString("pt-BR"),
      d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      s.channel,
      String(s.total),
      String(s.discountAmount ?? 0),
      pay,
      String(s.itemCount),
      s.chave_nota || "",
      s.comandaNumber || "",
    ]);
  }
  return `\uFEFF${lines.map((row) => row.map(esc).join(";")).join("\n")}`;
}

export function buildAbcCsv(
  rows: {
    name: string;
    revenue: number;
    qty: number;
    share: number;
    cumulative: number;
    abc: string;
  }[],
): string {
  const lines: string[][] = [
    ["Curva ABC — produtos"],
    [],
    ["Classe", "Produto", "Receita", "Qtd", "%", "% acumulado"],
  ];
  for (const r of rows) {
    lines.push([
      r.abc,
      r.name,
      String(r.revenue),
      String(r.qty),
      `${(r.share * 100).toFixed(1)}%`,
      `${(r.cumulative * 100).toFixed(1)}%`,
    ]);
  }
  return `\uFEFF${lines.map((row) => row.map(esc).join(";")).join("\n")}`;
}
