"use client";

import { usePathname } from "next/navigation";
import { AuthGate } from "@/components/auth/AuthGate";
import { SurfaceRestrictedBanner, SurfaceRouteGuard } from "@/components/auth/SurfaceRouteGuard";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppDesktopBar } from "@/components/layout/AppDesktopBar";
import { DesktopDeviceSetupWizard } from "@/components/desktop/DesktopDeviceSetupWizard";
import { TenantPlanBanner } from "@/components/tenant/TenantPlanBanner";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const monitorFullscreen = pathname?.startsWith("/telas/monitor");
  const isLogin = pathname === "/login";
  const isPlatform = pathname?.startsWith("/platform");
  const isSite = pathname?.startsWith("/site");

  if (isPlatform || isSite) {
    return <>{children}</>;
  }

  if (monitorFullscreen) {
    return (
      <AuthGate>
        <div className="min-h-screen bg-black">{children}</div>
      </AuthGate>
    );
  }

  if (isLogin) {
    return (
      <AuthGate>
        <DesktopDeviceSetupWizard />
        {children}
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <SurfaceRouteGuard>
        <DesktopDeviceSetupWizard />
        <div className="flex h-screen overflow-hidden bg-background print:block print:h-auto print:overflow-visible print:bg-white">
          <AppSidebar />
          <main className="min-h-0 flex-1 overflow-y-auto text-zinc-200 print:overflow-visible print:text-black">
            <TenantPlanBanner />
            <SurfaceRestrictedBanner />
            <AppDesktopBar />
            {children}
          </main>
        </div>
      </SurfaceRouteGuard>
    </AuthGate>
  );
}
