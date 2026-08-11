import { prisma } from "@/lib/prisma";
import { SearchableTrips } from "@/components/home/searchable-trips";

export const dynamic = "force-dynamic";

const FEATURED_TRIP_SLUGS = [
  "miyar-valley-trek",
  "lahaul-spiti-cycle",
  "sethan-snowboarding-course",
  "spiti-meditation-escape",
] as const;

export default async function Home() {
  const activities = await prisma.activity.findMany({
    include: { guide: true },
    orderBy: { createdAt: "asc" },
  });

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
