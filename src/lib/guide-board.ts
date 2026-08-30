import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Require a signed-in guide with a linked guide profile. Redirects otherwise.
 * The role is read from the database on every call (via the guide's linked
 * user) so a demotion takes effect immediately, instead of trusting the
 * possibly-stale JWT role cached at sign-in. Returns the session (for user id)
 * and the guide record.
 */
export async function requireGuide(redirectTo = "/profile") {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/guide-board/bookings");
  }
  const guide = await prisma.guide.findFirst({
    where: { userId: session.user.id, deletedAt: null, user: { deletedAt: null } },
    select: { id: true, name: true, userId: true, user: { select: { username: true, role: true } } },
  });
  if (!guide || guide.user.role !== "GUIDE") {
    redirect(redirectTo);
  }
  return { session, guide };
}

/**
 * Guard for server actions that require an active guide profile. Throws
 * instead of redirecting so actions surface a user-facing error. The role is
 * re-read from the database so a demotion is enforced immediately.
 */
export async function requireGuideAction() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in to manage trips.");
  }
  const guide = await prisma.guide.findFirst({
    where: { userId: session.user.id, deletedAt: null, user: { deletedAt: null } },
    select: { id: true, name: true, userId: true, user: { select: { role: true } } },
  });
  if (!guide || guide.user.role !== "GUIDE") {
    throw new Error("Only guides can manage trips.");
  }
  return { guide, userId: session.user.id };
}
