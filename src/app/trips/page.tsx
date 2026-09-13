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
import { MAX_TRAVEL_STYLE_FILTERS } from "@/lib/trip-filter-constants";
import { TripsExplorer } from "@/components/trips/trips-explorer";
import { TripsCatalogSkeleton, TripsPageTemplate } from "@/components/trips/trips-page-template";

const PROTOMAPS_STYLE_URL = "https://api.protomaps.com/styles/v5/light/en.json";

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

async function CatalogContent({
  searchParams,
}: {
  searchParams: Promise<PublicTripSearchParams>;
}) {
  const params = await searchParams;
  const filters = getPublicTripFilters(params);
  const protomapsApiKey = process.env.PROTOMAPS_API_KEY;
  const mapStyleUrl = protomapsApiKey
    ? `${PROTOMAPS_STYLE_URL}?key=${encodeURIComponent(protomapsApiKey)}`
    : null;
  const showMap = params.view === "map" && Boolean(mapStyleUrl);
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
  const hasMapTrips = showMap
    ? await safeDb(
        "trips.map-count",
        () => prisma.trip.count({
          where: {
            AND: [
              getPublicTripWhere(catalogFilters),
              { mapVisible: true, latitude: { not: null }, longitude: { not: null } },
            ],
          },
        }).then((count) => count > 0),
        false,
      )
    : false;

  return (
    <TripsExplorer
      trips={catalog.trips}
      otherTrips={catalog.otherTrips}
      mapStyleUrl={mapStyleUrl}
      hasMapTrips={hasMapTrips}
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
