import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

// Guides not listed continue to appear alphabetically after these entries.
export const FEATURED_GUIDE_USERNAMES: readonly string[] = [
  "ankur",
  "saurav",
];

export function orderGuidesByFeaturedUsernames<T extends { user: { username: string | null } | null }>(
  guides: T[],
) {
  const positionByUsername = new Map(
    FEATURED_GUIDE_USERNAMES.map((username, position) => [username, position]),
  );

  return guides.sort((left, right) => {
    const leftPosition = positionByUsername.get(left.user?.username ?? "");
    const rightPosition = positionByUsername.get(right.user?.username ?? "");

    if (leftPosition === undefined && rightPosition === undefined) return 0;
    if (leftPosition === undefined) return 1;
    if (rightPosition === undefined) return -1;
    return leftPosition - rightPosition;
  });
}

const guideDetailInclude = {
  certifications: { orderBy: { yearIssued: "desc" } },
  _count: { select: { trips: true } },
  user: { select: { username: true, id: true } },
} satisfies Prisma.GuideInclude;

export type GuideWithDetails = Awaited<ReturnType<typeof fetchGuidesWithDetails>>[number];

/**
 * Shared data source for every guide-facing list. The admin "Manage guides"
 * board fetches all guides here, and guide accounts can reuse the same
 * function (e.g. with `where: { userId: session.user.id }`) when they need to
 * edit their own profile — both always receive the same shape.
 */
export function fetchGuidesWithDetails(where: Prisma.GuideWhereInput = {}) {
  return prisma.guide.findMany({
    where: { deletedAt: null, user: { deletedAt: null }, ...where },
    orderBy: { name: "asc" },
    include: guideDetailInclude,
  });
}
