import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { SearchableTrips } from "@/components/home/searchable-trips";

const FEATURED_TRIP_SLUGS = [
  "miyar-valley-trek",
  "lahaul-spiti-cycle",
  "sethan-snowboarding-course",
  "spiti-meditation-escape",
] as const;

// Cached like the /trips catalog query below: the home page is the most
// visited route, so hitting Postgres on every request was the single
// biggest contributor to slow production loads. Admin mutations already
// call updateTag("trips"), which invalidates this on-demand.
const getHomeActivities = unstable_cache(
  async () => {
    return prisma.activity.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        location: true,
        priceInRupees: true,
        durationDays: true,
        categories: true,
        type: true,
        images: true,
        guide: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  },
  ["home-page-activities"],
  { tags: ["trips"], revalidate: 300 },
);

export default async function Home() {
  const activities = await getHomeActivities();

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.08),_transparent_35%)]">
      <SearchableTrips
        featuredTripSlugs={FEATURED_TRIP_SLUGS}
        activities={activities.map((activity) => ({
          id: activity.id,
          slug: activity.slug,
          title: activity.title,
          description: activity.description,
          location: activity.location,
          priceInRupees: activity.priceInRupees,
          durationDays: activity.durationDays,
          categories: activity.categories,
          type: activity.type,
          images: activity.images,
          guide: activity.guide ? { name: activity.guide.name } : null,
        }))}
      />
    </div>
  );
}
