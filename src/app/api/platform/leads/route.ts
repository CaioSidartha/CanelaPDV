import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { leads } from "@/db/schema";
import { getDb, isDatabaseConfigured } from "@/db/index";
import { requirePlatformSession } from "@/lib/auth/require-session";

export async function GET() {
  const auth = await requirePlatformSession();
  if ("response" in auth) return auth.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ leads: [], mode: "local" });
  }

  const db = getDb();
  const rows = await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(200);

  return NextResponse.json({
    leads: rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      companyName: r.companyName,
      message: r.message,
      planInterest: r.planInterest,
      status: r.status,
      source: r.source,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
