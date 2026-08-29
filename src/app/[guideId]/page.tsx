import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { ShieldCheck } from "lucide-react";

import { TripGallery } from "@/components/trips/trip-gallery";
import { TripCard } from "@/components/trips/trip-card";
import { TestimonialCard } from "@/components/reviews/testimonial-card";
import { prisma } from "@/lib/prisma";
import { getGuideImage } from "@/lib/guide-images";
import { getDisplayName } from "@/lib/profile-initials";
import { ACCENT_PILL } from "@/lib/card-styles";
import { formatMonthYear } from "@/lib/format";

// Guide profile + their trips rarely change; skip the DB round-trip on
// every request (trips are also tagged "trips" so edits still invalidate).
const getGuideDetail = unstable_cache(
  async (slug: string) => {
    return prisma.guide.findFirst({
      where: { slug },
      include: {
        certifications: {
          orderBy: { yearIssued: "desc" },
        },
        trips: {
          orderBy: { createdAt: "asc" },
          // Only the fields rendered on the trip cards; the previous `include`
          // pulled every scalar column (including the full description).
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            location: true,
            categories: true,
            durationDays: true,
            priceInRupees: true,
            images: true,
          },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 3,
          select: {
            id: true,
            comment: true,
            createdAt: true,
            user: { select: { name: true } },
            trip: { select: { slug: true, title: true } },
          },
        },
        _count: {
          select: { trips: true, reviews: true },
        },
      },
    });
  },
  ["guide-detail"],
  { tags: ["guides", "trips"], revalidate: 3600 },
);

export async function generateMetadata({ params }: { params: Promise<{ guideId: string }> }): Promise<Metadata> {
  const { guideId } = await params;
  const guide = await getGuideDetail(guideId);

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

  const guide = await getGuideDetail(guideId);

  if (!guide) {
    notFound();
  }

  const fallbackImage = getGuideImage(guide);
  const guidePhotoSources =
    (guide.photos ?? []).length > 0
      ? guide.photos
      : guide.photo
        ? [guide.photo]
        : [fallbackImage];

  return (
    <div className="flex-1">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">

        <article className="overflow-hidden rounded-[2rem] border border-border/70 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)]">
          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative h-[320px] self-stretch sm:h-[400px] lg:h-auto lg:min-h-[420px]">
              <TripGallery
                images={guidePhotoSources}
                fallbackImage={fallbackImage}
                alt={guide.name}
                compact
              />
            </div>

            <div className="flex flex-col justify-start p-6 sm:p-8 lg:p-8">
              <div className="space-y-3">
                <div>
                  <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    {guide.name}
                  </h1>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">{guide.location}</p>
                  <div className="mt-3 inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Vetted guide
                  </div>
                </div>

                <p className="text-base leading-7 text-muted-foreground">
                  <span className="font-heading text-lg font-semibold text-emerald-700 dark:text-emerald-400">{guide.experienceYears}+</span> years experience
                </p>
                <p className="text-sm leading-6 text-muted-foreground">{guide.bio}</p>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Certifications</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {guide.certifications.map((certification) => (
                      <span
                        key={certification.id}
                        className={`rounded-full border ${ACCENT_PILL} px-3 py-1.5 text-sm font-medium`}
                      >
                        {certification.title}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Languages</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {guide.languages.map((language) => (
                      <span
                        key={`${guide.id}-${language}`}
                        className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
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
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {guide.trips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-10 rounded-[2rem] border border-border/70 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)] sm:p-8 lg:p-10">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                Hear It From Those Who&apos;ve Been There  </p>
            </div>

            {guide._count.reviews > 0 && (
              <Link
                href={`/${guideId}/reviews`}
                className="shrink-0 rounded-full border border-border/80 bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
              >
                View all reviews
              </Link>
            )}
          </div>

          {guide.reviews.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-border/80 bg-background/80 p-6 text-sm text-muted-foreground">
              Travellers haven&apos;t left reviews for {guide.name} yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {guide.reviews.map((review) => (
                <TestimonialCard
                  key={review.id}
                  testimonial={{
                    name: getDisplayName(review.user.name),
                    trip: review.trip?.title ?? "Radikal experience",
                    slug: review.trip?.slug,
                    quote: review.comment,
                    date: formatMonthYear(review.createdAt),
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
