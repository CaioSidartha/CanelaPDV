"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePlatformStore } from "@/store/usePlatformStore";

const PUBLIC = ["/platform/login"];

export function PlatformGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = usePlatformStore((s) => s.session);
  const hasHydrated = usePlatformStore((s) => s.hasHydrated);
  const logout = usePlatformStore((s) => s.logout);
  const [serverSessionChecked, setServerSessionChecked] = useState(false);

  const isPublic = PUBLIC.some((p) => pathname === p);

  useEffect(() => {
    if (!hasHydrated) return;
    if (isPublic) {
      if (session) router.replace("/platform");
      return;
    }
    if (!session) router.replace("/platform/login");
  }, [hasHydrated, isPublic, pathname, router, session]);

  useEffect(() => {
    if (!hasHydrated || isPublic || !session) {
      setServerSessionChecked(true);
      return;
    }

    let cancelled = false;
    void fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { authenticated?: boolean; mode?: string; profile?: { scope?: string } }) => {
        if (cancelled) return;
        if (data.mode === "local") {
          setServerSessionChecked(true);
          return;
        }
        if (!data.authenticated || data.profile?.scope !== "platform") {
          logout();
          router.replace("/platform/login?reason=session");
          return;
        }
        setServerSessionChecked(true);
      })
      .catch(() => {
        if (!cancelled) setServerSessionChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, isPublic, session, logout, router]);

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0a09] text-sm text-stone-400">
        Carregando painel…
      </div>
    );
  }

  if (isPublic) return <>{children}</>;
  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0a09] text-sm text-stone-500">
        Redirecionando…
      </div>
    );
  }

  if (!serverSessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0a09] text-sm text-stone-400">
        Validando sessão…
      </div>
    );
  }

  return <>{children}</>;
}
