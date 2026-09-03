import { unstable_cache } from "next/cache";

import { prisma, safeDb } from "@/lib/prisma";
import { orderGuidesByFeaturedUsernames } from "@/lib/guides";
import { SearchableTrips } from "@/components/home/searchable-trips";
import { getGuideImage } from "@/lib/guide-images";
import { getDisplayName } from "@/lib/profile-initials";
import { formatShortDate } from "@/lib/format";

const FEATURED_TRIP_SLUGS = [
  "backcountry-snowboarding-expedition",
  "lahaul-multi-day-hike",
  "ghepan-lake-trek",
  "kanamo-peak",
  "deo-tibba",
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
        trips: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { images: true },
        },
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
            tripImage: guide.trips[0]?.images[0],
          }),
          certifications: guide.certifications.map((certification) => certification.title),
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
