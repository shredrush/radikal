"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { TestimonialCard, type TestimonialCardData } from "@/components/reviews/testimonial-card";
import { cn } from "@/lib/utils";

const PREVIEW_COUNT = 3;

export type GuideReviewData = TestimonialCardData & { id: string };

export function GuideReviewsSection({
  guideName,
  reviews,
}: {
  guideName: string;
  reviews: GuideReviewData[];
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = reviews.length > PREVIEW_COUNT;
  const previewReviews = reviews.slice(0, PREVIEW_COUNT);
  const remainingReviews = reviews.slice(PREVIEW_COUNT);

  return (
    <section className="mt-10 rounded-[2rem] border border-border/70 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)] sm:p-8 lg:p-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Hear It From Those Who&apos;ve Been There
          </p>
        </div>

        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/80 bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            {expanded ? "Show less" : "View all reviews"}
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-200",
                expanded && "rotate-180",
              )}
            />
          </button>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-[1.25rem] border border-dashed border-border/80 bg-background/80 p-6 text-sm text-muted-foreground">
          Travellers haven&apos;t left reviews for {guideName} yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {previewReviews.map((review) => (
            <TestimonialCard key={review.id} testimonial={review} />
          ))}

          {hasMore && (
            <div
              className={cn(
                "col-span-1 grid gap-4 transition-all duration-300 ease-out sm:col-span-3 sm:grid-cols-3",
                expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden sm:col-span-3 sm:grid sm:grid-cols-3 sm:gap-4">
                {remainingReviews.map((review) => (
                  <TestimonialCard key={review.id} testimonial={review} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
