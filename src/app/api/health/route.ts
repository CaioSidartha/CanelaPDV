import { NextResponse } from "next/server";
import { isDatabaseConfigured, pingDatabase } from "@/db/index";

export async function GET() {
  const dbConfigured = isDatabaseConfigured();
  const dbOk = dbConfigured ? await pingDatabase() : false;
  const jwtOk = Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32);

  const healthy = dbConfigured ? dbOk && jwtOk : true;

  return NextResponse.json(
    {
      ok: healthy,
      service: "canela-api",
      database: dbConfigured ? (dbOk ? "up" : "down") : "not_configured",
      auth: jwtOk ? "configured" : "jwt_secret_missing",
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
