import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export type Role = "USER" | "GUIDE" | "ADMIN" | "ADMAX" | "SUPPORT";

/**
 * Central, auditable authorization rules.
 *
 * Role hierarchy:
 *   - ADMIN / ADMAX -> everything (admin tooling + support desk).
 *   - SUPPORT -> support desk only.
 *   - USER / GUIDE -> their own account data only.
 */

export function isAdmin(role: Role | undefined): role is "ADMIN" | "ADMAX" {
  return role === "ADMIN" || role === "ADMAX";
}

export function isSupportAgent(role: Role | undefined): role is "ADMIN" | "ADMAX" | "SUPPORT" {
  return role === "SUPPORT" || isAdmin(role);
}

/**
 * Require a signed-in ADMIN. Redirects to login otherwise.
 * Used by server actions and pages that mutate/read admin-only data.
 */
export async function requireAdmin(redirectTo = "/login?callbackUrl=/admin") {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    redirect(redirectTo);
  }
  return session;
}

/**
 * Require a signed-in support agent (SUPPORT or ADMIN). Redirects otherwise.
 * Used by server actions and pages that read/reply to support conversations.
 */
export async function requireSupport(redirectTo = "/login?callbackUrl=/support") {
  const session = await auth();
  if (!session?.user || !isSupportAgent(session.user.role)) {
    redirect(redirectTo);
  }
  return session;
}
