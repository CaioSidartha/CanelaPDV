"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePlatformStore } from "@/store/usePlatformStore";

const PUBLIC = ["/platform/login"];

export function PlatformGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = usePlatformStore((s) => s.session);
  const hasHydrated = usePlatformStore((s) => s.hasHydrated);

  const isPublic = PUBLIC.some((p) => pathname === p);

  useEffect(() => {
    if (!hasHydrated) return;
    if (isPublic) {
      if (session) router.replace("/platform");
      return;
    }
    if (!session) router.replace("/platform/login");
  }, [hasHydrated, isPublic, pathname, router, session]);

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
  return <>{children}</>;
}
