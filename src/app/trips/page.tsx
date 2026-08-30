import { unstable_cache } from "next/cache";

import { prisma, safeDb } from "@/lib/prisma";
import { TripsExplorer } from "@/components/trips/trips-explorer";
import { FaqSection } from "@/components/trips/faq-section";

// The filter UI (sport/travel style/location/date) is applied in memory below,
// so every filter combination reuses this single cached query instead of
// hitting Postgres on each click. `select` also trims the payload to only the
// fields this page actually renders/filters on (the previous `include` pulled
// every scalar column plus every slot row for every trip).
const getTripsPageTrips = unstable_cache(
  async () => {
    return prisma.trip.findMany({
      where: {
        deletedAt: null,
        OR: [{ guideId: null }, { guide: { deletedAt: null, user: { deletedAt: null } } }],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        type: true,
        categories: true,
        location: true,
        description: true,
        priceInRupees: true,
        durationDays: true,
        images: true,
        guide: { select: { name: true } },
        slots: { where: { deletedAt: null }, select: { date: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  },
  ["trips-page-trips"],
  // Admin create/update actions already call revalidatePath("/trips"), which
  // invalidates this cache on-demand; `revalidate` is just a safety net.
  { tags: ["trips"], revalidate: 300 },
);

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | undefined;
    sport?: string | string[] | undefined;
    travelStyle?: string | string[] | undefined;
    location?: string | string[] | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
  }>;
}) {
  const { q } = await searchParams;
  const trips = await safeDb("trips.catalog", () => getTripsPageTrips(), []);

  const serializedTrips = trips.map((trip) => ({
    ...trip,
    slots: trip.slots.map((slot) => ({ date: slot.date instanceof Date ? slot.date.toISOString() : slot.date })),
  }));

  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pb-10 pt-4 sm:px-6 sm:pb-16 sm:pt-6 lg:px-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="font-heading text-3xl font-semibold tracking-wide sm:text-4xl">
            Small groups. Big adventures. Sustainable travel.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            We curate small group trips and education courses for adventure enthusiasts, led by certified experts
          </p>
        </div>

        <TripsExplorer trips={serializedTrips} initialQuery={q} />

        <FaqSection />
      </section>
    </div>
  );
}
