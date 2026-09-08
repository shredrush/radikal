import { unstable_cache } from "next/cache";

import { prisma, safeDb } from "@/lib/prisma";
import { SearchableTrips } from "@/components/home/searchable-trips";
import { getDisplayName } from "@/lib/profile-initials";
import { formatShortDate } from "@/lib/format";
import {
  HOME_TRIP_LIMIT,
  publicTripCardSelect,
  publicTripVisibilityWhere,
} from "@/lib/public-trip-catalog";

const FEATURED_TRIP_SLUGS = [
  "sethan-snowboarding-course",
  "lahaul-spiti-cycle",
  "lahaul-multi-day-hike",
  "backcountry-snowboarding-expedition",
  "deo-tibba",
] as const;

// Cached like the /trips catalog query below: the home page is the most
// visited route, so hitting Postgres on every request was the single
// biggest contributor to slow production loads. Admin mutations already
// call updateTag("trips"), which invalidates this on-demand.
const getHomeTrips = unstable_cache(
  async () => {
    const featuredTrips = await prisma.trip.findMany({
      where: { AND: [publicTripVisibilityWhere, { slug: { in: [...FEATURED_TRIP_SLUGS] } }] },
      select: publicTripCardSelect,
      orderBy: { createdAt: "asc" },
      take: HOME_TRIP_LIMIT,
    });
    const fallbackTrips =
      featuredTrips.length < HOME_TRIP_LIMIT
        ? await prisma.trip.findMany({
            where: {
              AND: [
                publicTripVisibilityWhere,
                { slug: { notIn: featuredTrips.map((trip) => trip.slug) } },
              ],
            },
            select: publicTripCardSelect,
            orderBy: { createdAt: "asc" },
            take: HOME_TRIP_LIMIT - featuredTrips.length,
          })
        : [];

    return [...featuredTrips, ...fallbackTrips];
  },
  ["home-page-trips"],
  { tags: ["trips"], revalidate: 300 },
);

// The home gallery uses the same guide media as the community page. Keep its
// payload narrow because the gallery only needs photos and guide names.
const getHomeGuides = unstable_cache(
  async () => {
    return prisma.guide.findMany({
      where: { deletedAt: null, user: { deletedAt: null } },
      orderBy: { name: "asc" },
      select: {
        name: true,
        photos: true,
      },
      take: 6,
    });
  },
  ["home-guides"],
  { tags: ["guides"], revalidate: 3600 },
);

// Style tiles are database-managed so the home page never needs remote image
// lookups or a duplicated list of travel-style metadata.
const getHomeTravelStyles = unstable_cache(
  () => prisma.travelStyle.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      image: true,
      _count: {
        select: {
          tripLinks: { where: { trip: publicTripVisibilityWhere } },
        },
      },
    },
  }),
  ["home-page-travel-styles-v3"],
  { tags: ["trips"], revalidate: 300 },
);

// The home-page "Travellers love the Radikal Experiences" section is driven by
// the reviews travellers leave on completed trips (seeded via the demo data).
// Every review is linked to both its trip and guide, while snapshots preserve
// historic trip context when that trip is retired.
const getHomeReviews = unstable_cache(
  async () => {
    // Multiple reviews may belong to the same guide; newer reviews break ties.
    return prisma.review.findMany({
      where: {
        deletedAt: null,
        guide: { deletedAt: null, user: { deletedAt: null } },
      },
      orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
      take: 4,
      select: {
        tripName: true,
        tripDate: true,
        createdAt: true,
        comment: true,
        user: { select: { name: true } },
        trip: { select: { title: true } },
      },
    });
  },
  ["home-reviews"],
  { tags: ["reviews"], revalidate: 300 },
);

export default async function Home() {
  // If the database is unreachable, serve the page with empty sections instead
  // of crashing. Failures are logged (with connection diagnostics) and never
  // cached, so the next request recovers automatically.
  const [trips, guides, reviews, travelStyles] = await Promise.all([
    safeDb("home.trips", () => getHomeTrips(), []),
    safeDb("home.guides", () => getHomeGuides(), []),
    safeDb("home.reviews", () => getHomeReviews(), []),
    safeDb("home.travel-styles", () => getHomeTravelStyles(), []),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <SearchableTrips
        featuredTripSlugs={FEATURED_TRIP_SLUGS}
        trips={trips.map((trip) => ({
          id: trip.id,
          slug: trip.slug,
          title: trip.title,
          location: trip.location,
          priceInRupees: trip.priceInRupees,
          durationDays: trip.durationDays,
          travelStyleLinks: trip.travelStyleLinks,
          type: trip.type,
          images: trip.images,
        }))}
        guideMedia={guides.flatMap((guide) =>
          (guide.photos ?? [])
            .filter(Boolean)
            .map((src, index) => ({
              src,
              alt: `${guide.name} photo ${index + 1}`,
            })),
        ).slice(0, 12)}
        travelStyles={travelStyles.map((style) => ({
          id: style.id,
          name: style.name,
          slug: style.slug,
          image: style.image,
          tripCount: style._count.tripLinks,
        }))}
        testimonials={reviews.map((review) => ({
          name: getDisplayName(review.user.name),
          trip: review.tripName ?? review.trip?.title ?? "Radikal experience",
          quote: review.comment,
          date: formatShortDate(review.tripDate ?? review.createdAt),
        }))}
      />
    </div>
  );
}
