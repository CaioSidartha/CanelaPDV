import { NextResponse } from "next/server";
import { isLocalStoreEnabled } from "@/db/local";
import { applyStoreBundlePatch, readStoreBundle, type StoreBundlePatch } from "@/lib/local-store/bundle";

export async function GET() {
  if (!isLocalStoreEnabled()) {
    return NextResponse.json({ error: "Loja local não ativa." }, { status: 404 });
  }
  return NextResponse.json(readStoreBundle());
}

export async function PUT(request: Request) {
  if (!isLocalStoreEnabled()) {
    return NextResponse.json({ error: "Loja local não ativa." }, { status: 404 });
  }
  let patch: StoreBundlePatch;
  try {
    patch = (await request.json()) as StoreBundlePatch;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  applyStoreBundlePatch(patch);
  return NextResponse.json(readStoreBundle());
}
