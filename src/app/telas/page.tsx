"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Monitor, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAppStore } from "@/store/useAppStore";

export default function TelasPage() {
  const displayTvs = useAppStore((s) => s.displayTvs);
  const addDisplayTv = useAppStore((s) => s.addDisplayTv);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = () => {
    setErr(null);
    const t = label.trim();
    if (!t) {
      setErr("Informe um nome ou descrição (ex.: TV1).");
      return;
    }
    addDisplayTv(t);
    setLabel("");
    setOpen(false);
  };

  return (
    <div className="p-6 lg:p-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-zinc-100">Telas</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-400">
            Monitores de preços: cadastre cada TV, defina categorias e itens. Abra o link do monitor em
            tela cheia no navegador da televisão (F11).
          </p>
        </div>
        <Button
          type="button"
          className="inline-flex items-center gap-2"
          onClick={() => {
            setOpen(true);
            setErr(null);
          }}
        >
          <Plus className="h-4 w-4" />
          Adicionar TV
        </Button>
      </header>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="panel-glass w-full max-w-md p-6 shadow-2xl">
            <div className="panel-glass-inner">
            <h2 className="font-display text-lg font-semibold text-zinc-100">Nova TV</h2>
            <p className="mt-1 text-sm text-zinc-400">Descrição ou nome (ex.: TV1, vitrine).</p>
            {err && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {err}
              </div>
            )}
            <Input
              className="mt-4"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="TV1"
              autoFocus
            />
            <div className="mt-6 flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={submit}>
                Criar
              </Button>
            </div>
            </div>
          </div>
        </div>
      )}

      {displayTvs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-zinc-900/30 p-12 text-center text-sm text-zinc-500 backdrop-blur-sm">
          Nenhuma TV cadastrada. Use <span className="font-semibold text-zinc-300">Adicionar TV</span> para
          começar.
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayTvs.map((tv) => (
            <li
              key={tv.id}
              className="panel-glass p-5 transition hover:border-brand/30"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-muted text-brand">
                  <Monitor className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/telas/${tv.id}`}
                    className="font-semibold text-zinc-100 hover:text-brand hover:underline"
                  >
                    {tv.label}
                  </Link>
                  <p className="mt-1 text-xs text-zinc-500">
                    {tv.slots.length} categoria(s) · {tv.maxRowsPerPage} itens/pág. · {tv.rotationSeconds}s
                    /categoria
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/telas/${tv.id}`}
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5"
                >
                  Configurar
                </Link>
                <a
                  href={`/telas/monitor/${tv.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-brand px-3 py-2 text-xs font-medium text-white hover:bg-brand-light"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir monitor
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
