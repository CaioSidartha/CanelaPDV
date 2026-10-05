import { promises as fs } from "fs";
import path from "path";
import type { PlatformSettings } from "@/types/platform";

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "lead-settings.json");

const DEFAULTS: PlatformSettings = { leadNotifyEmail: "" };

export async function readLeadSettings(): Promise<PlatformSettings> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<PlatformSettings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function writeLeadSettings(settings: PlatformSettings): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(settings, null, 2), "utf8");
}
