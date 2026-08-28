import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Price } from "@/components/currency/price";
import { getTripCardImage } from "@/lib/trip-card-image";

const CATEGORY_LABELS: Record<string, string> = {
  ADVENTURE_ENTHUSIAST: "Adventure Enthusiast",
  WOMEN_ONLY: "Women Only",
  CORPORATE: "Corporate",
  LUXURY: "Luxury",
  FAMILY: "For Family",
  COURSE: "Courses",
  SELF_GUIDED: "Self Guided",
  BEGINNER_FRIENDLY: "Beginner Friendly",
};

export interface TripCardTrip {
  slug: string;
  title: string;
  location: string;
  description: string;
  categories: string[];
  durationDays: number;
  priceInRupees: number;
  images: string[];
}

export function TripCard({ trip }: { trip: TripCardTrip }) {
  return (
    <Link href={`/trips/${trip.slug}`} className="block">
      <Card className="flex h-full min-h-[320px] flex-col gap-0 overflow-hidden rounded-[1.1rem] border border-orange-100/50 bg-background/95 py-0 shadow-[0_20px_60px_-35px_rgba(249,115,22,0.125)] transition-transform duration-200 hover:-translate-y-1 hover:border-emerald-200/50 hover:shadow-[0_30px_55px_-25px_rgba(16,185,129,0.15)] dark:border-orange-500/10 dark:hover:border-emerald-500/15 sm:min-h-[420px]">
        <div className="relative -m-[1px] flex-[0_0_48%] min-h-[180px] overflow-hidden bg-muted/60 sm:flex-[0_0_52%] sm:min-h-[220px]">
          <Image
            src={getTripCardImage(trip)}
            alt={trip.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) calc(50vw - 12px), (max-width: 1024px) calc(50vw - 12px), 25vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
        </div>
        <div className="flex flex-1 flex-col justify-between gap-2 p-4">
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold tracking-tight text-foreground">{trip.title}</h3>
            <p className="truncate text-[0.7rem] leading-4 text-muted-foreground sm:text-sm sm:leading-5">{trip.location}</p>
          </div>
          <div className="mt-1 flex min-h-[1.35rem] flex-wrap content-start gap-1">
            {trip.categories.map((category) => (
              <Badge key={category} variant="secondary" className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[0.62rem] font-medium leading-3 text-foreground/80 sm:text-[0.72rem]">
                {CATEGORY_LABELS[category] ?? category}
              </Badge>
            ))}
          </div>
          <div className="mt-auto flex items-center justify-between gap-1 border-t border-emerald-100 pt-2 dark:border-emerald-500/15">
            <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[0.6rem] font-medium leading-none text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 sm:text-sm">
              {trip.durationDays} {trip.durationDays === 1 ? "day" : "days"}
            </span>
            <div className="ml-auto flex min-w-0 max-w-[55%] shrink-0 items-center justify-end gap-0.5">
              <Price
                className="shrink-0 font-heading text-sm font-semibold leading-none text-foreground sm:text-base"
                amount={trip.priceInRupees}
              />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
