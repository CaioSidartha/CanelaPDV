"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Plus, Wallet, X } from "lucide-react";
import {
  PaymentMethodIcon,
  paymentMethodLabel,
} from "@/components/payment/PaymentMethodDisplay";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { startTerminalPayment } from "@/lib/hardware/payment";
import { cn, formatBRL } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { PaymentMethod, SalePaymentPart } from "@/types";

const METHODS: PaymentMethod[] = ["dinheiro", "pix", "cartao_debito", "cartao_credito"];

const METHOD_BTN: Record<PaymentMethod, string> = {
  dinheiro:
    "border-emerald-500/50 bg-emerald-500/15 text-emerald-50 hover:bg-emerald-500/25 data-[active=true]:border-brand data-[active=true]:ring-2 data-[active=true]:ring-brand/50",
  pix:
    "border-[#32BCAD]/50 bg-[#32BCAD]/12 text-[#dffaf6] hover:bg-[#32BCAD]/22 data-[active=true]:border-brand data-[active=true]:ring-2 data-[active=true]:ring-brand/50",
  cartao_debito:
    "border-sky-500/45 bg-sky-500/12 text-sky-50 hover:bg-sky-500/22 data-[active=true]:border-brand data-[active=true]:ring-2 data-[active=true]:ring-brand/50",
  cartao_credito:
    "border-sky-500/45 bg-sky-500/12 text-sky-50 hover:bg-sky-500/22 data-[active=true]:border-brand data-[active=true]:ring-2 data-[active=true]:ring-brand/50",
};

