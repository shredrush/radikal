import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export type Role = "USER" | "GUIDE" | "ADMIN" | "SUPPORT";

/**
 * Central, auditable authorization rules.
 *
 * Role hierarchy:
 *   - ADMIN  -> everything (admin tooling + support desk).
 *   - SUPPORT -> support desk only.
 *   - USER / GUIDE -> their own account data only.
 */

export function isAdmin(role: Role | undefined): role is "ADMIN" {
  return role === "ADMIN";
}

export function isSupportAgent(role: Role | undefined): role is "ADMIN" | "SUPPORT" {
  return role === "SUPPORT" || role === "ADMIN";
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
