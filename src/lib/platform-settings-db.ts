import { eq } from "drizzle-orm";
import { platformSettings } from "@/db/schema";
import { getDb, isDatabaseConfigured } from "@/db/index";
import { readLeadSettings, writeLeadSettings } from "@/lib/lead-settings-server";
import type { PlatformSettings } from "@/types/platform";

const KEY = "lead_notify";

export async function readLeadSettingsDb(): Promise<PlatformSettings> {
  if (!isDatabaseConfigured()) {
    return readLeadSettings();
  }
  const db = getDb();
  const [row] = await db.select().from(platformSettings).where(eq(platformSettings.key, KEY)).limit(1);
  const email = (row?.value as { leadNotifyEmail?: string } | undefined)?.leadNotifyEmail ?? "";
  return { leadNotifyEmail: email };
}

export async function writeLeadSettingsDb(settings: PlatformSettings): Promise<void> {
  if (!isDatabaseConfigured()) {
    await writeLeadSettings(settings);
    return;
  }
  const db = getDb();
  await db
    .insert(platformSettings)
    .values({
      key: KEY,
      value: settings,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value: settings, updatedAt: new Date() },
    });
}
