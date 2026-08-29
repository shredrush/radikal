import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Price } from "@/components/currency/price";
import { getTripCardImage, type TripCardImageTrip } from "@/lib/trip-card-image";
import { CARD_ACCENT_BORDER, CARD_ACCENT_SHADOW, ACCENT_PILL_EMERALD } from "@/lib/card-styles";
import { TRIP_CATEGORY_LABELS } from "@/lib/trip-metadata";
import { formatDurationDays } from "@/lib/trip-dates";

export type TripCardTrip = TripCardImageTrip & {
  slug: string;
  location: string;
  durationDays: number;
  priceInRupees: number;
};

export function TripCard({
  trip,
  size = "standard",
}: {
  trip: TripCardTrip;
  size?: "standard" | "compact";
}) {
  const compact = size === "compact";

  return (
    <Link href={`/trips/${trip.slug}`} className="block">
      <Card
        className={`flex flex-col gap-0 overflow-hidden border ${CARD_ACCENT_BORDER} bg-background/95 py-0 ${CARD_ACCENT_SHADOW} transition-transform duration-200 hover:-translate-y-1 ${
          compact
            ? "h-[360px] min-w-0 rounded-[1rem] sm:h-[400px]"
            : "h-full min-h-[320px] rounded-[1.1rem] sm:min-h-[420px]"
        }`}
      >
        <div
          className={`relative -m-[1px] flex-[0_0_48%] min-h-[180px] overflow-hidden bg-muted/60 sm:flex-[0_0_52%] ${
            compact ? "sm:min-h-[200px]" : "sm:min-h-[220px]"
          }`}
        >
          <Image
            src={getTripCardImage(trip)}
            alt={trip.title}
            fill
            className="object-cover"
            sizes={
              compact
                ? "(max-width: 640px) calc(50vw - 8px), (max-width: 1024px) 50vw, 25vw"
                : "(max-width: 640px) calc(50vw - 12px), (max-width: 1024px) calc(50vw - 12px), 25vw"
            }
            loading={compact ? "lazy" : undefined}
          />
          <div
            className={`absolute inset-0 bg-gradient-to-t ${
              compact
                ? "from-black/12 via-black/24 to-black/24"
                : "from-black/70 via-black/15 to-transparent"
            }`}
          />
        </div>
        <div
          className={`flex flex-1 flex-col justify-between ${
            compact ? "gap-1 p-2.5 sm:p-3" : "gap-2 p-4"
          }`}
        >
          <div className="space-y-1.5">
            <div className={compact ? "space-y-1" : undefined}>
              <h3
                className={
                  compact
                    ? "text-[clamp(0.9rem,1.05vw,1.02rem)] font-semibold leading-5 text-foreground"
                    : "text-base font-semibold tracking-tight text-foreground"
                }
              >
                {trip.title}
              </h3>
              <p
                className={
                  compact
                    ? "text-sm text-muted-foreground"
                    : "truncate text-[0.7rem] leading-4 text-muted-foreground sm:text-sm sm:leading-5"
                }
              >
                {trip.location}
              </p>
            </div>
            <div
              className={`${compact ? "" : "mt-1 "}flex min-h-[1.35rem] flex-wrap content-start gap-1`}
            >
              {trip.categories.map((category) => (
                <Badge
                  key={category}
                  variant="secondary"
                  className={
                    compact
                      ? "!w-auto !max-w-full !whitespace-normal !normal-case !tracking-normal rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-center text-[0.72rem] font-medium leading-4 text-foreground/80 sm:text-[0.8rem]"
                      : "rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[0.62rem] font-medium leading-3 text-foreground/80 sm:text-[0.72rem]"
                  }
                >
                  {TRIP_CATEGORY_LABELS[category] ?? category}
                </Badge>
              ))}
            </div>
          </div>
          {compact ? (
            <div className="mt-auto flex justify-end">
              <span className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[0.6rem] font-medium leading-4 text-foreground/80 sm:text-xs">
                {formatDurationDays(trip.durationDays)}
              </span>
            </div>
          ) : (
            <div className="mt-auto flex items-center justify-between gap-1 border-t border-emerald-100 pt-2 dark:border-emerald-500/15">
              <span
                className={`shrink-0 rounded-full border ${ACCENT_PILL_EMERALD} px-1.5 py-0.5 text-[0.6rem] font-medium leading-none sm:text-sm`}
              >
                {formatDurationDays(trip.durationDays)}
              </span>
              <div className="ml-auto flex min-w-0 max-w-[55%] shrink-0 items-center justify-end gap-0.5">
                <Price
                  className="shrink-0 font-heading text-sm font-semibold leading-none text-foreground sm:text-base"
                  amount={trip.priceInRupees}
                />
              </div>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
