import Image from "next/image";
import Link from "next/link";
import { cache, Suspense } from "react";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { ArrowLeft, ExternalLink } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AvailableDatesCard,
  CompletedDatesCard,
  TripDetailsCard,
  WhatsIncludedCard,
  type TripDetailFeatureTrip,
} from "@/components/trips/trip-detail-feature";
import { BookingBar } from "@/components/trips/booking-bar";
import { TripGallery } from "@/components/trips/trip-gallery";
import { loadDb, prisma, safeDb } from "@/lib/prisma";
import type { TripCategory } from "@/generated/prisma/client";
import { FaqSection } from "@/components/trips/faq-section";
import { WishlistButton } from "@/components/trips/wishlist-button";
import { getGuideImage } from "@/lib/guide-images";
import { getDisplayName } from "@/lib/profile-initials";
import { TripCard } from "@/components/trips/trip-card";
import { GuideProfileSummary } from "@/components/guides/guide-profile-summary";
import { formatMonthYear } from "@/lib/format";
import { normalizeTripImagePath } from "@/lib/trip-card-image";
import { isSlotCompleted } from "@/lib/trip-dates";

// Cap the reviews column in the guide section so every trip page
// renders a consistent section height regardless of how many reviews exist.
const MAX_REVIEWS = 4;
const MAX_COMPLETED_SLOTS = 12;

