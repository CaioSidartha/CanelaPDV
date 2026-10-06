import { NextResponse } from "next/server";
import { isLocalStoreEnabled } from "@/db/local";

export async function GET() {
  const enabled = isLocalStoreEnabled();
  return NextResponse.json({
    enabled,
    mode: enabled ? "lan-sqlite" : "browser-local",
    comandas: enabled,
    catalog: enabled,
    pdv: enabled,
    bundle: enabled,
  });
}
