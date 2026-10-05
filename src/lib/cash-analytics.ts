import type {
  CashMovement,
  CashRegisterSession,
  CompletedSale,
  OrderChannel,
  PaymentMethod,
} from "@/types";

export function getActiveCashSession(
  sessions: CashRegisterSession[] | undefined,
): CashRegisterSession | null {
  if (!sessions?.length) return null;
  return sessions.find((s) => s.status === "aberto") ?? null;
}

export function salesInSession(
  sales: CompletedSale[],
  sessionId: string,
): CompletedSale[] {
  return sales.filter((s) => s.caixaId === sessionId && s.status === "autorizada");
}

export type PaymentTotals = Record<PaymentMethod, number>;

export function sumPayments(sales: CompletedSale[]): PaymentTotals {
  const z: PaymentTotals = {
    dinheiro: 0,
    pix: 0,
    cartao_credito: 0,
    cartao_debito: 0,
  };
  for (const s of sales) {
    if (s.payments?.length) {
      for (const p of s.payments) {
        z[p.method] = (z[p.method] ?? 0) + p.amount;
      }
    } else {
      z[s.payment_method] += s.total;
    }
  }
  return z;
}

/** Canais persistidos antigos (`balcao`) passam a contar como bancada. */
export function normalizeSaleChannel(channel: string): OrderChannel {
  if (channel === "mesa") return "mesa";
  if (channel === "delivery") return "delivery";
  return "bancada";
}

export function channelCounts(sales: CompletedSale[]): Record<OrderChannel, number> {
  const m: Record<OrderChannel, number> = { bancada: 0, mesa: 0, delivery: 0 };
  for (const s of sales) {
    m[normalizeSaleChannel(s.channel)] += 1;
  }
  return m;
}

/** Valor esperado em dinheiro físico no gaveta (fundo + vendas dinheiro − sangrias + suprimentos + ajustes). */
export function expectedDrawerCash(
  session: CashRegisterSession,
  sales: CompletedSale[],
  movements: CashMovement[],
): number {
  const list = salesInSession(sales, session.id);
  const din = list.reduce((a, s) => {
    if (s.payments?.length) {
      return a + s.payments.filter((p) => p.method === "dinheiro").reduce((x, p) => x + p.amount, 0);
    }
    return s.payment_method === "dinheiro" ? a + s.total : a;
  }, 0);
  const init = session.initialFloat ?? 0;
  let delta = 0;
  for (const m of movements.filter((x) => x.sessionId === session.id)) {
    if (m.kind === "sangria") delta -= m.amount;
    else if (m.kind === "suprimento") delta += m.amount;
    else delta += m.amount;
  }
  return Math.round((init + din + delta) * 100) / 100;
}

export function topProductsByRevenue(
  sales: CompletedSale[],
  limit = 12,
): { name: string; revenue: number; qty: number }[] {
  const rev = new Map<string, number>();
  const qty = new Map<string, number>();
  for (const s of sales) {
    for (const l of s.lines ?? []) {
      rev.set(l.name, (rev.get(l.name) ?? 0) + l.subtotal);
      qty.set(l.name, (qty.get(l.name) ?? 0) + 1);
    }
  }
  return [...rev.entries()]
    .map(([name, revenue]) => ({ name, revenue, qty: qty.get(name) ?? 0 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function minutesUntil(iso: string): number {
  const t = new Date(iso).getTime();
  return Math.round((t - Date.now()) / 60000);
}
