import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { CARD_SURFACE } from "@/lib/card-styles";

export interface TestimonialCardData {
  name: string;
  trip: string;
  slug?: string;
  quote: string;
  date?: string;
}

export function TestimonialCard({ testimonial }: { testimonial: TestimonialCardData }) {
  const card = (
    <Card className={`flex h-full min-h-[80px] flex-col justify-between overflow-hidden rounded-[0.95rem] p-2.5 ${CARD_SURFACE} transition-transform duration-200 hover:-translate-y-1 sm:min-h-[120px] sm:p-3 lg:min-h-[120px] lg:p-4`}>
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
          {testimonial.date ? (
            <p className="text-[clamp(0.62rem,0.72vw,0.72rem)] text-muted-foreground/80">
              {testimonial.date}
            </p>
          ) : null}
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
