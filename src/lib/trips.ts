import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

const tripDetailInclude = {
  tripLocation: true,
  inclusions: { orderBy: { order: "asc" } },
  highlights: { orderBy: { order: "asc" } },
  slots: { orderBy: { date: "asc" } },
} satisfies Prisma.TripInclude;

export function fetchTripsWithDetails(
  where: Prisma.TripWhereInput = {},
  options: { skip?: number; take?: number } = {},
) {
  return prisma.trip.findMany({
    where,
    orderBy: { createdAt: "asc" },
    skip: options.skip,
    take: options.take,
    include: {
      ...tripDetailInclude,
      guide: { select: { id: true, name: true } },
    },
  });
}
