import { NextResponse } from "next/server";

import { prisma, safeDb } from "@/lib/prisma";
import {
  getPublicTripFilters,
  getPublicTripWhere,
  HOME_SEARCH_LIMIT,
  publicTripCardSelect,
} from "@/lib/public-trip-catalog";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const filters = getPublicTripFilters({ q: query });

  if (!filters.query || filters.query.length < 2) {
    return NextResponse.json(
      { trips: [] },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" } },
    );
  }

  const trips = await safeDb(
    "home.trip-search",
    () =>
      prisma.trip.findMany({
        where: getPublicTripWhere(filters),
        select: publicTripCardSelect,
        orderBy: { createdAt: "asc" },
        take: HOME_SEARCH_LIMIT,
      }),
    [],
  );

  return NextResponse.json(
    { trips },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" } },
  );
}
