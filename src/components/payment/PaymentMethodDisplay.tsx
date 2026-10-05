import type { PaymentMethod } from "@/types";
import { Banknote, CreditCard } from "lucide-react";

/** Cor aproximada da marca PIX (verde-azulado). */
export const PIX_COLOR_CLASS = "text-[#32BCAD]";

function PixGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.18l5.5 3.44v6.76L12 18.82l-5.5-3.44V7.62L12 4.18z" />
    </svg>
  );
}

const LABELS: Record<PaymentMethod, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_credito: "Crédito",
  cartao_debito: "Débito",
};

export function paymentMethodLabel(m: PaymentMethod): string {
  return LABELS[m];
}

export function PaymentMethodIcon({
  method,
  className = "h-4 w-4 shrink-0",
}: {
  method: PaymentMethod;
  className?: string;
}) {
  switch (method) {
    case "dinheiro":
      return <Banknote className={`${className} text-emerald-600`} aria-hidden />;
    case "pix":
      return <PixGlyph className={`${className} ${PIX_COLOR_CLASS}`} />;
    case "cartao_credito":
    case "cartao_debito":
      return <CreditCard className={`${className} text-sky-500`} aria-hidden />;
    default:
      return <Banknote className={className} aria-hidden />;
  }
}

export function PaymentMethodBadge({
  method,
  className = "",
}: {
  method: PaymentMethod;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs font-semibold ${className}`}
    >
      <PaymentMethodIcon method={method} className="h-3.5 w-3.5" />
      {paymentMethodLabel(method)}
    </span>
  );
}
