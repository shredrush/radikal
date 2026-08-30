import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { ArrowLeft } from "lucide-react";

import { prisma, safeDb } from "@/lib/prisma";
import { resolveGuideAlias } from "@/lib/guide-alias";
import { getDisplayName } from "@/lib/profile-initials";
import { formatShortDate } from "@/lib/format";

const getGuideReviews = unstable_cache(
  async (username: string) => {
    return prisma.guide.findFirst({
      where: { deletedAt: null, user: { username, deletedAt: null } },
      select: {
        id: true,
        name: true,
        reviews: {
          // Reviews live with the guide, not the trip: only the guide being
          // on the platform keeps them, so a deleted trip is no longer a
          // reason to hide one.
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            comment: true,
            createdAt: true,
            tripName: true,
            tripDate: true,
            user: { select: { name: true } },
            trip: { select: { slug: true, title: true, deletedAt: true } },
          },
        },
      },
    });
  },
  ["guide-reviews"],
  { tags: ["guides", "trips", "reviews"], revalidate: 3600 },
);

async function getResolvedGuideReviews(username: string) {
  return safeDb("guide.reviews", async () => {
    const guide = await getGuideReviews(username);
    if (guide) return guide;
    await resolveGuideAlias(username);
    return null;
  }, null);
}

export async function generateMetadata({ params }: { params: Promise<{ guideId: string }> }): Promise<Metadata> {
  const { guideId } = await params;
  const guide = await getResolvedGuideReviews(guideId);

  if (!guide) {
    return {
      title: "Guide not found | Radikal",
    };
  }

  return {
    title: `Reviews for ${guide.name} | Radikal`,
    description: `Reviews from travellers who joined trips led by ${guide.name}.`,
  };
}

export default async function GuideReviewsPage({ params }: { params: Promise<{ guideId: string }> }) {
  const { guideId } = await params;
  const guide = await getResolvedGuideReviews(guideId);

  if (!guide) {
    notFound();
  }

  return (
    <div className="flex-1">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <Link
          href={`/${guideId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to guide
        </Link>

        <section className="mt-6 rounded-[2rem] border border-border/70 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)] sm:p-8 lg:p-10">
          <div className="mb-6 flex flex-col gap-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Reviews for {guide.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {guide.reviews.length === 0
                ? "No reviews yet."
                : `${guide.reviews.length} ${guide.reviews.length === 1 ? "review" : "reviews"} from trips led by ${guide.name}`}
            </p>
          </div>

          {guide.reviews.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-border/80 bg-background/80 p-6 text-sm text-muted-foreground">
              Travellers haven&apos;t left reviews for {guide.name} yet.
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {guide.reviews.map((review) => {
                const tripTitle = review.tripName ?? review.trip?.title;
                const tripSlug =
                  review.trip && !review.trip.deletedAt ? review.trip.slug : null;
                return (
                  <li key={review.id} className="rounded-[1.25rem] border border-border/70 bg-muted/30 p-4">
                    <p className="font-medium text-foreground">{getDisplayName(review.user.name)}</p>
                    <p className="mt-2 text-sm leading-6 text-foreground">&ldquo;{review.comment}&rdquo;</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      {tripTitle ? (
                        tripSlug ? (
                          <Link
                            href={`/trips/${tripSlug}`}
                            className="font-medium underline underline-offset-2 transition hover:text-foreground"
                          >
                            {tripTitle}
                          </Link>
                        ) : (
                          <span className="font-medium">{tripTitle}</span>
                        )
                      ) : null}
                      <span>{formatShortDate(review.tripDate ?? review.createdAt)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
