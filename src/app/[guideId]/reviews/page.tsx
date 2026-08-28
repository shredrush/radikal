import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/prisma";

const getGuideReviews = unstable_cache(
  async (slug: string) => {
    return prisma.guide.findFirst({
      where: { slug },
      select: {
        id: true,
        name: true,
        reviews: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            comment: true,
            user: { select: { name: true } },
            trip: { select: { slug: true, title: true } },
          },
        },
      },
    });
  },
  ["guide-reviews"],
  { tags: ["guides", "trips", "reviews"], revalidate: 3600 },
);

export async function generateMetadata({ params }: { params: Promise<{ guideId: string }> }): Promise<Metadata> {
  const { guideId } = await params;
  const guide = await getGuideReviews(guideId);

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
  const guide = await getGuideReviews(guideId);

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
              {guide.reviews.map((review) => (
                <li key={review.id} className="rounded-[1.25rem] border border-border/70 bg-muted/30 p-4">
                  <p className="font-medium text-foreground">{review.user.name}</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">&ldquo;{review.comment}&rdquo;</p>
                  {review.trip ? (
                    <Link
                      href={`/trips/${review.trip.slug}`}
                      className="mt-2 inline-block text-xs font-medium text-muted-foreground underline underline-offset-2 transition hover:text-foreground"
                    >
                      {review.trip.title}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
