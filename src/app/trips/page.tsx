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
import { FaqSection } from "@/components/trips/faq-section";

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
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-8xl flex-col gap-4 px-4 pb-10 pt-4 sm:px-6 sm:pb-16 sm:pt-6 lg:px-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="font-heading text-3xl font-semibold tracking-wide sm:text-4xl">
            Small groups. Big adventures. Sustainable travel.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            We curate small group trips and education courses for adventure enthusiasts, led by certified experts
          </p>
        </div>

        <Suspense
          fallback={
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-16 text-center text-sm text-muted-foreground">
              Loading trips...
            </div>
          }
        >
          <CatalogContent searchParams={searchParams} />
        </Suspense>

        <FaqSection />
      </section>
    </div>
  );
}
