"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isPathAllowedForSurface } from "@/lib/app-surface";
import { useAppSurface } from "@/hooks/useAppSurface";

const SKIP = ["/login", "/site", "/platform"];

export function SurfaceRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const surface = useAppSurface();

  useEffect(() => {
    if (!pathname) return;
    if (SKIP.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
    if (pathname.startsWith("/telas/monitor")) return;
    if (!isPathAllowedForSurface(pathname, surface)) {
      router.replace("/inicio?surface=restricted");
    }
  }, [pathname, router, surface]);

  return <>{children}</>;
}

export function SurfaceRestrictedBanner() {
  const surface = useAppSurface();
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(new URLSearchParams(window.location.search).get("surface") === "restricted");
  }, [pathname]);
  if (!show) return null;
  return (
    <div className="border-b border-amber-700/40 bg-amber-950/40 px-4 py-2 text-center text-xs text-amber-100">
      Esta tela é do <strong>balcão</strong> e só funciona no <strong>app Windows instalado</strong>.
      {surface === "cloud-management" && " Aqui você acessa a visão gerencial da loja."}
      {surface === "cloud-portal" && " Baixe o app para operar PDV, comandas e caixa."}
    </div>
  );
}
