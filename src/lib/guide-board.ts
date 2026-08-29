import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Require a signed-in guide with a linked guide profile. Redirects otherwise.
 * Returns the session (for user id) and the guide record (for guideId).
 */
export async function requireGuide(redirectTo = "/profile") {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/guide-board/bookings");
  }
  if (session.user.role !== "GUIDE") {
    redirect(redirectTo);
  }
  const guide = await prisma.guide.findUnique({
    where: { userId: session.user.id },
    select: { id: true, name: true, user: { select: { username: true } } },
  });
  if (!guide) {
    redirect(redirectTo);
  }
  return { session, guide };
}
