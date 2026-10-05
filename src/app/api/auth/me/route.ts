import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/require-session";
import { isDatabaseConfigured } from "@/db/index";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ authenticated: false, mode: "local" });
  }
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({
    authenticated: true,
    profile: {
      email: session.email,
      name: session.name,
      scope: session.scope,
      tenantId: session.tenantId,
      role: session.role,
    },
  });
}
