import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { ShieldCheck } from "lucide-react";

import { TripGallery } from "@/components/trips/trip-gallery";
import { TripCard } from "@/components/trips/trip-card";
import { GuideReviewsSection, type GuideReviewData } from "@/components/guides/guide-reviews-section";
import { GuideProfileHeroEditor } from "@/components/guides/guide-profile-hero-editor";
import { GuideProfileBackButton } from "@/components/guides/guide-profile-back-button";
import { GuideSports } from "@/components/guides/guide-sports";
import { loadDb, prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getGuideImage } from "@/lib/guide-images";
import { resolveGuideAlias } from "@/lib/guide-alias";
import { getDisplayName } from "@/lib/profile-initials";
import { ACCENT_PILL } from "@/lib/card-styles";
import { formatShortDate } from "@/lib/format";

// Guide profile + their trips rarely change; skip the DB round-trip on
// every request (trips are also tagged "trips" so edits still invalidate).
const getGuideDetail = unstable_cache(
  async (username: string) => {
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
      },
    });
  },
  ["guide-detail"],
  { tags: ["guides", "trips", "reviews"], revalidate: 3600 },
);

async function getResolvedGuide(username: string) {
  return loadDb("guide.detail", async () => {
    const guide = await getGuideDetail(username);
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

export default async function GuideDetailPage({ params }: { params: Promise<{ guideId: string }> }) {
  const { guideId } = await params;

  const guide = await getResolvedGuide(guideId);

  if (!guide) {
    notFound();
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

            <div className="flex min-w-0 flex-col justify-start p-6 sm:p-8 lg:p-8">
              <div className="space-y-3">
                <div>
                  <h1 className="break-words font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    {guide.name}
                  </h1>
                  <p className="mt-2 break-words text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">{guide.location}</p>
                  <div className="mt-3 inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Vetted guide
                  </div>
                </div>

                <p className="break-words text-base leading-7 text-muted-foreground">
                  <span className="font-heading text-lg font-semibold text-emerald-700 dark:text-emerald-400">{guide.experienceYears}+</span> years experience
                </p>
                <p className="break-words text-sm leading-6 text-muted-foreground">{guide.bio}</p>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Certifications</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {guide.certifications.map((certification) => (
                      <span
                        key={certification.id}
                        className={`max-w-full break-words rounded-full border ${ACCENT_PILL} px-3 py-1.5 text-sm font-medium`}
                      >
                        {certification.title}
                      </span>
                    ))}
                  </div>
                </div>

                <GuideSports sports={guide.sports} />
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Languages</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {guide.languages.map((language) => (
                      <span
                        key={`${guide.id}-${language}`}
                        className="max-w-full break-words rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                      >
                        {language}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
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
        </section>

        <GuideReviewsSection guideName={guide.name} reviews={guideReviews} />
      </div>
    </div>
  );
}
