import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { TripGallery } from "@/components/trips/trip-gallery";
import { TripCard } from "@/components/trips/trip-card";
import { GuideReviewsSection, type GuideReviewData } from "@/components/guides/guide-reviews-section";
import { GuideProfileHeroEditor } from "@/components/guides/guide-profile-hero-editor";
import { GuideProfileBackButton } from "@/components/guides/guide-profile-back-button";
import { GuideProfileSummary } from "@/components/guides/guide-profile-summary";
import { loadDb, prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getGuideImage } from "@/lib/guide-images";
import { resolveGuideAlias } from "@/lib/guide-alias";
import { getDisplayName } from "@/lib/profile-initials";
import { formatShortDate } from "@/lib/format";

const GUIDE_TRIPS_PAGE_SIZE = 6;
const GUIDE_REVIEWS_PAGE_SIZE = 6;

// Guide profile + their trips rarely change; skip the DB round-trip on
// every request (trips are also tagged "trips" so edits still invalidate).
const getGuideDetail = unstable_cache(
  async (username: string, tripsPage: number, reviewsPage: number) => {
    return prisma.guide.findFirst({
      where: { deletedAt: null, user: { username, deletedAt: null } },
      select: {
        id: true,
        userId: true,
        name: true,
        bio: true,
        photo: true,
        photos: true,
        videos: true,
        mediaOrder: true,
        location: true,
        experienceYears: true,
        languages: true,
        sports: true,
        user: { select: { username: true } },
        certifications: {
          orderBy: { createdAt: "desc" },
          select: { id: true, title: true },
        },
        trips: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          skip: (tripsPage - 1) * GUIDE_TRIPS_PAGE_SIZE,
          take: GUIDE_TRIPS_PAGE_SIZE,
          select: {
            id: true,
            slug: true,
            title: true,
            location: true,
            categories: true,
            durationDays: true,
            priceInRupees: true,
            images: true,
          },
        },
        reviews: {
          // Aggregate every completed trip review attributed to this guide.
          // Retired trips retain their snapshot title/date.
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          skip: (reviewsPage - 1) * GUIDE_REVIEWS_PAGE_SIZE,
          take: GUIDE_REVIEWS_PAGE_SIZE,
          select: {
            id: true,
            comment: true,
            createdAt: true,
            tripName: true,
            tripDate: true,
            user: { select: { name: true } },
            trip: { select: { title: true } },
          },
        },
        _count: {
          select: {
            trips: { where: { deletedAt: null } },
            reviews: { where: { deletedAt: null } },
          },
        },
      },
    });
  },
  ["guide-detail"],
  { tags: ["guides", "trips", "reviews"], revalidate: 3600 },
);

async function getResolvedGuide(username: string, tripsPage = 1, reviewsPage = 1) {
  return loadDb("guide.detail", async () => {
    const guide = await getGuideDetail(username, tripsPage, reviewsPage);
    if (guide) return guide;
    await resolveGuideAlias(username);
    return null;
  });
}

export async function generateMetadata({ params }: { params: Promise<{ guideId: string }> }): Promise<Metadata> {
  const { guideId } = await params;
  const guide = await getResolvedGuide(guideId);

  if (!guide) {
    return {
      title: "Guide not found | Radikal",
    };
  }

  return {
    title: `${guide.name} | Radikal Guide`,
    description: `${guide.name} is a vetted guide based in ${guide.location}.`,
  };
}

