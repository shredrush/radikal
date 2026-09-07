"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const SupportWidgetClient = dynamic(
  () => import("@/components/support/support-widget-client").then((module) => module.SupportWidgetClient),
  { ssr: false },
);

/**
 * Floating support launcher deferred until the browser is idle. Hidden on
 * bare-minimum pages like /preview.
 */
export function SupportWidget() {
  const pathname = usePathname();
  const [shouldLoad, setShouldLoad] = useState(false);
  const hidden =
    pathname.startsWith("/preview") ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/support" ||
    pathname.startsWith("/support/");

  useEffect(() => {
    if (hidden) return;

    const load = () => setShouldLoad(true);
    const idleCallback = window.requestIdleCallback?.(load, { timeout: 3_000 });

    if (idleCallback !== undefined) {
      return () => window.cancelIdleCallback(idleCallback);
    }

    const timeout = window.setTimeout(load, 0);
    return () => window.clearTimeout(timeout);
  }, [hidden]);

  if (hidden) return null;

  return shouldLoad ? <SupportWidgetClient /> : null;
}
