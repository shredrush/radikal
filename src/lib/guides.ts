import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

const guideDetailInclude = {
  certifications: {
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true },
  },
  reviews: {
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      comment: true,
      tripName: true,
      tripDate: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  },
  _count: { select: { trips: true } },
  user: { select: { username: true, id: true, name: true } },
} satisfies Prisma.GuideInclude;

export type GuideWithDetails = Awaited<ReturnType<typeof fetchGuidesWithDetails>>[number];

/**
 * `User.name` is the single source of truth for a guide's display name. Every
 * guide write path derives the name through this helper so normalization can
 * change in one place and the two values can never drift.
 */
export function resolveGuideName(user: { name: string }): string {
  return user.name;
}

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
