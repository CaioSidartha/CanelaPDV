import { NextResponse } from "next/server";
import { fiscalConfigPublica, getFiscalService } from "@/services/fiscal/FiscalService";

export const runtime = "nodejs";

/** Situação da SEFAZ para o painel. Sem token, o PDV segue em simulação e o status vem offline. */
export async function GET() {
  const config = fiscalConfigPublica();
  try {
    const fiscal = getFiscalService();
    const status = await fiscal.consultarStatusSefaz();
    return NextResponse.json({ ...config, status });
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : "Falha ao consultar a SEFAZ";
    return NextResponse.json({ ...config, status: "offline", mensagem });
  }
}
