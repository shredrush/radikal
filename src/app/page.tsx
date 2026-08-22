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

// Guide cards on the home page are data-driven so every guide gets a public
// profile link; guides rarely change, so cache like the community roster.
const getHomeGuides = unstable_cache(
  async () => {
    return prisma.guide.findMany({
      orderBy: { name: "asc" },
      include: {
        certifications: {
          orderBy: { yearIssued: "desc" },
          take: 3,
        },
      },
    });
  },
  ["home-guides"],
  { tags: ["guides"], revalidate: 3600 },
);

export default async function Home() {
  const [activities, guides] = await Promise.all([getHomeActivities(), getHomeGuides()]);

  return (
    <div className="flex flex-1 flex-col">
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
        guides={guides.map((guide) => ({
          slug: guide.slug,
          name: guide.name,
          location: guide.location,
          photo: guide.photos[0] ?? guide.photo,
          certifications: guide.certifications.map((certification) => certification.title),
        }))}
      />
    </div>
  );
}
