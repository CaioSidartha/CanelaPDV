"use client";

import { Cable, CreditCard, Scale, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  PAYMENT_PROVIDER_LABELS,
  PAYMENT_PROVIDER_SETUP,
  SCALE_PROVIDER_LABELS,
  isScaleProviderReady,
} from "@/lib/hardware/defaults";
import { startTerminalPayment } from "@/lib/hardware/payment";
import { readScaleWeight } from "@/lib/hardware/scale";
import { formatBRL } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { PaymentTerminalProviderId, ScaleProviderId } from "@/types";
import { useState } from "react";

export function HardwareSettingsPanel() {
  const hardware = useAppStore((s) => s.hardware);
  const setHardware = useAppStore((s) => s.setHardware);
  const [scaleMsg, setScaleMsg] = useState<string | null>(null);
  const [payMsg, setPayMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<"scale" | "pay" | null>(null);

  const testScale = async () => {
    setBusy("scale");
    setScaleMsg(null);
    const res = await readScaleWeight(hardware);
    setBusy(null);
    if (!res.ok) {
      setScaleMsg(res.error);
      return;
    }
    setScaleMsg(
      `${res.grams} g (${res.kg.toFixed(3)} kg)${res.simulated ? " · simulado" : ""} · ${
        res.stable ? "estável" : "instável"
      }`,
    );
  };

  const testPay = async () => {
    setBusy("pay");
    setPayMsg("Enviando R$ 1,00 (débito)…");
    const res = await startTerminalPayment(hardware, { amount: 1, type: "debito" });
    setBusy(null);
    if (!res.ok) {
      setPayMsg(res.error);
      return;
    }
    if (!res.approved) {
      setPayMsg(res.reason);
      return;
    }
    setPayMsg(
      `Aprovado · auth ${res.authCode}${res.simulated ? " · simulado" : ""}`,
    );
  };

  return (
    <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
      <section className="panel-glass p-5">
        <div className="panel-glass-inner space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-brand/15 p-2.5 text-brand-light">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl text-zinc-100">Balança</h2>
              <p className="text-xs text-zinc-500">
                Na Rampa: escolher item → esvaziar → ler → OK.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={hardware.scale.enabled}
              onChange={(e) =>
                setHardware({ scale: { ...hardware.scale, enabled: e.target.checked } })
              }
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-900/50 text-brand focus:ring-brand"
            />
            Balança ativa
          </label>

          <div>
            <label className="mb-1 block text-xs text-zinc-500">Provedor</label>
            <select
              className="w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2.5 text-sm text-zinc-100"
              value={hardware.scale.provider}
              onChange={(e) =>
                setHardware({
                  scale: {
                    ...hardware.scale,
                    provider: e.target.value as ScaleProviderId,
                  },
                })
              }
            >
              {(Object.keys(SCALE_PROVIDER_LABELS) as ScaleProviderId[]).map((id) => (
                <option key={id} value={id} disabled={!isScaleProviderReady(id) && id !== hardware.scale.provider}>
                  {SCALE_PROVIDER_LABELS[id]}
                </option>
              ))}
            </select>
          </div>

          {hardware.scale.provider === "simulacao" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Sim. mín. (g)</label>
                <Input
                  inputMode="numeric"
                  value={String(hardware.scale.mockMinGrams ?? 80)}
                  onChange={(e) =>
                    setHardware({
                      scale: {
                        ...hardware.scale,
                        mockMinGrams: Number(e.target.value) || 80,
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Sim. máx. (g)</label>
                <Input
                  inputMode="numeric"
                  value={String(hardware.scale.mockMaxGrams ?? 900)}
                  onChange={(e) =>
                    setHardware({
                      scale: {
                        ...hardware.scale,
                        mockMaxGrams: Number(e.target.value) || 900,
                      },
                    })
                  }
                />
              </div>
            </div>
          )}

          {(hardware.scale.provider === "toledo_ws" ||
            hardware.scale.provider === "serial_usb") && (
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Host / IP</label>
                <Input
                  value={hardware.scale.host ?? ""}
                  onChange={(e) =>
                    setHardware({ scale: { ...hardware.scale, host: e.target.value } })
                  }
                  placeholder="192.168.0.50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Porta / COM</label>
                <Input
                  value={hardware.scale.port ?? ""}
                  onChange={(e) =>
                    setHardware({ scale: { ...hardware.scale, port: e.target.value } })
                  }
                  placeholder="COM3"
                />
              </div>
              <p className="text-xs text-amber-200/90">
                Conector real chega depois — por enquanto use Simulação.
              </p>
            </div>
          )}

          <Button
            type="button"
            variant="secondary"
            disabled={busy !== null || !hardware.scale.enabled}
            onClick={() => void testScale()}
          >
            <Sparkles className="h-4 w-4" />
            {busy === "scale" ? "Lendo…" : "Testar leitura"}
          </Button>
          {scaleMsg && (
            <p className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200">
              {scaleMsg}
            </p>
          )}
        </div>
      </section>

      <section className="panel-glass p-5">
        <div className="panel-glass-inner space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-sky-500/15 p-2.5 text-sky-300">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl text-zinc-100">Maquininha</h2>
              <p className="text-xs text-zinc-500">
                O caixa só registra a forma. Escolha a marca para guardar os dados que a integração vai usar.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={hardware.paymentTerminal.enabled}
              onChange={(e) =>
                setHardware({
                  paymentTerminal: {
                    ...hardware.paymentTerminal,
                    enabled: e.target.checked,
                  },
                })
              }
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-900/50 text-brand focus:ring-brand"
            />
            Terminal ativo
          </label>

          <div>
            <label className="mb-1 block text-xs text-zinc-500">Marca</label>
            <select
              className="w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2.5 text-sm text-zinc-100"
              value={hardware.paymentTerminal.provider}
              onChange={(e) =>
                setHardware({
                  paymentTerminal: {
                    ...hardware.paymentTerminal,
                    provider: e.target.value as PaymentTerminalProviderId,
                  },
                })
              }
            >
              {(Object.keys(PAYMENT_PROVIDER_LABELS) as PaymentTerminalProviderId[]).map(
                (id) => (
                  <option key={id} value={id}>
                    {PAYMENT_PROVIDER_LABELS[id]}
                  </option>
                ),
              )}
            </select>
          </div>

          {hardware.paymentTerminal.provider === "simulacao" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Delay (ms)</label>
                <Input
                  inputMode="numeric"
                  value={String(hardware.paymentTerminal.mockDelayMs ?? 1800)}
                  onChange={(e) =>
                    setHardware({
                      paymentTerminal: {
                        ...hardware.paymentTerminal,
                        mockDelayMs: Number(e.target.value) || 1800,
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Aprovação (0–1)</label>
                <Input
                  inputMode="decimal"
                  value={String(hardware.paymentTerminal.mockApproveRate ?? 0.92)}
                  onChange={(e) =>
                    setHardware({
                      paymentTerminal: {
                        ...hardware.paymentTerminal,
                        mockApproveRate: Math.min(
                          1,
                          Math.max(0, Number(e.target.value.replace(",", ".")) || 0.92),
                        ),
                      },
                    })
                  }
                />
              </div>
            </div>
          )}

          {hardware.paymentTerminal.provider !== "simulacao" && (
            <ProviderFields />
          )}

          {hardware.paymentTerminal.provider === "simulacao" && (
            <Button
              type="button"
              variant="secondary"
              disabled={busy !== null || !hardware.paymentTerminal.enabled}
              onClick={() => void testPay()}
            >
              <Sparkles className="h-4 w-4" />
              {busy === "pay" ? "Aguardando…" : `Testar · ${formatBRL(1)} débito`}
            </Button>
          )}
          {payMsg && hardware.paymentTerminal.provider === "simulacao" && (
            <p className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200">
              {payMsg}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function ProviderFields() {
  const hardware = useAppStore((s) => s.hardware);
  const setHardware = useAppStore((s) => s.setHardware);
  const provider = hardware.paymentTerminal.provider;
  if (provider === "simulacao") return null;
  const setup = PAYMENT_PROVIDER_SETUP[provider];
  const fields = hardware.paymentTerminal.fields ?? {};

  const setField = (key: string, value: string) => {
    setHardware({
      paymentTerminal: {
        ...hardware.paymentTerminal,
        fields: { ...fields, [key]: value },
      },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs text-zinc-500">Ambiente</label>
        <select
          className="w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2.5 text-sm text-zinc-100"
          value={hardware.paymentTerminal.environment ?? "teste"}
          onChange={(e) =>
            setHardware({
              paymentTerminal: {
                ...hardware.paymentTerminal,
                environment: e.target.value as "teste" | "producao",
              },
            })
          }
        >
          <option value="teste">Teste (sandbox)</option>
          <option value="producao">Produção</option>
        </select>
      </div>
      {setup.fields.map((field) => (
        <Field
          key={field.key}
          label={field.label}
          hint={field.hint}
          secret={field.secret}
          value={fields[field.key] ?? ""}
          onChange={(v) => setField(field.key, v)}
        />
      ))}
      <p className="flex items-start gap-2 text-xs text-amber-200/90">
        <Cable className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          {setup.note}{" "}
          <a
            href={setup.docs}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-amber-200/40"
          >
            Documentação
          </a>
        </span>
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
  secret,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  secret?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-500">{label}</label>
      <Input
        type={secret ? "password" : "text"}
        value={value}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <p className="mt-1 text-[11px] leading-snug text-zinc-500">{hint}</p> : null}
    </div>
  );
}
