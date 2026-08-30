import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

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
