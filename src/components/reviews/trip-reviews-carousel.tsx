"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

import { TestimonialCard, type TestimonialCardData } from "@/components/reviews/testimonial-card";

type TripReviewsCarouselProps = {
  reviews: TestimonialCardData[];
};

export function TripReviewsCarousel({ reviews }: TripReviewsCarouselProps) {
  const railRef = useRef<HTMLDivElement>(null);

  if (reviews.length === 0) {
    return (
      <section aria-labelledby="trip-reviews" className="rounded-[1.5rem] border border-dashed border-border/80 bg-muted/20 p-6 text-center sm:p-8">
        <h2 id="trip-reviews" className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          Reviews from travellers
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">No reviews yet. Be the first to share your experience.</p>
      </section>
    );
  }

  const scrollRail = (direction: -1 | 1) => {
    railRef.current?.scrollBy({ left: railRef.current.clientWidth * direction, behavior: "smooth" });
  };

  return (
    <section aria-labelledby="trip-reviews" className="rounded-[1.5rem] border border-border/80 bg-background p-4 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)] sm:p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">From the community</p>
          <h2 id="trip-reviews" className="mt-1 font-heading text-2xl font-semibold tracking-wide text-foreground sm:text-3xl">
            Reviews from travellers
          </h2>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => scrollRail(-1)}
            aria-label="Show previous reviews"
            className="flex size-10 items-center justify-center rounded-full border border-border/80 bg-background text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollRail(1)}
            aria-label="Show next reviews"
            className="flex size-10 items-center justify-center rounded-full border border-border/80 bg-background text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <div ref={railRef} className="mt-6 grid auto-cols-[calc((100%-0.75rem)/2)] grid-flow-col grid-rows-2 gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] lg:auto-cols-[calc((100%-2.25rem)/4)] lg:grid-rows-1 [&::-webkit-scrollbar]:hidden">
        {reviews.map((review, index) => (
          <div key={`${review.name}-${review.date}-${index}`} className="snap-start">
            <TestimonialCard testimonial={review} />
          </div>
        ))}
      </div>
    </section>
  );
}
