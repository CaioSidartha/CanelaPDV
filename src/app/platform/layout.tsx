"use client";

import { usePathname } from "next/navigation";
import { PlatformGate } from "@/components/platform/PlatformGate";
import { PlatformShell } from "@/components/platform/PlatformShell";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = pathname === "/platform/login";

  return (
    <PlatformGate>
      {bare ? children : <PlatformShell>{children}</PlatformShell>}
    </PlatformGate>
  );
}
