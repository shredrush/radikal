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
  PUBLIC_MAP_TRIP_LIMIT,
  publicTripVisibilityWhere,
  publicTripCardSelect,
  publicTripMapSelect,
  type PublicTripFilters,
  type PublicTripSearchParams,
} from "@/lib/public-trip-catalog";
import { MAX_TRAVEL_STYLE_FILTERS } from "@/lib/trip-filter-constants";
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

const getMapTrips = unstable_cache(
  (filters: PublicTripFilters) =>
    prisma.trip.findMany({
      where: {
        AND: [
          getPublicTripWhere(filters),
          { mapVisible: true, latitude: { not: null }, longitude: { not: null } },
        ],
      },
      select: publicTripMapSelect,
      orderBy: { createdAt: "asc" },
      take: PUBLIC_MAP_TRIP_LIMIT,
    }),
  ["public-catalog-map-trips"],
  { tags: ["trips"], revalidate: 300 },
);

const getTravelStyles = unstable_cache(
  () =>
    prisma.travelStyle.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
    }),
  ["public-catalog-travel-styles"],
  { tags: ["trips"], revalidate: 300 },
);

function toPublicMapTrips(trips: Awaited<ReturnType<typeof getMapTrips>>) {
  return trips.flatMap((trip) => {
    if (trip.latitude === null || trip.longitude === null || !Number.isFinite(trip.latitude) || !Number.isFinite(trip.longitude)) {
      return [];
    }

    // Avoid exposing the precise staff-entered trailhead coordinate in the RSC payload.
    return [{
      ...trip,
      latitude: Math.round(trip.latitude * 1_000) / 1_000,
      longitude: Math.round(trip.longitude * 1_000) / 1_000,
    }];
  });
}

async function CatalogContent({
  searchParams,
}: {
  searchParams: Promise<PublicTripSearchParams>;
}) {
  const params = await searchParams;
  const filters = getPublicTripFilters(params);
  const showMap = params.view === "map";
  const fallback = {
    trips: [],
    totalTrips: 0,
    otherTrips: [],
  };
  const travelStyles = await safeDb("trips.travel-styles", () => getTravelStyles(), []);
  const activeTravelStyleSlugs = new Set(travelStyles.map((style) => style.slug));
  const catalogFilters = {
    ...filters,
    travelStyles: filters.travelStyles
      .filter((slug) => activeTravelStyleSlugs.has(slug))
      .slice(0, MAX_TRAVEL_STYLE_FILTERS),
  };
  const initialCatalog = await safeDb("trips.catalog", () => getCatalogPage(catalogFilters), fallback);
  const totalPages = Math.max(1, Math.ceil(initialCatalog.totalTrips / PUBLIC_CATALOG_PAGE_SIZE));
  const page = Math.min(catalogFilters.page, totalPages);
  const catalog =
    page === catalogFilters.page
      ? initialCatalog
      : await safeDb("trips.catalog", () => getCatalogPage({ ...catalogFilters, page }), fallback);
  const mapTrips = showMap
    ? toPublicMapTrips(await safeDb(
        "trips.map",
        () => getMapTrips({ ...catalogFilters, page: 1 }),
        [],
      ))
    : [];

  return (
    <TripsExplorer
      trips={catalog.trips}
      otherTrips={catalog.otherTrips}
      mapTrips={mapTrips}
      travelStyles={travelStyles}
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
