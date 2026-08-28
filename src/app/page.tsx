import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { SearchableTrips } from "@/components/home/searchable-trips";
import { getGuideImage } from "@/lib/guide-images";

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
const getHomeTrips = unstable_cache(
  async () => {
    return prisma.trip.findMany({
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
  ["home-page-trips"],
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

// The home-page "Travellers love the Radikal Experiences" section is driven by
// the reviews travellers leave on completed trips (seeded via the demo data).
const getHomeReviews = unstable_cache(
  async () => {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        tripId: true,
        comment: true,
        user: { select: { name: true } },
        trip: { select: { title: true } },
      },
    });

    // Surface one review per trip so the home page shows a diverse set of
    // experiences instead of several comments from the same trip.
    const seenTrips = new Set<string>();
    const distinctReviews: typeof reviews = [];

    for (const review of reviews) {
      if (review.tripId && seenTrips.has(review.tripId)) continue;
      if (review.tripId) seenTrips.add(review.tripId);
      distinctReviews.push(review);
      if (distinctReviews.length >= 4) break;
    }

    return distinctReviews;
  },
  ["home-reviews"],
  { revalidate: 300 },
);

export default async function Home() {
  const [trips, guides, reviews] = await Promise.all([
    getHomeTrips(),
    getHomeGuides(),
    getHomeReviews(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <SearchableTrips
        featuredTripSlugs={FEATURED_TRIP_SLUGS}
        trips={trips.map((trip) => ({
          id: trip.id,
          slug: trip.slug,
          title: trip.title,
          description: trip.description,
          location: trip.location,
          priceInRupees: trip.priceInRupees,
          durationDays: trip.durationDays,
          categories: trip.categories,
          type: trip.type,
          images: trip.images,
          guide: trip.guide ? { name: trip.guide.name } : null,
        }))}
        guides={guides.map((guide) => ({
          slug: guide.slug,
          name: guide.name,
          location: guide.location,
          photo: getGuideImage(guide),
          certifications: guide.certifications.map((certification) => certification.title),
        }))}
        testimonials={reviews.map((review) => ({
          name: review.user.name,
          trip: review.trip?.title ?? "Radikal experience",
          quote: review.comment,
        }))}
      />
    </div>
  );
}
