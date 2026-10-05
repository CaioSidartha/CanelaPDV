"use client";

import { Truck } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function DeliveryPage() {
  return (
    <div className="p-8 lg:p-12">
      <h1 className="font-display text-3xl font-semibold text-zinc-100">Delivery</h1>
      <p className="mt-2 max-w-xl text-sm text-zinc-400">
        Módulo previsto para cardápio online, endereço e pagamento na entrega ou PIX
        antecipado. O fluxo de venda reutilizará o mesmo núcleo fiscal da bancada/PDV. Por ora o
        menu lateral prioriza Estoque; esta página continua acessível pelo endereço{" "}
        <span className="font-mono text-zinc-300">/delivery</span>.
      </p>
      <div className="panel-glass mt-10 flex flex-col items-center justify-center border border-dashed border-white/15 py-20 shadow-card">
        <Truck className="mb-4 h-12 w-12 text-brand/40" />
        <p className="text-zinc-500">Em construção</p>
        <Button className="mt-6" variant="secondary" disabled>
          Abrir cardápio público
        </Button>
      </div>
    </div>
  );
}
