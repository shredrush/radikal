import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

/**
 * Role → permission authorization model.
 *
 * Roles are coarse labels for humans; permissions are the fine-grained,
 * auditable capability checks that actually gate access. Every guard in the
 * app should check a *permission* — never a raw role — so capabilities can be
 * re-composed without touching page/action code.
 */

export const ROLES = [
  "USER",
  "GUIDE",
  "SUPPORT",
  "FINANCE",
  "CONTENT",
  "ADMIN",
  "ADMAX",
] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "users.manage",
  "bookings.read",
  "bookings.confirm",
  "bookings.cancel",
  "trips.manage",
  "guides.manage",
  "guideApplications.manage",
  "support.manage",
  "system.debug",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Canonical capability matrix. Keep this table in sync with the `UserRole`
 * enum in `prisma/schema.prisma` and the role selectors in the admin UI.
 *
 *   USER    → no staff capabilities.
 *   GUIDE   → no staff capabilities.
 *   SUPPORT → support desk + full booking triage (confirm & cancel).
 *   FINANCE → read bookings and confirm payments only (no cancellation).
 *   CONTENT → curate trips and guides.
 *   ADMIN   → operations admin: everything except user management.
 *   ADMAX   → super admin: everything, including user/role management.
 */
export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  USER: new Set<Permission>(),
  GUIDE: new Set<Permission>(),
  SUPPORT: new Set<Permission>([
    "bookings.read",
    "bookings.confirm",
    "bookings.cancel",
    "support.manage",
  ]),
  FINANCE: new Set<Permission>(["bookings.read", "bookings.confirm"]),
  CONTENT: new Set<Permission>(["trips.manage", "guides.manage"]),
  ADMIN: new Set<Permission>([
    "bookings.read",
    "bookings.confirm",
    "bookings.cancel",
    "trips.manage",
    "guides.manage",
    "guideApplications.manage",
    "support.manage",
  ]),
  ADMAX: new Set<Permission>(PERMISSIONS),
};

/**
 * True when `role` is granted `permission`. Unknown roles (e.g. a stale JWT
 * carrying a role that no longer exists) fail closed.
 */
export function hasPermission(
  role: Role | undefined,
  permission: Permission,
): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

/**
 * Require a signed-in user with `permission`. Redirects otherwise.
 * Used by server actions and pages that read/mutate protected data.
 */
export async function requirePermission(
  permission: Permission,
  redirectTo = "/login",
) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, permission)) {
    redirect(redirectTo);
  }
  return session;
}
