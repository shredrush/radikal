import { unstable_cache, updateTag } from "next/cache";

import { prisma } from "@/lib/prisma";

const SESSION_VERSION_REVALIDATE_SECONDS = 60;

/**
 * Reading session versions through the shared data cache avoids a database
 * round-trip for every JWT decode while retaining short-lived revocation. The
 * role rides along on the same cached row so the JWT callback can refresh the
 * signed-in role without an extra query — a role change (guide approval,
 * demotion, …) invalidates the tag and the next request picks up the new role.
 */
export function getSessionVersion(userId: string) {
  return unstable_cache(
    () =>
      prisma.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: { sessionVersion: true, role: true },
      }),
    ["session-version", userId],
    { tags: [`session-version:${userId}`], revalidate: SESSION_VERSION_REVALIDATE_SECONDS },
  )();
}

export function invalidateSessionVersion(userId: string) {
  updateTag(`session-version:${userId}`);
}