type Props = {
  total: number;
  busy?: boolean;
  disabled?: boolean;
  onConfirm: (opts: {
    payments: SalePaymentPart[];
    discountAmount: number;
    amountTendered?: number;
    changeGiven?: number;
    primary: PaymentMethod;
  }) => void | Promise<void>;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

type PartDraft = { method: PaymentMethod; amount: string };

function computeSettlement(due: number, parts: PartDraft[]) {
  const moneyIdx = parts.findIndex((p) => p.method === "dinheiro");
  let nonMoney = 0;
  const otherParts: { method: PaymentMethod; amount: number }[] = [];
  parts.forEach((p, i) => {
    if (i === moneyIdx) return;
    const amount = round2(Number(p.amount.replace(",", ".")) || 0);
    if (amount <= 0) return;
    nonMoney = round2(nonMoney + amount);
    otherParts.push({ method: p.method, amount });
  });

  const moneyDue = round2(Math.max(0, due - nonMoney));
  const tenderedRaw =
    moneyIdx >= 0 ? Number(parts[moneyIdx]!.amount.replace(",", ".")) || 0 : 0;
  const tendered = round2(tenderedRaw);
  const hasMoney = moneyIdx >= 0 && tendered > 0;
  const moneyApplied = hasMoney ? round2(Math.min(tendered, moneyDue)) : 0;
  const change = hasMoney && tendered > moneyApplied ? round2(tendered - moneyApplied) : 0;
  const paid = round2(nonMoney + moneyApplied);
  const remaining = round2(due - paid);

  const finalParts: SalePaymentPart[] = [...otherParts];
  if (moneyApplied > 0) {
    finalParts.unshift({ method: "dinheiro", amount: moneyApplied });
  }

  return {
    moneyIdx,
    tendered,
    moneyDue,
    moneyApplied,
    change,
    hasMoney,
    paid,
    remaining,
    finalParts,
  };
}

function SplitPaymentModal({
  due,
  open,
  working,
  onClose,
  onComplete,
}: {
  due: number;
  open: boolean;
  working: boolean;
  onClose: () => void;
  onComplete: (parts: PartDraft[]) => void;
}) {
  const [entries, setEntries] = useState<PartDraft[]>([]);
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [amountStr, setAmountStr] = useState("");

  const allocated = useMemo(
    () =>
      round2(
        entries.reduce((s, e) => s + (Number(e.amount.replace(",", ".")) || 0), 0),
      ),
    [entries],
  );
  const remaining = round2(Math.max(0, due - allocated));

  useEffect(() => {
    if (!open) return;
    setEntries([]);
    setMethod("pix");
    setAmountStr("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (entries.length > 0 && remaining > 0.02 && !amountStr) {
      setAmountStr(String(remaining));
    }
  }, [open, entries.length, remaining, amountStr]);

  if (!open) return null;

  const amount = round2(Number(amountStr.replace(",", ".")) || 0);
  const canAdd = amount > 0 && amount <= remaining + 0.02;
  const afterAdd = round2(remaining - amount);

  const addEntry = () => {
    if (!canAdd) return;
    const next = [...entries, { method, amount: String(amount) }];
    if (afterAdd <= 0.02) {
      onComplete(next);
      onClose();
      return;
    }
    setEntries(next);
    const used = new Set(next.map((e) => e.method));
    const nextMethod = METHODS.find((m) => !used.has(m)) ?? "dinheiro";
    setMethod(nextMethod);
    setAmountStr(String(afterAdd));
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <p className="font-semibold text-zinc-100">Pagamento misto</p>
            <p className="text-xs text-zinc-500">
              Total {formatBRL(due)}
              {entries.length > 0 && ` · restante ${formatBRL(remaining)}`}
            </p>
          </div>
          <button
            type="button"
            disabled={working}
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {entries.length > 0 && (
          <ul className="space-y-1 border-b border-white/10 px-4 py-3 text-sm">
            {entries.map((e, i) => (
              <li key={i} className="flex justify-between text-zinc-300">
                <span>{paymentMethodLabel(e.method)}</span>
                <span className="font-medium text-brand-light">
                  {formatBRL(Number(e.amount.replace(",", ".")) || 0)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-3 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            {entries.length === 0 ? "1ª forma" : `${entries.length + 1}ª forma`}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {METHODS.map((m) => (
              <button
                key={m}
                type="button"
                disabled={working || entries.some((e) => e.method === m)}
                data-active={method === m}
                onClick={() => setMethod(m)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-2.5 text-xs font-semibold transition disabled:opacity-35",
                  METHOD_BTN[m],
                )}
              >
                <PaymentMethodIcon method={m} className="h-4 w-4" />
                {paymentMethodLabel(m)}
              </button>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-500">
              Valor nesta forma
            </label>
            <Input
              inputMode="decimal"
              value={amountStr}
              disabled={working}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder={remaining > 0 ? String(remaining) : "0"}
              className="h-10"
            />
            {remaining > 0 && (
              <button
                type="button"
                disabled={working}
                onClick={() => setAmountStr(String(remaining))}
                className="mt-1 text-xs text-brand-light hover:underline"
              >
                Usar restante ({formatBRL(remaining)})
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 border-t border-white/10 px-4 py-3">
          <Button type="button" variant="secondary" className="flex-1" disabled={working} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="flex-1 bg-brand hover:bg-brand-light"
            disabled={working || !canAdd}
            onClick={addEntry}
          >
            {afterAdd <= 0.02 ? "Aplicar e fechar" : "Próxima forma"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PaymentCheckoutPanel({ total, busy, disabled, onConfirm }: Props) {
  const hardware = useAppStore((s) => s.hardware);
  const session = useAppStore((s) => s.session);
  const canDiscount = session?.role === "admin" || session?.role === "gerente";

  const [discountStr, setDiscountStr] = useState("");
  const [parts, setParts] = useState<PartDraft[]>([{ method: "dinheiro", amount: "" }]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);
  const [terminalMsg, setTerminalMsg] = useState<string | null>(null);
  const [localBusy, setLocalBusy] = useState(false);

  const discount = Math.max(0, Number(discountStr.replace(",", ".")) || 0);
  const due = round2(Math.max(0, total - Math.min(total, discount)));
  const isSplit = parts.length > 1;

  const settlement = useMemo(() => computeSettlement(due, parts), [due, parts]);

  const working = busy || localBusy;
  const ok = Math.abs(settlement.remaining) < 0.02 && settlement.finalParts.length > 0;

  const runConfirm = async (snapshot?: PartDraft[]) => {
    const draft = snapshot ?? parts;
    const st = computeSettlement(due, draft);
    if (due <= 0) return;
    if (Math.abs(st.remaining) > 0.02) return;
    if (!st.finalParts.length) return;

    setLocalBusy(true);
    setTerminalMsg(null);
    const enriched: SalePaymentPart[] = [];
    const manualMachine = hardware.paymentTerminal.provider !== "simulacao";

    for (const p of st.finalParts) {
      if (
        !manualMachine &&
        hardware.paymentTerminal.enabled &&
        (p.method === "pix" || p.method === "cartao_credito" || p.method === "cartao_debito")
      ) {
        const type =
          p.method === "pix" ? "pix" : p.method === "cartao_credito" ? "credito" : "debito";
        setTerminalMsg(
          `Aguardando maquininha · ${paymentMethodLabel(p.method)} · ${formatBRL(p.amount)}…`,
        );
        const res = await startTerminalPayment(hardware, { amount: p.amount, type });
        if (!res.ok) {
          setTerminalMsg(res.error);
          setLocalBusy(false);
          return;
        }
        if (!res.approved) {
          setTerminalMsg(res.reason);
          setLocalBusy(false);
          return;
        }
        enriched.push({
          method: p.method,
          amount: p.amount,
          authCode: res.authCode,
          provider: res.provider,
        });
      } else {
        enriched.push({ method: p.method, amount: p.amount });
      }
    }

    await onConfirm({
      payments: enriched,
      discountAmount: Math.min(total, discount),
      amountTendered: st.hasMoney ? st.tendered : undefined,
      changeGiven: st.change > 0 ? st.change : undefined,
      primary: enriched[0]?.method ?? "dinheiro",
    });
    setLocalBusy(false);
    setTerminalMsg(null);
    setParts([{ method: "dinheiro", amount: "" }]);
    setSelectedMethod(null);
  };

  const pickMethod = async (method: PaymentMethod) => {
    if (working || disabled || due <= 0) return;
    setSelectedMethod(method);

    if (isSplit) return;

    if (method === "dinheiro") {
      setParts([{ method: "dinheiro", amount: "" }]);
      return;
    }

    const single = [{ method, amount: String(due) }];
    setParts(single);
    await runConfirm(single);
  };

  const onCashAmountChange = (value: string) => {
    setParts([{ method: "dinheiro", amount: value }]);
    setSelectedMethod("dinheiro");
  };

  return (
    <>
      <SplitPaymentModal
        due={due}
        open={splitOpen}
        working={working}
        onClose={() => setSplitOpen(false)}
        onComplete={(draft) => {
          setParts(draft);
          setSelectedMethod(null);
        }}
      />

      <div className="space-y-3 border-t border-white/10 px-4 py-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Total</p>
            <p className="font-display text-4xl text-brand-light">{formatBRL(due)}</p>
            {discount > 0 && (
              <p className="text-xs text-zinc-500">
                Subtotal {formatBRL(total)} · desconto {formatBRL(Math.min(total, discount))}
              </p>
            )}
          </div>
          {canDiscount && (
            <div className="w-28">
              <label className="mb-1 block text-[11px] text-zinc-500">Desconto R$</label>
              <Input
                inputMode="decimal"
                value={discountStr}
                disabled={working || disabled}
                onChange={(e) => setDiscountStr(e.target.value)}
                className="h-9"
                placeholder="0"
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Pagamento {isSplit ? "misto" : ""}
            </p>
            <button
              type="button"
              disabled={working || disabled || due <= 0}
              onClick={() => setSplitOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-light disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              Outra forma
            </button>
          </div>

          {!isSplit && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={working || disabled || due <= 0}
                  data-active={selectedMethod === m}
                  onClick={() => void pickMethod(m)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-lg border-2 px-2 py-3 text-xs font-semibold transition disabled:opacity-40",
                    METHOD_BTN[m],
                  )}
                >
                  <PaymentMethodIcon method={m} className="h-4 w-4" />
                  {paymentMethodLabel(m)}
                </button>
              ))}
            </div>
          )}

          {isSplit && (
            <ul className="space-y-1 rounded-lg border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm">
              {parts.map((p, i) => (
                <li key={i} className="flex justify-between text-zinc-200">
                  <span>{paymentMethodLabel(p.method)}</span>
                  <span className="font-medium text-brand-light">
                    {formatBRL(Number(p.amount.replace(",", ".")) || 0)}
                  </span>
                </li>
              ))}
              <li className="flex justify-end pt-1">
                <button
                  type="button"
                  className="text-xs text-zinc-500 hover:text-red-300"
                  disabled={working}
                  onClick={() => {
                    setParts([{ method: "dinheiro", amount: "" }]);
                    setSelectedMethod(null);
                  }}
                >
                  Limpar misto
                </button>
              </li>
            </ul>
          )}

          {(selectedMethod === "dinheiro" || (isSplit && parts.some((p) => p.method === "dinheiro"))) &&
            !isSplit && (
              <Input
                inputMode="decimal"
                value={parts[0]?.amount ?? ""}
                disabled={working || disabled}
                onChange={(e) => onCashAmountChange(e.target.value)}
                placeholder="Quanto o cliente passou"
                className="h-10"
                autoFocus
              />
            )}

          <p
            className={cn(
              "text-xs",
              ok ? "text-emerald-300" : "text-amber-200",
            )}
          >
            {ok
              ? settlement.change > 0
                ? `Pronto · troco ${formatBRL(settlement.change)}`
                : "Pagamento fecha o total."
              : settlement.remaining > 0
                ? `Falta ${formatBRL(settlement.remaining)}`
                : settlement.paid <= 0
                  ? "Dinheiro: informe o recebido. PIX/cartão: clique na forma para cobrar o total."
                  : `Ajuste as formas (diferença ${formatBRL(Math.abs(settlement.remaining))})`}
          </p>
        </div>

        {settlement.hasMoney && (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/25 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-emerald-100">
                <Wallet className="h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Recebido {formatBRL(settlement.tendered)}</p>
                  <p className="text-[11px] text-emerald-200/70">
                    Conta {formatBRL(settlement.moneyApplied)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Troco</p>
                <p className="font-display text-3xl text-emerald-300">
                  {formatBRL(settlement.change)}
                </p>
              </div>
            </div>
          </div>
        )}

        {terminalMsg && (
          <div className="flex items-start gap-2 rounded-xl border border-sky-500/30 bg-sky-950/30 px-3 py-2 text-sm text-sky-100">
            <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{terminalMsg}</span>
          </div>
        )}

        {(selectedMethod === "dinheiro" || isSplit) && (
          <Button
            type="button"
            className="w-full bg-brand hover:bg-brand-light"
            disabled={working || disabled || due <= 0 || !ok}
            onClick={() => void runConfirm()}
          >
            {working
              ? "Processando…"
              : settlement.change > 0
                ? `Confirmar · troco ${formatBRL(settlement.change)}`
                : "Confirmar pagamento"}
          </Button>
        )}

        <p className="text-center text-[11px] text-zinc-500">
          {hardware.paymentTerminal.provider === "simulacao"
            ? "PIX e cartão cobram o total com um clique. Misture formas em «Outra forma»."
            : "A maquininha desta loja ainda é operada no aparelho. Aqui só registramos a forma."}
        </p>
      </div>
    </>
  );
}
