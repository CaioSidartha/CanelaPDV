import { NextResponse } from "next/server";
import { leads } from "@/db/schema";
import { getDb, isDatabaseConfigured } from "@/db/index";
import { readLeadSettingsDb } from "@/lib/platform-settings-db";
import { sendLeadNotificationEmail, type LeadEmailPayload } from "@/lib/send-lead-email";
import { writeAudit } from "@/lib/audit";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limited = rateLimit(`leads:post:${ip}`, 10, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Muitas solicitações. Tente mais tarde." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  let body: LeadEmailPayload & { sendEmail?: boolean };
  try {
    body = (await req.json()) as LeadEmailPayload & { sendEmail?: boolean };
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!body.name?.trim() || !body.email?.trim()) {
    return NextResponse.json({ error: "Nome e e-mail são obrigatórios." }, { status: 400 });
  }

  const payload = {
    name: body.name.trim(),
    email: body.email.trim(),
    phone: body.phone?.trim(),
    companyName: body.companyName?.trim(),
    message: body.message?.trim(),
    planInterest: body.planInterest,
  };

  if (isDatabaseConfigured()) {
    try {
      const db = getDb();
      await db.insert(leads).values({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        companyName: payload.companyName,
        message: payload.message,
        planInterest: payload.planInterest,
        source: "site",
        emailRequested: Boolean(body.sendEmail),
      });
      await writeAudit({
        scope: "platform",
        action: "lead.created",
        entity: "leads",
        payload: { email: payload.email, emailRequested: Boolean(body.sendEmail) },
        ip,
      });
    } catch (e) {
      console.error("[leads] insert", e);
      return NextResponse.json({ error: "Não foi possível registrar a solicitação." }, { status: 500 });
    }
  }

  if (!body.sendEmail) {
    return NextResponse.json({ ok: true, emailSent: false });
  }

  const settings = await readLeadSettingsDb();
  const result = await sendLeadNotificationEmail(settings.leadNotifyEmail, payload);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true, emailSent: true });
}
