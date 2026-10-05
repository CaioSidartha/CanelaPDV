import { NextResponse } from "next/server";
import { readLeadSettingsDb, writeLeadSettingsDb } from "@/lib/platform-settings-db";
import { requirePlatformSession } from "@/lib/auth/require-session";
import { isDatabaseConfigured } from "@/db/index";
import type { PlatformSettings } from "@/types/platform";
import { writeAudit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

export async function GET() {
  if (!isDatabaseConfigured()) {
    const settings = await readLeadSettingsDb();
    return NextResponse.json(settings);
  }

  const auth = await requirePlatformSession();
  if ("response" in auth) return auth.response;

  const settings = await readLeadSettingsDb();
  return NextResponse.json(settings);
}

export async function POST(req: Request) {
  let body: Partial<PlatformSettings>;
  try {
    body = (await req.json()) as Partial<PlatformSettings>;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const leadNotifyEmail = (body.leadNotifyEmail ?? "").trim();
  if (leadNotifyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadNotifyEmail)) {
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  }
  const settings: PlatformSettings = { leadNotifyEmail };

  if (isDatabaseConfigured()) {
    const auth = await requirePlatformSession();
    if ("response" in auth) return auth.response;

    await writeAudit({
      scope: "platform",
      actorId: auth.session.sub,
      action: "platform.settings.lead_email",
      entity: "platform_settings",
      payload: { leadNotifyEmail: settings.leadNotifyEmail },
      ip: clientIp(req),
    });
  }

  await writeLeadSettingsDb(settings);
  return NextResponse.json({ ok: true, settings });
}
