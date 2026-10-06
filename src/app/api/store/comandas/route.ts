import { NextResponse } from "next/server";
import { isLocalStoreEnabled } from "@/db/local";
import {
  listComandasFromLocalStore,
  upsertComandaInLocalStore,
} from "@/lib/local-store/comandas";
import type { ComandaState } from "@/types";

export async function GET() {
  if (!isLocalStoreEnabled()) {
    return NextResponse.json({ error: "Loja local não ativa." }, { status: 404 });
  }
  const comandas = listComandasFromLocalStore();
  return NextResponse.json({ comandas, serverTime: new Date().toISOString() });
}

export async function PUT(request: Request) {
  if (!isLocalStoreEnabled()) {
    return NextResponse.json({ error: "Loja local não ativa." }, { status: 404 });
  }
  let body: { comanda?: ComandaState };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const comanda = body.comanda;
  if (!comanda?.id) {
    return NextResponse.json({ error: "comanda inválida." }, { status: 400 });
  }
  const saved = upsertComandaInLocalStore(comanda);
  return NextResponse.json({ comanda: saved });
}
