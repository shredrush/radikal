"use client";

import { usePathname } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "@/components/ui/sonner";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideFooter = pathname === "/login" || pathname === "/signup";

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      {!hideFooter ? <SiteFooter /> : null}
      <Toaster />
    </>
  );
}
