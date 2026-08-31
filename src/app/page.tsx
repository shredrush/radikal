import { unstable_cache } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";

import { prisma, safeDb } from "@/lib/prisma";
import { orderGuidesByFeaturedUsernames } from "@/lib/guides";
import { SearchableTrips } from "@/components/home/searchable-trips";
import { getGuideImage } from "@/lib/guide-images";
import { getDisplayName } from "@/lib/profile-initials";
import { formatShortDate } from "@/lib/format";

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
      where: {
        deletedAt: null,
        OR: [{ guideId: null }, { guide: { deletedAt: null, user: { deletedAt: null } } }],
      },
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
// `select` keeps the cached payload to just the columns the cards render
// (the previous `include` pulled every guide column — bio, experience,
// media arrays, … — for a section that only shows name/location/photo).
const getHomeGuides = unstable_cache(
  async () => {
    const guides = await prisma.guide.findMany({
      where: { deletedAt: null, user: { deletedAt: null } },
      orderBy: { name: "asc" },
      select: {
        name: true,
        location: true,
        photo: true,
        photos: true,
        certifications: {
          orderBy: { yearIssued: "desc" },
          take: 3,
          select: { title: true },
        },
        user: { select: { username: true } },
      },
    });

    return orderGuidesByFeaturedUsernames(guides);
  },
  ["home-guides"],
  { tags: ["guides"], revalidate: 3600 },
);

// The home-page "Travellers love the Radikal Experiences" section is driven by
// the reviews travellers leave on completed trips (seeded via the demo data).
// Reviews live with the guide, not the trip: they survive trip deletion, so
// pull the latest live reviews from guides still on the platform. Because any
// particular trip's reviews can disappear with it, the query falls back to any
// other available reviews instead of keying off a fixed set of trips.
const getHomeReviews = unstable_cache(
  async () => {
    const reviewScope: Prisma.ReviewWhereInput = {
      deletedAt: null,
      OR: [
        // Guide-linked reviews stay live as long as the guide is active,
        // even when the underlying trip was deleted.
        { guide: { deletedAt: null, user: { deletedAt: null } } },
        // Trip-only reviews (no guide linked) still require a live trip.
        { guideId: null, trip: { deletedAt: null } },
      ],
    };

    // Latest review per guide, capped to the 4 most-recently-reviewed guides,
    // so the testimonials row always reaches 4 distinct guides when they exist
    // (guide-less trip reviews group under null as one fallback slot).
    const latestPerGuide = await prisma.review.groupBy({
      by: ["guideId"],
      where: reviewScope,
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: "desc" } },
      take: 4,
    });

    const reviews = await Promise.all(
      latestPerGuide.map((entry) =>
        prisma.review.findFirst({
          where: { ...reviewScope, guideId: entry.guideId },
          orderBy: { createdAt: "desc" },
          select: {
            guideId: true,
            tripId: true,
            tripName: true,
            tripDate: true,
            createdAt: true,
            comment: true,
            user: { select: { name: true } },
            trip: { select: { title: true, slug: true, deletedAt: true } },
          },
        }),
      ),
    );
    return reviews.filter((review): review is NonNullable<typeof review> => review !== null);
  },
  ["home-reviews"],
  { tags: ["reviews"], revalidate: 300 },
);

export default async function Home() {
  // If the database is unreachable, serve the page with empty sections instead
  // of crashing. Failures are logged (with connection diagnostics) and never
  // cached, so the next request recovers automatically.
  const [trips, guides, reviews] = await Promise.all([
    safeDb("home.trips", () => getHomeTrips(), []),
    safeDb("home.guides", () => getHomeGuides(), []),
    safeDb("home.reviews", () => getHomeReviews(), []),
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
          username: guide.user?.username ?? "",
          name: guide.name,
          location: guide.location,
          photo: getGuideImage({
            username: guide.user?.username ?? "",
            photo: guide.photo,
            photos: guide.photos,
          }),
          certifications: guide.certifications.map((certification) => certification.title),
        }))}
        testimonials={reviews.map((review) => ({
          name: getDisplayName(review.user.name),
          trip: review.tripName ?? review.trip?.title ?? "Radikal experience",
          slug: review.trip && !review.trip.deletedAt ? review.trip.slug : undefined,
          quote: review.comment,
          date: formatShortDate(review.tripDate ?? review.createdAt),
        }))}
      />
    </div>
  );
}
