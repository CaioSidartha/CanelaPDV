"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { canAccessModule, isRoleAtLeast } from "@/lib/tenant-access";
import { useAppStore } from "@/store/useAppStore";

/** Protege rotas /admin* por módulo + role. */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const auth = useAppStore((s) => s.auth);
  const ok =
    canAccessModule({ role: auth.role, modules: auth.modules }, "admin") &&
    isRoleAtLeast(auth.role, "gerente");

  useEffect(() => {
    if (!ok) router.replace("/venda");
  }, [ok, router]);

  if (!ok) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Sem permissão para o painel admin.
      </div>
    );
  }
  return <>{children}</>;
}
