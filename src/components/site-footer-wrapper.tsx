"use client";

import { usePathname } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";

export function SiteFooterWrapper() {
  const pathname = usePathname();
  const hideFooter = pathname === "/login" || pathname === "/signup";

  if (hideFooter) {
    return null;
  }

  return <SiteFooter />;
}
