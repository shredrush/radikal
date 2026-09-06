import { Suspense } from "react";
import { unstable_cache } from "next/cache";

import { prisma, safeDb } from "@/lib/prisma";
import {
  getPublicTripFilterWhere,
  getPublicTripFilters,
  getPublicTripWhere,
  hasPublicTripFilters,
  PUBLIC_CATALOG_OTHER_TRIPS_LIMIT,
  PUBLIC_CATALOG_PAGE_SIZE,
  publicTripVisibilityWhere,
  publicTripCardSelect,
  type PublicTripFilters,
  type PublicTripSearchParams,
} from "@/lib/public-trip-catalog";
import { TripsExplorer } from "@/components/trips/trips-explorer";
import { TripsCatalogSkeleton, TripsPageTemplate } from "@/components/trips/trips-page-template";

const getCatalogPage = unstable_cache(
  async (filters: PublicTripFilters) => {
    const where = getPublicTripWhere(filters);
    const otherWhere = getPublicTripFilterWhere(filters);

    const [trips, totalTrips, otherTrips] = await Promise.all([
      prisma.trip.findMany({
        where,
        select: publicTripCardSelect,
        orderBy: { createdAt: "asc" },
        skip: (filters.page - 1) * PUBLIC_CATALOG_PAGE_SIZE,
        take: PUBLIC_CATALOG_PAGE_SIZE,
      }),
      prisma.trip.count({ where }),
      hasPublicTripFilters(filters)
        ? prisma.trip.findMany({
            where: { AND: [publicTripVisibilityWhere, { NOT: otherWhere }] },
            select: publicTripCardSelect,
            orderBy: { createdAt: "asc" },
            take: PUBLIC_CATALOG_OTHER_TRIPS_LIMIT,
          })
        : Promise.resolve([]),
    ]);

    return { trips, totalTrips, otherTrips };
  },
  ["public-catalog-page"],
  { tags: ["trips"], revalidate: 300 },
);

async function CatalogContent({
  searchParams,
}: {
  searchParams: Promise<PublicTripSearchParams>;
}) {
  const filters = getPublicTripFilters(await searchParams);
  const fallback = {
    trips: [],
    totalTrips: 0,
    otherTrips: [],
  };
  const initialCatalog = await safeDb("trips.catalog", () => getCatalogPage(filters), fallback);
  const totalPages = Math.max(1, Math.ceil(initialCatalog.totalTrips / PUBLIC_CATALOG_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const catalog =
    page === filters.page
      ? initialCatalog
      : await safeDb("trips.catalog", () => getCatalogPage({ ...filters, page }), fallback);

  return (
    <TripsExplorer
      trips={catalog.trips}
      otherTrips={catalog.otherTrips}
      page={page}
      totalPages={totalPages}
    />
  );
}

export default function TripsPage({
  searchParams,
}: {
  searchParams: Promise<PublicTripSearchParams>;
}) {
  return (
    <TripsPageTemplate>
      <Suspense fallback={<TripsCatalogSkeleton />}>
        <CatalogContent searchParams={searchParams} />
      </Suspense>
    </TripsPageTemplate>
  );
}
