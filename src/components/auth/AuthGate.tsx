"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

const PUBLIC_PREFIXES = ["/login", "/telas/monitor", "/site", "/platform"];

function isPublicPath(pathname: string | null) {
  if (!pathname) return false;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Gate de sessão: sem login → /login. Base de segurança até existir JWT no servidor. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useAppStore((s) => s.session);
  const hasHydrated = useAppStore((s) => s.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    if (isPublicPath(pathname)) {
      if (session && pathname === "/login") router.replace("/inicio");
      return;
    }
    if (!session) router.replace("/login");
  }, [hasHydrated, pathname, router, session]);

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  if (isPublicPath(pathname)) return <>{children}</>;
  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1114] text-sm text-zinc-500">
        Redirecionando para login…
      </div>
    );
  }
  return <>{children}</>;
}
