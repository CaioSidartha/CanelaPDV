import { NextResponse } from "next/server";
import { getDesktopReleaseManifest } from "@/lib/desktop-release";

/** Manifesto público: versão web (Render) e último instalador Windows. */
export async function GET() {
  const manifest = await getDesktopReleaseManifest();
  return NextResponse.json(manifest, {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
