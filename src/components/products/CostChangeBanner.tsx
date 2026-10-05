"use client";

import { formatBRL } from "@/lib/utils";

type Props = {
  registeredCost: number;
  notaCost: number;
  onApplyNotaCost: () => void;
  /** Reserva altura fixa (painel NF) mesmo sem diferença visível. */
  reserveSlot?: boolean;
};

export function costDiffVisible(registeredCost: number, notaCost: number): boolean {
  const diff = Math.abs(notaCost - registeredCost);
  return registeredCost > 0 && notaCost > 0 && diff >= 0.005;
}

export function CostChangeBanner({
  registeredCost,
  notaCost,
  onApplyNotaCost,
  reserveSlot,
}: Props) {
  const visible = costDiffVisible(registeredCost, notaCost);
  if (!visible && !reserveSlot) return null;

  const increased = notaCost > registeredCost;
  return (
    <div
      className={`flex h-[54px] flex-col justify-center rounded-lg border px-2 text-[11px] leading-tight ${
        visible
          ? "border-amber-500/35 bg-amber-950/25"
          : "border-transparent bg-transparent"
      }`}
      aria-hidden={!visible}
    >
      {visible ? (
        <>
          <p className="font-medium text-amber-100">Diferença de custo (cadastro × nota)</p>
          <p className="text-zinc-400">
            Cadastro{" "}
            <span className="font-mono text-zinc-200">{formatBRL(registeredCost)}</span>
            {" · Nota "}
            <button
              type="button"
              onClick={onApplyNotaCost}
              className={`font-mono font-semibold underline-offset-2 hover:underline ${
                increased ? "text-red-400" : "text-emerald-400"
              }`}
              title="Clique para usar este custo"
            >
              {formatBRL(notaCost)}
            </button>
          </p>
        </>
      ) : null}
    </div>
  );
}
