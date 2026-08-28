import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";

export interface TestimonialCardData {
  name: string;
  trip: string;
  slug?: string;
  quote: string;
}

export function TestimonialCard({ testimonial }: { testimonial: TestimonialCardData }) {
  const card = (
    <Card className="flex h-full min-h-[80px] flex-col justify-between overflow-hidden rounded-[0.95rem] border border-orange-100/50 bg-card/95 p-2.5 shadow-[0_16px_45px_-28px_rgba(249,115,22,0.11)] transition-transform duration-200 hover:-translate-y-1 hover:border-emerald-200/50 hover:shadow-[0_30px_55px_-25px_rgba(16,185,129,0.14)] dark:border-orange-500/10 dark:hover:border-emerald-500/15 sm:min-h-[120px] sm:p-3 lg:min-h-[120px] lg:p-4">
      <CardContent className="flex flex-1 flex-col justify-between gap-0 p-0">
        <p className="text-[clamp(0.74rem,0.95vw,1rem)] font-semibold leading-5 text-foreground sm:leading-6 lg:leading-7">
          “{testimonial.quote}”
        </p>
        <div className="ml-auto mt-2 flex flex-col items-end text-right">
          <p className="text-[clamp(0.78rem,0.9vw,0.95rem)] font-semibold text-foreground">
            {testimonial.name}
          </p>
          <p className="text-[clamp(0.68rem,0.8vw,0.8rem)] text-muted-foreground">
            {testimonial.trip}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  if (!testimonial.slug) {
    return <div className="h-full">{card}</div>;
  }

  return (
    <Link
      href={`/trips/${testimonial.slug}`}
      aria-label={`Read reviews for ${testimonial.trip}`}
      className="block"
    >
      {card}
    </Link>
  );
}
