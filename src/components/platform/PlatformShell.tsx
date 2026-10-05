"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ChartLine, LayoutDashboard, LogOut, MessageSquare, Settings, Wallet } from "lucide-react";
import { PRODUCT_NAME } from "@/config/brand";
import { cn } from "@/lib/utils";
import { usePlatformStore } from "@/store/usePlatformStore";

const NAV = [
  { href: "/platform", label: "Visão geral", icon: LayoutDashboard },
  { href: "/platform/tenants", label: "Contas", icon: Building2 },
  { href: "/platform/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/platform/leads", label: "Leads", icon: MessageSquare },
  { href: "/platform/analytics", label: "Site", icon: ChartLine },
  { href: "/platform/configuracoes", label: "Configurações", icon: Settings },
];

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const session = usePlatformStore((s) => s.session);
  const logout = usePlatformStore((s) => s.logout);

  return (
    <div className="flex min-h-screen bg-[#0c0a09] text-stone-100">
      <aside className="flex w-56 flex-col border-r border-stone-800 bg-[#141210]">
        <div className="border-b border-stone-800 px-4 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600/90">
            {PRODUCT_NAME} Platform
          </p>
          <p className="font-display text-lg font-semibold text-stone-50">Painel master</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/platform" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-amber-600/15 text-amber-100"
                    : "text-stone-400 hover:bg-stone-800/60 hover:text-stone-100",
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-stone-800 p-3">
          <p className="truncate px-2 text-xs text-stone-500">{session?.email}</p>
          <button
            type="button"
            onClick={() => logout()}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-400 hover:bg-stone-800 hover:text-stone-100"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
          <Link
            href="/login"
            className="mt-1 block px-3 py-1.5 text-xs text-amber-600/80 hover:text-amber-500"
          >
            Ir para login da loja
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
    </div>
  );
}
