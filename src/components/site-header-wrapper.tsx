"use client";

import { usePathname } from "next/navigation";

/**
 * Hides the heavy site header on bare-minimum pages like /preview. The header
 * itself is a server component, so it arrives as `children` (RSC payload) and
 * is only unmounted client-side — it never crosses into the client bundle.
 */
export function SiteHeaderWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/preview")) return null;
  return <>{children}</>;
}
