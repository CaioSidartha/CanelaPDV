import { NextResponse } from "next/server";
import type { SalePayload } from "@/types";
import { loadCertificado } from "@/services/fiscal/certificado/CertificadoManager";
import { getFiscalService } from "@/services/fiscal/FiscalService";
import { resultadoToResposta, saleToDadosNFCe } from "@/services/fiscal/map-sale";

export const runtime = "nodejs";

/**
 * Emissão de NFC-e. O caixa chama esta rota e só grava a venda se status = autorizado.
 * Sem BRASILNFE_TOKEN, responde com a simulação de sempre. Com token, fala com a Brasil NFe.
 */
export async function POST(req: Request) {
  const { clientIp, rateLimit } = await import("@/lib/rate-limit");
  const ip = clientIp(req);
  const limited = rateLimit(`fiscal:emit:${ip}`, 20, 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { status: "erro", mensagem: "Muitas emissões em pouco tempo." },
      { status: 429 },
    );
  }

  let body: SalePayload;
  try {
    body = (await req.json()) as SalePayload;
  } catch {
    return NextResponse.json({ status: "erro", mensagem: "JSON inválido" }, { status: 400 });
  }

  const external = process.env.FISCAL_PROXY_URL?.trim();
  if (external) {
    const target = external.endsWith("/") ? `${external}emitir` : `${external}/emitir`;
    const upstream = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") || "application/json" },
    });
  }

  if (!body.items?.length || body.total <= 0) {
    return NextResponse.json({
      status: "erro",
      mensagem: "Venda sem itens ou total inválido para emissão.",
    });
  }

  try {
    const fiscal = getFiscalService();
    const { pfx, senha } = loadCertificado();
    const resultado = await fiscal.emitirNFCe(saleToDadosNFCe(body), pfx, senha);
    return NextResponse.json(resultadoToResposta(resultado));
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : "Falha no módulo fiscal";
    return NextResponse.json({ status: "erro", mensagem });
  }
}
