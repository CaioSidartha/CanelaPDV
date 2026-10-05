import nodemailer from "nodemailer";
import type { CommercialPlanId } from "@/types/platform";

export type LeadEmailPayload = {
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  message?: string;
  planInterest?: CommercialPlanId;
};

function buildText(lead: LeadEmailPayload) {
  const lines = [
    "Nova solicitação pelo site Canela",
    "",
    `Nome: ${lead.name}`,
    `E-mail: ${lead.email}`,
    lead.phone ? `Telefone: ${lead.phone}` : null,
    lead.companyName ? `Padaria/empresa: ${lead.companyName}` : null,
    lead.planInterest ? `Plano de interesse: ${lead.planInterest}` : null,
    lead.message ? `\nMensagem:\n${lead.message}` : null,
    "",
    `Enviado em: ${new Date().toLocaleString("pt-BR")}`,
  ].filter(Boolean);
  return lines.join("\n");
}

export async function sendLeadNotificationEmail(
  to: string,
  lead: LeadEmailPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const destination = to.trim();
  if (!destination) {
    return { ok: false, error: "E-mail de destino não configurado no painel master." };
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromResend = process.env.LEAD_EMAIL_FROM?.trim() || "onboarding@resend.dev";
  const subject = `[Canela] Nova solicitação — ${lead.name}`;
  const text = buildText(lead);

  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromResend,
        to: [destination],
        subject,
        text,
        reply_to: lead.email,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Resend: ${body || res.statusText}` };
    }
    return { ok: true };
  }

  const host = process.env.SMTP_HOST?.trim();
  if (host) {
    const port = Number(process.env.SMTP_PORT || "587");
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    const from = process.env.LEAD_EMAIL_FROM?.trim() || user || "noreply@canela.local";

    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });

    try {
      await transport.sendMail({
        from,
        to: destination,
        replyTo: lead.email,
        subject,
        text,
      });
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao enviar SMTP.";
      return { ok: false, error: msg };
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[lead-email:dev] Para:", destination);
    console.info(text);
    return { ok: true };
  }

  return {
    ok: false,
    error: "Servidor sem RESEND_API_KEY ou SMTP_HOST. Configure o .env para enviar e-mails.",
  };
}
