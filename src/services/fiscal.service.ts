import type { FiscalEmitResponse, SalePayload } from "@/types";

function resolveEndpoint(): string {
  const external = process.env.NEXT_PUBLIC_FISCAL_API_URL?.trim();
  if (external) {
    return external;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/fiscal/emitir`;
  }
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "http://localhost:3000";
  const origin = base.startsWith("http") ? base : `https://${base}`;
  return `${origin}/api/fiscal/emitir`;
}

/**
 * O caixa só fala com esta função. Ela chama a rota interna, que escolhe o provedor.
 * Não importe SDK fiscal (brasilnfe, focus) aqui.
 * Regra: só persistir venda após retorno "autorizado".
 */
export async function emitirNota(
  venda: SalePayload
): Promise<{ ok: true; data: FiscalEmitResponse } | { ok: false; error: string }> {
  const url = resolveEndpoint();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(venda),
    });
    const json = (await res.json()) as FiscalEmitResponse & { detail?: string };
    if (!res.ok) {
      return {
        ok: false,
        error: json.mensagem || json.detail || `HTTP ${res.status}`,
      };
    }
    if (json.status === "autorizado") {
      return { ok: true, data: json };
    }
    return {
      ok: false,
      error: json.mensagem || "Nota não autorizada pela SEFAZ",
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Falha de rede na API fiscal";
    return { ok: false, error: message };
  }
}
