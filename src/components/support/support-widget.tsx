"use client";

import { usePathname } from "next/navigation";

import { SupportWidgetClient } from "@/components/support/support-widget-client";

/**
 * Floating support launcher rendered on every page. Hidden on bare-minimum
 * pages like /preview.
 */
export function SupportWidget() {
  const pathname = usePathname();
  if (pathname.startsWith("/preview")) return null;
  return <SupportWidgetClient />;
}