// Cache compact render metadata only. Media may contain large data URLs, which
// exceed Next's 2 MB Data Cache entry limit and cause cache writes to be rejected.
const getTripDetail = unstable_cache(
  async (slug: string) => {
    return prisma.trip.findFirst({
      where: {
        slug,
        deletedAt: null,
        OR: [{ guideId: null }, { guide: { deletedAt: null, user: { deletedAt: null } } }],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        type: true,
        categories: true,
        travelStyleLinks: { where: { travelStyle: { active: true } }, select: { travelStyle: { select: { name: true } } } },
        description: true,
        location: true,
        priceInRupees: true,
        durationDays: true,
        maxGroupSize: true,
        guide: {
          select: {
            id: true,
            name: true,
            bio: true,
            location: true,
            experienceYears: true,
            languages: true,
            sports: true,
            certifications: { select: { id: true, title: true } },
            user: {
              select: {
                username: true,
              },
            },
          },
        },
        reviews: {
          where: { deletedAt: null },
          select: {
            id: true,
            comment: true,
            createdAt: true,
            user: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: MAX_REVIEWS,
        },
        tripLocation: { select: { pickup: true, drop: true } },
        inclusions: {
          orderBy: { order: "asc" },
          select: { id: true, item: true, included: true },
        },
        highlights: {
          orderBy: { order: "asc" },
          select: { id: true, text: true },
        },
      },
    });
  },
  ["trip-detail"],
  { tags: ["trips", "guides"], revalidate: 300 },
);

// Large media is intentionally outside the Data Cache. It remains available
// on the page, while the metadata above retains the common-case cache hit.
const getTripMedia = cache(async (slug: string) => {
  return prisma.trip.findFirst({
    where: {
      slug,
      deletedAt: null,
      OR: [{ guideId: null }, { guide: { deletedAt: null, user: { deletedAt: null } } }],
    },
    select: {
      images: true,
      videos: true,
      mediaOrder: true,
      guidePhoto: true,
      guide: { select: { photo: true, photos: true, videos: true } },
    },
  });
});

const EMPTY_TRIP_MEDIA = {
  images: [] as string[],
  videos: [] as string[],
  mediaOrder: [] as string[],
  guidePhoto: null,
  guide: null,
};

async function getTripSlots(tripId: string) {
  const now = new Date();
  const select = {
    id: true,
    date: true,
    capacity: true,
    booked: true,
    reserved: true,
  } as const;
  const where = {
    deletedAt: null,
    tripId,
  };

  const [upcomingSlots, completedSlots] = await Promise.all([
    prisma.slot.findMany({ where: { ...where, date: { gte: now } }, select, orderBy: { date: "asc" } }),
    prisma.slot.findMany({ where: { ...where, date: { lt: now } }, select, orderBy: { date: "desc" }, take: MAX_COMPLETED_SLOTS }),
  ]);

  return [...completedSlots.reverse(), ...upcomingSlots];
}

// Four trips to show below the FAQ. Prefer trips sharing a category with the
// current trip, then backfill with any remaining trips so the row stays full.
const SIMILAR_TRIPS_COUNT = 4;

const getSimilarTrips = unstable_cache(
  async (categories: TripCategory[], excludeId: string) => {
    const select = {
      id: true,
      slug: true,
      title: true,
      location: true,
      categories: true,
      durationDays: true,
      priceInRupees: true,
      images: true,
    } as const;

    const similar = await prisma.trip.findMany({
      where: {
        id: { not: excludeId },
        deletedAt: null,
        OR: [{ guideId: null }, { guide: { deletedAt: null, user: { deletedAt: null } } }],
        categories: { hasSome: categories },
      },
      select,
      orderBy: { createdAt: "asc" },
      take: SIMILAR_TRIPS_COUNT,
    });

    if (similar.length >= SIMILAR_TRIPS_COUNT) {
      return similar;
    }

    const existingIds = similar.map((trip) => trip.id);
    const filler = await prisma.trip.findMany({
      where: {
        id: { notIn: [excludeId, ...existingIds] },
        deletedAt: null,
        OR: [{ guideId: null }, { guide: { deletedAt: null, user: { deletedAt: null } } }],
      },
      select,
      orderBy: { createdAt: "asc" },
      take: SIMILAR_TRIPS_COUNT - similar.length,
    });

    return [...similar, ...filler];
  },
  ["trip-similar-trips"],
  { tags: ["trips"], revalidate: 300 },
);

async function SimilarTrips({ categories, excludeId }: { categories: TripCategory[]; excludeId: string }) {
  const similarTrips = await safeDb("trip.similar", () => getSimilarTrips(categories, excludeId), []);

  if (similarTrips.length === 0) return null;

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">other adventures you might like</p>
        </div>
        <Link
          href="/trips"
          className="shrink-0 rounded-full border border-border/80 bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
        >
          Explore all
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {similarTrips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </div>
    </section>
  );
}

function SimilarTripsFallback() {
  return (
    <div className="grid animate-pulse grid-cols-2 gap-4 xl:grid-cols-4" aria-label="Loading similar trips" role="status">
      {Array.from({ length: SIMILAR_TRIPS_COUNT }).map((_, index) => (
        <div key={index} className="flex flex-col gap-3">
          <div className="h-[220px] rounded-[0.9rem] border border-border/70 bg-muted/40 sm:h-[300px]" />
          <div className="h-5 w-3/4 rounded bg-muted/40" />
          <div className="h-4 w-full rounded bg-muted/40" />
        </div>
      ))}
      <span className="sr-only">Loading similar trips</span>
    </div>
  );
}

function TripGalleryFallback() {
  return <div className="h-full animate-pulse bg-muted/60" aria-label="Loading trip photos" role="status" />;
}

function TripAvailabilityFallback() {
  return (
    <div className="flex flex-col gap-6" aria-label="Loading trip availability" role="status">
      <div className="h-40 animate-pulse rounded-[1.5rem] border border-border/80 bg-muted/40" />
      <div className="h-52 animate-pulse rounded-[1.5rem] border border-border/80 bg-muted/40" />
      <div className="h-44 animate-pulse rounded-[1.5rem] border border-border/80 bg-muted/40" />
      <span className="sr-only">Loading trip availability</span>
    </div>
  );
}

async function TripMediaGallery({ slug, title }: { slug: string; title: string }) {
  const media = await safeDb("trip.media", () => getTripMedia(slug), EMPTY_TRIP_MEDIA);
  const resolvedMedia = media ?? EMPTY_TRIP_MEDIA;
  const images = resolvedMedia.images
    .map((image) => normalizeTripImagePath(image, slug))
    .filter(Boolean);
  const mediaOrder = resolvedMedia.mediaOrder
    .map((item) => (resolvedMedia.images.includes(item) ? normalizeTripImagePath(item, slug) : item))
    .filter(Boolean);

  return (
    <TripGallery
      images={images}
      videos={resolvedMedia.videos}
      mediaOrder={mediaOrder}
      fallbackImage={`/activities/${slug}/cover.png`}
      alt={title}
      compact
    />
  );
}

async function TripAvailability({ trip }: { trip: TripDetailFeatureTrip }) {
  const slots = await safeDb("trip.slots", () => getTripSlots(trip.id), []);
  const tripWithSlots = { ...trip, slots };
  const hasUpcomingSlots = slots.some((slot) => !isSlotCompleted(slot.date, new Date()));

  return (
    <>
      <BookingBar
        tripId={trip.id}
        pricePerPerson={trip.priceInRupees}
        durationDays={trip.durationDays}
        maxGroupSize={trip.maxGroupSize}
        hasUpcomingSlots={hasUpcomingSlots}
      />
      <AvailableDatesCard trip={tripWithSlots} />
      <CompletedDatesCard trip={tripWithSlots} />
      <WhatsIncludedCard trip={tripWithSlots} />
    </>
  );
}

async function GuideProfileMedia({
  slug,
  guide,
}: {
  slug: string;
  guide: { name: string; user: { username: string | null } | null };
}) {
  const media = await safeDb("trip.media", () => getTripMedia(slug), EMPTY_TRIP_MEDIA);
  const resolvedMedia = media ?? EMPTY_TRIP_MEDIA;
  const guideProfileImage = resolvedMedia.guidePhoto ?? getGuideImage({
    username: guide.user?.username ?? "",
    photo: resolvedMedia.guide?.photo ?? null,
    photos: resolvedMedia.guide?.photos ?? [],
    tripImage: resolvedMedia.images[0],
  });
  const guideMediaIsVideo = Boolean(
    resolvedMedia.guidePhoto && resolvedMedia.guide?.videos.includes(resolvedMedia.guidePhoto),
  );

  return guideMediaIsVideo ? (
    <video
      src={resolvedMedia.guidePhoto ?? undefined}
      muted
      autoPlay
      loop
      playsInline
      preload="metadata"
      className="h-full w-full object-cover"
    />
  ) : (
    <Image
      src={guideProfileImage}
      alt={guide.name}
      fill
      className="object-cover"
      sizes="(max-width: 1024px) 100vw, 24vw"
    />
  );
}

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  // Trip data is database-backed, so defer it until a request arrives rather
  // than requiring the database during Vercel's build prerendering.
  await connection();
  const { tripId } = await params;

  const tripDetail = await loadDb("trip.detail", () => getTripDetail(tripId));

  if (!tripDetail) {
    notFound();
  }

  const trip = {
    ...tripDetail,
    images: [] as string[],
    videos: [] as string[],
    mediaOrder: [] as string[],
    slots: [],
  };

  const guide = trip.guide;

  // Always render four review rows so the guide section keeps a consistent
  // height across trips, padding any missing reviews with placeholders.
  const reviewSlots = Array.from({ length: MAX_REVIEWS }, (_, index) => trip.reviews[index] ?? null);

  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-8xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-16 lg:px-10">
        <Link
          href="/trips"
          className="flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          view all trips
        </Link>

        {/* Trip header */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-heading text-3xl font-semibold tracking-wide text-foreground sm:text-4xl">
            {trip.title}
          </h1>
          <WishlistButton tripId={trip.id} />
        </div>

        {/* Trip photos */}
        <div className="relative h-[320px] overflow-hidden rounded-[2rem] border border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)] bg-muted/60 sm:h-[400px] lg:h-[480px]">
          <Suspense fallback={<TripGalleryFallback />}>
            <TripMediaGallery slug={trip.slug} title={trip.title} />
          </Suspense>
        </div>

        {/* Trip details + booking */}
        <div className="grid items-stretch gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <TripDetailsCard trip={trip} travelStyleTags={trip.travelStyleLinks.map((link) => link.travelStyle.name)} />
          <div className="flex flex-col gap-6">
            <Suspense fallback={<TripAvailabilityFallback />}>
              <TripAvailability trip={trip} />
            </Suspense>
          </div>
        </div>

        <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
          <CardHeader>
            <CardTitle className="text-xl">Your guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm leading-6 text-muted-foreground">
            {guide ? (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,1.1fr)]">
                  <div className="relative min-h-[288px] overflow-hidden rounded-[1.5rem] border border-border/70 bg-muted/60 lg:min-h-0">
                    <Suspense fallback={<div className="h-full animate-pulse bg-muted/60" aria-label="Loading guide photo" role="status" />}>
                      <GuideProfileMedia slug={trip.slug} guide={guide} />
                    </Suspense>
                  </div>

                <GuideProfileSummary
                  guide={guide}
                  heading={
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                        {guide.name}
                      </h3>
                      <Link
                        href={`/${guide.user?.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-orange-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-900"
                      >
                        View public profile
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  }
                />

                <div className="lg:border-l lg:border-border/60 lg:pl-6">
                  <p className="text-sm font-semibold text-foreground">
                    words from community
                    {trip.reviews.length > 0 && (
                      <span className="ml-2 font-normal text-muted-foreground">({trip.reviews.length})</span>
                    )}
                  </p>
                  <ul className="mt-3 space-y-3">
                    {reviewSlots.map((review, index) =>
                      review ? (
                        <li key={review.id} className="rounded-2xl border border-border/70 bg-muted/40 p-3">
                          <p className="font-medium text-foreground">{getDisplayName(review.user.name)}</p>
                          <p className="mt-2 text-muted-foreground">{review.comment}</p>
                          <p className="mt-2 text-xs text-muted-foreground/80">
                            {formatMonthYear(review.createdAt)}
                          </p>
                        </li>
                      ) : (
                        <li
                          key={`review-placeholder-${index}`}
                          className="flex min-h-[76px] items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 p-3 text-center text-sm text-muted-foreground"
                        >
                          {index === 0 ? "No reviews yet — be the first to share your experience." : ""}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <p>No guide details are available for this trip yet.</p>
            )}
          </CardContent>
        </Card>

        <FaqSection />

        <Suspense fallback={<SimilarTripsFallback />}>
          <SimilarTrips categories={trip.categories} excludeId={trip.id} />
        </Suspense>
      </section>
    </div>
  );
}
