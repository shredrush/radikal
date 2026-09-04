import Image from "next/image";
import Link from "next/link";
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
import { formatMonthYear } from "@/lib/format";
import { normalizeTripImagePath } from "@/lib/trip-card-image";

// Cap the reviews column in the guide section so every trip page
// renders a consistent section height regardless of how many reviews exist.
const MAX_REVIEWS = 4;

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
            certifications: { select: { id: true, title: true } },
            user: {
              select: {
                username: true,
              },
            },
          },
        },
        slots: {
          where: { deletedAt: null },
          orderBy: {
            date: "asc",
          },
          select: {
            id: true,
            date: true,
            capacity: true,
            booked: true,
            reserved: true,
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
  { tags: ["trips"], revalidate: 300 },
);

// Large media is intentionally outside the Data Cache. It remains available
// on the page, while the metadata above retains the common-case cache hit.
function getTripMedia(slug: string) {
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
}

const EMPTY_TRIP_MEDIA = {
  images: [] as string[],
  videos: [] as string[],
  mediaOrder: [] as string[],
  guidePhoto: null,
  guide: null,
};

// Four trips to show below the FAQ. Prefer trips sharing a category with the
// current trip, then backfill with any remaining trips so the row stays full.
const SIMILAR_TRIPS_COUNT = 4;

const getSimilarTrips = unstable_cache(
  async (categories: TripCategory[], excludeId: string) => {
    const select = {
      id: true,
      slug: true,
      title: true,
      description: true,
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

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  // Trip data is database-backed, so defer it until a request arrives rather
  // than requiring the database during Vercel's build prerendering.
  await connection();
  const { tripId } = await params;

  const [tripDetail, tripMedia] = await Promise.all([
    loadDb("trip.detail", () => getTripDetail(tripId)),
    safeDb("trip.media", () => getTripMedia(tripId), EMPTY_TRIP_MEDIA),
  ]);

  if (!tripDetail) {
    notFound();
  }

  const media = tripMedia ?? EMPTY_TRIP_MEDIA;
  const trip = {
    ...tripDetail,
    images: media.images,
    videos: media.videos,
    mediaOrder: media.mediaOrder,
    guidePhoto: media.guidePhoto,
    guide: tripDetail.guide
      ? {
          ...tripDetail.guide,
          photo: media.guide?.photo ?? null,
          photos: media.guide?.photos ?? [],
          videos: media.guide?.videos ?? [],
        }
      : null,
  };

  const guide = trip.guide;
  const guideProfileImage = trip.guidePhoto ?? (guide
    ? getGuideImage({
        username: guide.user?.username ?? "",
        photo: guide.photo,
        photos: guide.photos,
        tripImage: trip.images[0],
      })
    : "/avatars/fox.svg");
  const guideMediaIsVideo = Boolean(
    guide && trip.guidePhoto && guide.videos.includes(trip.guidePhoto),
  );

  const similarTrips = await safeDb("trip.similar", () => getSimilarTrips(trip.categories, trip.id), []);

  // Always render four review rows so the guide section keeps a consistent
  // height across trips, padding any missing reviews with placeholders.
  const reviewSlots = Array.from({ length: MAX_REVIEWS }, (_, index) => trip.reviews[index] ?? null);

  const normalizedTripImages = trip.images
    .map((image) => normalizeTripImagePath(image, trip.slug))
    .filter(Boolean);
  const normalizedMediaOrder = trip.mediaOrder
    .map((item) => (trip.images.includes(item) ? normalizeTripImagePath(item, trip.slug) : item))
    .filter(Boolean);

  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-16 lg:px-10">
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
          <TripGallery
            images={normalizedTripImages}
            videos={trip.videos}
            mediaOrder={normalizedMediaOrder}
            fallbackImage={`/activities/${trip.slug}/cover.png`}
            alt={trip.title}
            compact
          />
        </div>

        {/* Trip details + booking */}
        <div className="grid items-stretch gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <TripDetailsCard trip={trip} travelStyleTags={trip.categories} />
          <div className="flex flex-col gap-6">
            <BookingBar
              tripId={trip.id}
              pricePerPerson={trip.priceInRupees}
              durationDays={trip.durationDays}
              maxGroupSize={trip.maxGroupSize}
            />
            <AvailableDatesCard trip={trip} />
            <CompletedDatesCard trip={trip} />
            <WhatsIncludedCard trip={trip} />
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
                  {guideMediaIsVideo ? (
                    <video
                      src={trip.guidePhoto ?? undefined}
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
                  )}
                </div>

                <div className="flex flex-col justify-start">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-3">
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
                      <p className="mt-2 text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                        {guide.location}
                      </p>
                    </div>

                    <p className="text-base leading-7 text-muted-foreground">
                      {guide.experienceYears}+ years experience
                    </p>
                    <p className="text-sm leading-6 text-muted-foreground">{guide.bio}</p>
                  </div>

                  <div className="mt-6 space-y-5">
                    {guide.certifications.length > 0 ? (
                      <div>
                        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                          Certifications
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {guide.certifications.map((certification) => (
                            <span
                              key={certification.id}
                              className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-sm font-medium text-foreground/80"
                            >
                              {certification.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {guide.languages.length > 0 ? (
                      <div>
                        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                          Languages
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {guide.languages.map((language) => (
                            <span
                              key={`${guide.id}-${language}`}
                              className="rounded-full bg-black/5 px-3 py-1.5 text-sm font-medium text-foreground"
                            >
                              {language}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

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

          {similarTrips.length === 0 ? null : (
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {similarTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
