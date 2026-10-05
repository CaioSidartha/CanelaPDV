"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  PaymentMethodIcon,
  paymentMethodLabel,
} from "@/components/payment/PaymentMethodDisplay";
import { Button } from "@/components/ui/Button";
import { formatBRL } from "@/lib/utils";
import type { ComandaState, PaymentMethod, StockActionResult } from "@/types";

const PAY_METHODS: PaymentMethod[] = [
  "dinheiro",
  "pix",
  "cartao_credito",
  "cartao_debito",
];

const PAY_BTN: Record<PaymentMethod, string> = {
  dinheiro:
    "border-emerald-500/45 bg-emerald-500/15 text-emerald-50 hover:border-emerald-400/70 hover:bg-emerald-500/25",
  pix: "border-[#32BCAD]/50 bg-[#32BCAD]/15 text-[#dffaf6] hover:border-[#32BCAD] hover:bg-[#32BCAD]/25",
  cartao_credito:
    "border-sky-500/45 bg-sky-500/12 text-sky-50 hover:border-sky-400/65 hover:bg-sky-500/22",
  cartao_debito:
    "border-sky-500/45 bg-sky-500/12 text-sky-50 hover:border-sky-400/65 hover:bg-sky-500/22",
};

type Props = {
  open: boolean;
  onClose: () => void;
  total: number;
  /** Quando true, desabilita ações (ex.: envio em andamento). */
  busy?: boolean;
  comandas: ComandaState[];
  onComanda: (comandaId: string | null, note: string, customerName: string) => StockActionResult;
  /** Permite pagamento direto (canal Bancada), sem abrir comanda. */
  caixaAberto: boolean;
  onBancada: (payment: PaymentMethod) => Promise<{ ok: true } | { ok: false; error: string }>;
};

const fieldClass =
  "w-full rounded-2xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-sm text-zinc-100 outline-none backdrop-blur-sm placeholder:text-zinc-500 focus:border-brand/45 focus:ring-2 focus:ring-orange-500/15";

type FinishMode = "comanda" | "bancada";

export function FinalizeOrderModal({
  open,
  onClose,
  total,
  busy = false,
  comandas,
  onComanda,
  caixaAberto,
  onBancada,
}: Props) {
  const [mode, setMode] = useState<FinishMode>("comanda");
  const [comandaSelect, setComandaSelect] = useState<string>("nova");
  const [customerName, setCustomerName] = useState("");
  const [observacao, setObservacao] = useState("");
  const [localErr, setLocalErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode("comanda");
    setComandaSelect("nova");
    setCustomerName("");
    setObservacao("");
    setLocalErr(null);
  }, [open]);

  const abertas = useMemo(
    () => comandas.filter((c) => c.status === "aberta" && c.lines.length > 0),
    [comandas]
  );

  if (!open) return null;

  const resolveComandaId = (): string | null => {
    if (comandaSelect === "nova") return null;
    return comandaSelect.trim() || null;
  };

  const handleConfirm = async () => {
    setLocalErr(null);
    const note = observacao.trim();

    const comandaId = resolveComandaId();
    const res = onComanda(comandaId, note, customerName.trim());
    if (!res.ok) {
      setLocalErr(res.error);
      return;
    }
    onClose();
  };

  const handleBancadaPay = async (method: PaymentMethod) => {
    setLocalErr(null);
    const res = await onBancada(method);
    if (!res.ok) {
      setLocalErr(res.error);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]">
      <div className="panel-glass relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden shadow-2xl">
        <div className="panel-glass-inner flex max-h-[92vh] flex-col">
          <header className="flex items-start justify-between border-b border-white/10 px-5 py-4">
            <h2 className="font-display text-xl font-semibold tracking-tight text-zinc-100">
              Finalizar pedido
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">
            {localErr && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-100">
                {localErr}
              </div>
            )}

            <div className="mb-5 flex rounded-xl border border-white/10 bg-zinc-950/40 p-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => setMode("comanda")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:opacity-45 ${
                  mode === "comanda"
                    ? "bg-brand text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Comanda
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setMode("bancada")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:opacity-45 ${
                  mode === "bancada"
                    ? "bg-brand text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Bancada
              </button>
            </div>

            {mode === "comanda" ? (
              <>
                <p className="mb-2 text-sm font-semibold text-zinc-200">Gerar comanda</p>
                <div className="mb-6 space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-300">
                      Nome (opcional)
                    </label>
                    <input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ex.: João / Família Maria"
                      className={fieldClass}
                      disabled={busy}
                    />
                    <p className="mt-1 text-xs text-zinc-500">
                      Ajuda o caixa a identificar e confirmar a comanda.
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-300">Comanda</label>
                    <select
                      value={comandaSelect}
                      onChange={(e) => setComandaSelect(e.target.value)}
                      className={fieldClass}
                    >
                      <option value="nova">Criar nova comanda</option>
                      {abertas.map((c) => {
                        const sub = c.lines.reduce((s, l) => s + l.subtotal, 0);
                        return (
                          <option key={c.id} value={c.id}>
                            Comanda {c.number} — {formatBRL(sub)}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <p className="text-xs text-zinc-500">
                    A comanda fica aberta para adicionar mais itens e fechar depois no caixa.
                  </p>
                </div>

                <p className="mb-2 text-sm font-semibold text-zinc-200">Observações</p>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Alguma observação?"
                  rows={3}
                  className={`${fieldClass} mb-4 resize-none`}
                />
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-zinc-300">
                  Pagamento na hora, sem comanda. A venda entra como{" "}
                  <span className="font-semibold text-brand-light">Bancada</span> no turno de caixa
                  (itens rápidos, ex.: conveniência).
                </p>
                {!caixaAberto && (
                  <p className="rounded-xl border border-orange-500/25 bg-orange-950/35 px-3 py-2 text-xs text-orange-100/95">
                    Caixa fechado — abra um turno em Caixa &amp; turno para cobrar na bancada.
                  </p>
                )}
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Forma de pagamento
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PAY_METHODS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      disabled={busy || !caixaAberto}
                      onClick={() => void handleBancadaPay(id)}
                      className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-3 py-3 text-sm font-medium transition disabled:opacity-45 ${PAY_BTN[id]}`}
                    >
                      <PaymentMethodIcon method={id} className="h-4 w-4 shrink-0" />
                      {paymentMethodLabel(id)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zinc-500">
                  Emissão de NFC-e após confirmação do pagamento.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 bg-zinc-950/30 px-5 py-3 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-zinc-300">Total</span>
              <span className="font-display text-2xl font-bold text-brand-light">
                {formatBRL(total)}
              </span>
            </div>
          </div>

          <footer className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
            <Button variant="secondary" type="button" onClick={onClose} disabled={busy}>
              Cancelar
            </Button>
            {mode === "comanda" && (
              <Button
                type="button"
                variant="primary"
                className="min-w-[160px]"
                disabled={busy}
                onClick={() => void handleConfirm()}
              >
                {busy ? "Processando…" : "Confirmar pedido"}
              </Button>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}
