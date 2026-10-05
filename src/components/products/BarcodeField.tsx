"use client";

import { Barcode } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { generateStoreBarcode } from "@/lib/store-barcode";
import { useAppStore } from "@/store/useAppStore";

type Props = {
  value: string;
  onChange: (value: string, meta?: { generated?: boolean }) => void;
  referenceHint?: string;
};

export function BarcodeField({ value, onChange, referenceHint }: Props) {
  const products = useAppStore((s) => s.products);
  const existing = products.map((p) => p.barcode ?? "").filter(Boolean);

  const generate = () => {
    onChange(generateStoreBarcode(existing), { generated: true });
  };

  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-500">Código de barras (EAN)</label>
      <p className="mb-1.5 text-[11px] text-zinc-500">
        É o mesmo da nota quando o fornecedor informa. Sem código na NF, digite ou gere um interno para o leitor do caixa.
      </p>
      <div className="flex flex-wrap gap-2">
        <Input
          className="min-w-[160px] flex-1 font-mono"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="789… ou código interno"
        />
        <Button type="button" variant="secondary" className="shrink-0 gap-1" onClick={generate}>
          <Barcode className="h-4 w-4" />
          Gerar código
        </Button>
      </div>
      {referenceHint ? (
        <p className="mt-1 text-[10px] text-brand-light/80">Código na nota: {referenceHint}</p>
      ) : null}
    </div>
  );
}
