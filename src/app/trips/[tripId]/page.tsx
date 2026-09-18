import Link from "next/link";
import { cache, Suspense } from "react";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import type { Metadata } from "next";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  AvailableDatesCard,
  TripDetailsCard,
  type TripDetailFeatureTrip,
} from "@/components/trips/trip-detail-feature";
import { BookingBar } from "@/components/trips/booking-bar";
import { TripGallery } from "@/components/trips/trip-gallery";
import { loadDb, prisma, safeDb } from "@/lib/prisma";
import type { TripCategory } from "@/generated/prisma/client";
import { FaqSection } from "@/components/trips/faq-section";
import { WishlistButton } from "@/components/trips/wishlist-button";
import { getGuideImage } from "@/lib/guide-images";
import { TripCard } from "@/components/trips/trip-card";
import { GuideProfileSummary } from "@/components/guides/guide-profile-summary";
import { formatMonthYear } from "@/lib/format";
import { normalizeTripImagePath } from "@/lib/trip-card-image";
import { isSlotCompleted } from "@/lib/trip-dates";
import { ACTIVITY_TYPE_LABELS } from "@/lib/trip-metadata";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, plainText, publicImageUrl } from "@/lib/seo";
import { TripReviewsCarousel } from "@/components/reviews/trip-reviews-carousel";

const MAX_COMPLETED_SLOTS = 12;
const MAX_TRIP_REVIEWS = 24;

// Cache compact render metadata only. Media may contain large data URLs, which
// exceed Next's 2 MB Data Cache entry limit and cause cache writes to be rejected.
const getTripDetail = unstable_cache(
  async (slug: string) => {
    return prisma.trip.findFirst({
      where: {
        slug,
        active: true,
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
        itinerary: true,
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
          take: MAX_TRIP_REVIEWS,
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
      active: true,
      deletedAt: null,
      OR: [{ guideId: null }, { guide: { deletedAt: null, user: { deletedAt: null } } }],
    },
    select: {
      images: true,
      videos: true,
      mediaOrder: true,
      guide: { select: { photo: true, photos: true, videos: true } },
    },
  });
});

const EMPTY_TRIP_MEDIA = {
  images: [] as string[],
  videos: [] as string[],
  mediaOrder: [] as string[],
  guide: null,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tripId: string }>;
}): Promise<Metadata> {
  const { tripId } = await params;
  const trip = await safeDb("trip.metadata", () => getTripDetail(tripId), null);

  if (!trip) {
    return {
      title: "Trip not found",
      robots: { index: false, follow: false },
    };
  }

  const media = await safeDb("trip.metadata-media", () => getTripMedia(trip.slug), EMPTY_TRIP_MEDIA);
  const image = publicImageUrl(
    media?.images
      .map((value) => normalizeTripImagePath(value, trip.slug))
      .find(Boolean),
  );
  const title = `${trip.title} in ${trip.location}`;
  const description = plainText(trip.description);
  const canonical = `/trips/${trip.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      ...(image ? { images: [{ url: image, alt: trip.title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

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
        active: true,
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
        active: true,
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
  const guideProfileImage = getGuideImage({
    username: guide.user?.username ?? "",
    photo: resolvedMedia.guide?.photo ?? null,
    photos: resolvedMedia.guide?.photos ?? [],
    tripImage: resolvedMedia.images[0],
  });
  const guideMedia = [resolvedMedia.guide?.photo, ...(resolvedMedia.guide?.photos ?? []), ...(resolvedMedia.guide?.videos ?? [])]
    .filter((item): item is string => Boolean(item))
    .filter((item, index, all) => all.indexOf(item) === index)
  const guideVideos = (resolvedMedia.guide?.videos ?? []).filter((item) => guideMedia.includes(item));
  const guideImages = guideMedia.filter((item) => !guideVideos.includes(item));

  return <TripGallery images={guideImages} videos={guideVideos} mediaOrder={guideMedia} fallbackImage={guideProfileImage} alt={guide.name} layout="guide" />;
}

function GuideCard({
  guide,
  slug,
}: {
  guide: NonNullable<NonNullable<Awaited<ReturnType<typeof getTripDetail>>>["guide"]>;
  slug: string;
}) {
  return (
    <Card className="h-full w-full overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
      <CardContent className="space-y-5 p-5">
        <div className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-muted/60">
          <Suspense fallback={<div className="h-full animate-pulse bg-muted/60" aria-label="Loading guide photo" role="status" />}>
            <GuideProfileMedia slug={slug} guide={guide} />
          </Suspense>
        </div>
        <GuideProfileSummary
          guide={guide}
          showBio={false}
          showVetted={false}
          locationClassName="text-xs"
          heading={
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Your guide</p>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">{guide.name}</h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-foreground">
                    <ShieldCheck className="size-3" />
                    Vetted
                  </span>
                </div>
              </div>
              <Link
                href={`/${guide.user?.username}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View ${guide.name}'s public profile`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-orange-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-900"
              >
                Profile
                <ExternalLink className="size-3.5" />
              </Link>
            </div>
          }
        />
      </CardContent>
    </Card>
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
  const tripUrl = absoluteUrl(`/trips/${trip.slug}`);
  const tripDescription = plainText(trip.description, 500);
  const tripStructuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Trips", item: absoluteUrl("/trips") },
        { "@type": "ListItem", position: 3, name: trip.title, item: tripUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "TouristTrip",
      "@id": `${tripUrl}#trip`,
      name: trip.title,
      description: tripDescription,
      url: tripUrl,
      touristType: ACTIVITY_TYPE_LABELS[trip.type] ?? trip.type,
      provider: guide
        ? {
            "@type": "Person",
            name: guide.name,
            url: guide.user?.username ? absoluteUrl(`/${guide.user.username}`) : undefined,
          }
        : { "@id": `${absoluteUrl("/")}#organization` },
      offers: {
        "@type": "Offer",
        price: trip.priceInRupees,
        priceCurrency: "INR",
        url: tripUrl,
      },
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <JsonLd data={tripStructuredData} />
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
          <div className="order-2 flex lg:order-1">
            <TripDetailsCard trip={trip} travelStyleTags={trip.travelStyleLinks.map((link) => link.travelStyle.name)} />
          </div>
          <div className="contents order-1 lg:order-2 lg:flex lg:h-full lg:flex-col lg:gap-6">
            <Suspense fallback={<TripAvailabilityFallback />}>
              <TripAvailability trip={trip} />
            </Suspense>
            {guide ? (
              <div className="order-3 flex flex-1 lg:order-none">
                <GuideCard guide={guide} slug={trip.slug} />
              </div>
            ) : null}
          </div>
        </div>

        <TripReviewsCarousel
          reviews={trip.reviews.map((review) => ({
            name: review.user.name ?? "Radikal traveller",
            trip: trip.title,
            quote: review.comment,
            date: formatMonthYear(review.createdAt),
          }))}
        />

        <FaqSection />

        <Suspense fallback={<SimilarTripsFallback />}>
          <SimilarTrips categories={trip.categories} excludeId={trip.id} />
        </Suspense>
      </section>
    </div>
  );
}
