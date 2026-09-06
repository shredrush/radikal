"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const SupportWidgetClient = dynamic(
  () => import("@/components/support/support-widget-client").then((module) => module.SupportWidgetClient),
  { ssr: false },
);

/**
 * Floating support launcher rendered on every page. Hidden on bare-minimum
 * pages like /preview.
 */
export function SupportWidget() {
  const pathname = usePathname();
  if (
    pathname.startsWith("/preview") ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/support" ||
    pathname.startsWith("/support/")
  ) return null;
  return <SupportWidgetClient />;
}
