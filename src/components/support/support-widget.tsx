"use client";

import { SupportWidgetClient } from "@/components/support/support-widget-client";

/**
 * Floating support launcher rendered on every page. The launcher's state
 * (authenticated / support agent / customer thread + unread badge) is resolved
 * client-side via /api/support/unread, so this component adds no server-side
 * auth or database work to every page render.
 */
export function SupportWidget() {
  return <SupportWidgetClient />;
}
