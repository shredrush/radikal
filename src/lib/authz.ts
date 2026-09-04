import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { loadDb, prisma } from "@/lib/prisma";
export { hasPermission, PERMISSIONS, ROLE_PERMISSIONS, ROLES, type Permission, type Role } from "@/lib/access-control";
import { hasPermission, type Permission } from "@/lib/access-control";

/**
 * Role → permission authorization model.
 *
 * Roles are coarse labels for humans; permissions are the fine-grained,
 * auditable capability checks that actually gate access. Every guard in the
 * app should check a *permission* — never a raw role — so capabilities can be
 * re-composed without touching page/action code.
 */

/**
 * Return the signed-in user only when their current database role has the
 * requested permission. Route handlers use this instead of trusting the JWT so
 * role demotions take effect immediately without triggering redirects.
 */
export async function getAuthorizedUser(permission: Permission) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await loadDb(
    "authz.authorized-user",
    () =>
      prisma.user.findFirst({
        where: { id: session.user.id, deletedAt: null },
        select: { role: true },
      }),
  );

  const role = user?.role;
  if (!role || !hasPermission(role, permission)) return null;

  return { ...session.user, role };
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
  if (!session?.user?.id) {
    redirect(redirectTo);
  }

  // Re-read the role from the database on every privileged action so a role
  // change (e.g. an admin being demoted) takes effect immediately. The JWT only
  // caches the role from sign-in and is not invalidated when the DB changes, so
  // trusting the token alone would leave a demoted account privileged until the
  // session expires.
  const user = await loadDb(
    "authz.require-permission",
    () =>
      prisma.user.findFirst({
        where: { id: session.user.id, deletedAt: null },
        select: { role: true },
      }),
  );

  // Fail closed when the account no longer exists or no longer holds the role.
  const role = user?.role;
  if (!role || !hasPermission(role, permission)) {
    redirect(redirectTo);
  }

  return {
    ...session,
    user: { ...session.user, role },
  };
}
