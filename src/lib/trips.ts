import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { startOfTodayIST } from "@/lib/dates";

const tripDetailInclude = {
  sportLinks: { include: { sport: true }, orderBy: { sport: { sortOrder: "asc" } } },
  tripLocation: true,
  inclusions: { orderBy: { order: "asc" } },
  highlights: { orderBy: { order: "asc" } },
  slots: {
    where: { deletedAt: null },
    orderBy: { date: "asc" },
    include: {
      _count: {
        select: {
          bookings: { where: { status: { in: ["PENDING", "CONFIRMED"] }, deletedAt: null } },
        },
      },
    },
  },
} satisfies Prisma.TripInclude;

export function fetchTripsWithDetails(
  where: Prisma.TripWhereInput = {},
  options: { skip?: number; take?: number } = {},
) {
  // Only today/future dates are actionable in the slots manager; past
  // (completed) dates stay hidden.
  const startOfToday = startOfTodayIST();

  return prisma.trip.findMany({
    where: {
      deletedAt: null,
      OR: [{ guideId: null }, { guide: { deletedAt: null, user: { deletedAt: null } } }],
      ...where,
    },
    orderBy: { createdAt: "asc" },
    skip: options.skip,
    take: options.take,
    include: {
      ...tripDetailInclude,
      slots: {
        ...tripDetailInclude.slots,
        where: { deletedAt: null, date: { gte: startOfToday } },
      },
      guide: { select: { id: true, name: true } },
    },
  });
}

export function fetchDeletedTripsWithDetails(
  where: Prisma.TripWhereInput = {},
  options: { take?: number } = {},
) {
  return prisma.trip.findMany({
    where: { deletedAt: { not: null }, ...where },
    orderBy: { deletedAt: "desc" },
    take: options.take,
    select: {
      id: true,
      title: true,
      location: true,
      deletedAt: true,
      deletedById: true,
      guide: { select: { name: true } },
      slots: { select: { deletedAt: true } },
      bookings: {
        orderBy: { createdAt: "desc" },
        select: {
          deletedAt: true,
          participantCount: true,
          totalPriceRupees: true,
          user: { select: { name: true, email: true } },
        },
      },
      wishlistItems: { select: { deletedAt: true } },
    },
  });
}