export default async function GuideDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ guideId: string }>;
  searchParams: Promise<{ tripsPage?: string; reviewsPage?: string }>;
}) {
  const [{ guideId }, pageParams] = await Promise.all([params, searchParams]);
  const parsePage = (value: string | undefined) => {
    const page = Number.parseInt(value ?? "", 10);
    return Number.isSafeInteger(page) && page > 0 ? page : 1;
  };
  const requestedTripsPage = parsePage(pageParams.tripsPage);
  const requestedReviewsPage = parsePage(pageParams.reviewsPage);

  let guide = await getResolvedGuide(guideId, requestedTripsPage, requestedReviewsPage);

  if (!guide) {
    notFound();
  }

  const tripPages = Math.max(1, Math.ceil(guide._count.trips / GUIDE_TRIPS_PAGE_SIZE));
  const reviewPages = Math.max(1, Math.ceil(guide._count.reviews / GUIDE_REVIEWS_PAGE_SIZE));
  const tripsPage = Math.min(requestedTripsPage, tripPages);
  const reviewsPage = Math.min(requestedReviewsPage, reviewPages);

  if (tripsPage !== requestedTripsPage || reviewsPage !== requestedReviewsPage) {
    guide = await getResolvedGuide(guideId, tripsPage, reviewsPage);
    if (!guide) notFound();
  }

  const session = await auth();
  const isOwnGuide = session?.user?.id === guide.userId;

  const fallbackImage = getGuideImage({
    username: guide.user?.username ?? "",
    photo: guide.photo,
    photos: guide.photos,
    tripImage: guide.trips[0]?.images[0],
  });
  const guidePhotoSources =
    (guide.photos ?? []).length > 0
      ? guide.photos
      : guide.photo
        ? [guide.photo]
        : [fallbackImage];

  const guideReviews: GuideReviewData[] = guide.reviews.map((review) => ({
    id: review.id,
    name: getDisplayName(review.user.name),
    trip: review.tripName ?? review.trip?.title ?? "Radikal experience",
    quote: review.comment,
    date: formatShortDate(review.tripDate ?? review.createdAt),
  }));
  const makePageHref = (nextTripsPage: number, nextReviewsPage: number) => {
    const query = new URLSearchParams();
    if (nextTripsPage > 1) query.set("tripsPage", String(nextTripsPage));
    if (nextReviewsPage > 1) query.set("reviewsPage", String(nextReviewsPage));
    const suffix = query.toString();
    return `/${guideId}${suffix ? `?${suffix}` : ""}`;
  };

  return (
    <div className="flex-1">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {isOwnGuide ? (
          <GuideProfileHeroEditor guide={guide} fallbackImage={fallbackImage} />
        ) : (
        <>
          <div className="mb-4">
            <GuideProfileBackButton />
          </div>
          <article className="overflow-hidden rounded-[2rem] border border-border/70 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)]">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="relative h-[320px] self-stretch sm:h-[400px] lg:h-auto lg:min-h-[420px]">
              <TripGallery
                images={guidePhotoSources}
                videos={guide.videos}
                mediaOrder={guide.mediaOrder}
                fallbackImage={fallbackImage}
                alt={guide.name}
                compact
              />
            </div>

            <div className="p-6 sm:p-8 lg:p-8">
              <GuideProfileSummary guide={guide} />
            </div>
          </div>
          </article>
        </>
        )}

        <section className="mt-10 rounded-[2rem] border border-border/70 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)] sm:p-8 lg:p-10">
          <div className="mb-6 flex flex-col gap-2">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Adventures organised by {guide.name}
            </h2>
          </div>

          {guide.trips.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-border/80 bg-background/80 p-6 text-sm text-muted-foreground">
              No trips have been organised by {guide.name} yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {guide.trips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
          {tripPages > 1 ? (
            <nav className="mt-6 flex items-center justify-center gap-4" aria-label="Guide trip pages">
              {tripsPage > 1 ? <Link href={makePageHref(tripsPage - 1, reviewsPage)} className="text-sm font-semibold text-foreground underline-offset-4 hover:underline">Previous</Link> : <span className="text-sm text-muted-foreground">Previous</span>}
              <span className="text-sm text-muted-foreground">Page {Math.min(tripsPage, tripPages)} of {tripPages}</span>
              {tripsPage < tripPages ? <Link href={makePageHref(tripsPage + 1, reviewsPage)} className="text-sm font-semibold text-foreground underline-offset-4 hover:underline">Next</Link> : <span className="text-sm text-muted-foreground">Next</span>}
            </nav>
          ) : null}
        </section>

        <GuideReviewsSection guideName={guide.name} reviews={guideReviews} />
        {reviewPages > 1 ? (
          <nav className="mt-6 flex items-center justify-center gap-4" aria-label="Guide review pages">
            {reviewsPage > 1 ? <Link href={makePageHref(tripsPage, reviewsPage - 1)} className="text-sm font-semibold text-foreground underline-offset-4 hover:underline">Previous</Link> : <span className="text-sm text-muted-foreground">Previous</span>}
            <span className="text-sm text-muted-foreground">Page {Math.min(reviewsPage, reviewPages)} of {reviewPages}</span>
            {reviewsPage < reviewPages ? <Link href={makePageHref(tripsPage, reviewsPage + 1)} className="text-sm font-semibold text-foreground underline-offset-4 hover:underline">Next</Link> : <span className="text-sm text-muted-foreground">Next</span>}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
