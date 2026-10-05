"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { PRODUCT_NAME } from "@/config/brand";
import { NAV_ITEMS } from "@/config/navigation";
import { canAccessModule, isRoleAtLeast } from "@/lib/tenant-access";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

export function AppSidebar() {
  const pathname = usePathname();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const setCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const company = useAppStore((s) => s.company);
  const auth = useAppStore((s) => s.auth);
  const session = useAppStore((s) => s.session);
  const logout = useAppStore((s) => s.logout);

  const ctx = { role: auth.role, modules: auth.modules };

  const visible = NAV_ITEMS.filter((item) => {
    if (item.module && !canAccessModule(ctx, item.module)) return false;
    if (item.minRole && !isRoleAtLeast(auth.role, item.minRole)) return false;
    return true;
  });

  const operacao = visible.filter((i) => i.group === "operacao");
  const admin = visible.filter((i) => i.group === "admin");

  const renderGroup = (items: typeof visible, label: string) => (
    <div className="mb-3">
      {!collapsed && (
        <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          {label}
        </p>
      )}
      <div className="flex flex-col gap-1">
        {items.map(({ href, label: itemLabel, icon: Icon }) => {
          const active =
            href === "/inicio"
              ? pathname === "/inicio"
              : href === "/venda"
                ? pathname === "/venda"
                : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? itemLabel : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md border-l-[3px] px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-[var(--surface-2)] text-[var(--foreground)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
              )}
            >
              <Icon className="h-5 w-5 shrink-0 opacity-90" />
              {!collapsed && <span>{itemLabel}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 print:hidden",
        collapsed ? "w-[72px]" : "w-60",
      )}
    >
      <Link
        href="/inicio"
        className="flex items-center gap-2.5 border-b border-sidebar-border px-3 py-4 transition-colors hover:bg-[var(--surface)]/40"
        title="Início"
      >
        <BrandMark logoUrl={company.logoUrl} />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate font-display text-[15px] leading-tight text-sidebar-foreground">
              {company.name}
            </p>
            <p className="truncate text-[11px] text-[var(--muted-foreground)]">
              {PRODUCT_NAME} · {session?.name ?? "Gestão"}
            </p>
          </div>
        )}
      </Link>

      <nav className="flex flex-1 flex-col overflow-y-auto px-2">
        {renderGroup(operacao, "Operação")}
        {renderGroup(admin, "Administração")}
      </nav>

      <button
        type="button"
        onClick={() => logout()}
        title="Sair"
        className="mx-2 mb-1 flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {!collapsed && <span>Sair</span>}
      </button>

      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="m-2 flex items-center justify-center rounded-lg border border-zinc-700 p-2 text-zinc-500 hover:bg-zinc-800/80"
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
