import { TestimonialCard, type TestimonialCardData } from "@/components/reviews/testimonial-card";

export type GuideReviewData = TestimonialCardData & { id: string };

export function GuideReviewsSection({
  guideName,
  reviews,
}: {
  guideName: string;
  reviews: GuideReviewData[];
}) {
  return (
    <section className="mt-10 rounded-[2rem] border border-border/70 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)] sm:p-8 lg:p-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Hear It From Those Who&apos;ve Been There
          </p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-[1.25rem] border border-dashed border-border/80 bg-background/80 p-6 text-sm text-muted-foreground">
          Travellers haven&apos;t left reviews for {guideName} yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {reviews.map((review) => (
            <TestimonialCard key={review.id} testimonial={review} />
          ))}
        </div>
      )}
    </section>
  );
}
