import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { startOfTodayIST } from "@/lib/dates";

const tripDetailInclude = {
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
    include: {
      ...tripDetailInclude,
      slots: { orderBy: { date: "asc" } },
      guide: { select: { id: true, name: true } },
      bookings: {
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true, username: true } },
          slot: { select: { id: true, date: true } },
        },
      },
      wishlistItems: { include: { user: { select: { id: true, name: true, email: true, username: true } } } },
      reviews: { include: { user: { select: { id: true, name: true, email: true, username: true } } } },
    },
  });
}
