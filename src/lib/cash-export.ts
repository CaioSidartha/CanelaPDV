import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CashMovement, CashRegisterSession, CompletedSale } from "@/types";

function esc(cell: string | number | undefined | null): string {
  const s = cell == null ? "" : String(cell);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Monta CSV do turno (UTF-8 com BOM para Excel).
 * Inclui resumo, movimentações de caixa e vendas com linhas.
 */
export function buildSessionCsv(
  session: CashRegisterSession,
  sessionSales: CompletedSale[],
  movements: CashMovement[],
): string {
  const lines: string[][] = [];
  lines.push(["Relatório de turno — Canela"]);
  lines.push(["Turno ID", session.id]);
  lines.push([
    "Abertura",
    format(new Date(session.openedAt), "yyyy-MM-dd HH:mm:ss", { locale: ptBR }),
  ]);
  if (session.closedAt) {
    lines.push([
      "Fechamento",
      format(new Date(session.closedAt), "yyyy-MM-dd HH:mm:ss", { locale: ptBR }),
    ]);
  }
  if (session.openedBy) lines.push(["Responsável abertura", session.openedBy]);
  if (session.initialFloat != null) lines.push(["Fundo inicial (R$)", String(session.initialFloat)]);
  if (session.expectedDrawerAtClose != null) {
    lines.push(["Dinheiro esperado no fechamento (R$)", String(session.expectedDrawerAtClose)]);
  }
  if (session.countedDrawerCash != null) {
    lines.push(["Dinheiro contado (R$)", String(session.countedDrawerCash)]);
  }
  if (session.drawerDifference != null) {
    lines.push(["Diferença contado − esperado (R$)", String(session.drawerDifference)]);
  }
  lines.push([]);
  lines.push(["Movimentações de caixa"]);
  lines.push(["Data", "Tipo", "Valor (R$)", "Observação"]);
  for (const m of [...movements].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )) {
    lines.push([
      format(new Date(m.createdAt), "yyyy-MM-dd HH:mm:ss", { locale: ptBR }),
      m.kind,
      String(m.amount),
      m.note ?? "",
    ]);
  }
  lines.push([]);
  lines.push(["Vendas do turno"]);
  lines.push([
    "Data",
    "ID venda",
    "Canal",
    "Mesa",
    "Total (R$)",
    "Pagamento",
    "Itens",
    "Chave NFC-e",
  ]);
  for (const s of [...sessionSales].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )) {
    lines.push([
      format(new Date(s.createdAt), "yyyy-MM-dd HH:mm:ss", { locale: ptBR }),
      s.id,
      s.channel,
      s.mesaId != null ? String(s.mesaId) : "",
      String(s.total),
      s.payment_method,
      String(s.itemCount),
      s.chave_nota ?? "",
    ]);
  }
  lines.push([]);
  lines.push(["Linhas de produto (detalhado)"]);
  lines.push(["Venda ID", "Data venda", "Produto", "Subtotal (R$)", "Categoria"]);
  for (const s of [...sessionSales].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )) {
    for (const l of s.lines ?? []) {
      lines.push([
        s.id,
        format(new Date(s.createdAt), "yyyy-MM-dd HH:mm:ss", { locale: ptBR }),
        l.name,
        String(l.subtotal),
        l.categoryId ?? "",
      ]);
    }
  }

  const body = lines.map((row) => row.map(esc).join(",")).join("\r\n");
  return "\uFEFF" + body;
}

export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8;") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
