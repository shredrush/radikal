import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Price } from "@/components/currency/price";
import {
  getTripCardImage,
  normalizeTripImagePath,
  type TripCardImageTrip,
} from "@/lib/trip-card-image";
import { TripCardSlideshow } from "@/components/trips/trip-card-slideshow";
import { CARD_SURFACE } from "@/lib/card-styles";
import { TRIP_CATEGORY_LABELS } from "@/lib/trip-metadata";
import { formatDurationDays } from "@/lib/trip-dates";

export type TripCardTrip = TripCardImageTrip & {
  slug: string;
  location: string;
  categories: string[];
  durationDays: number;
  priceInRupees: number;
};

export function TripCard({
  trip,
  size = "standard",
  showPrice = true,
  imageOnly = false,
  showTravelStyles = false,
  showImageSummary = false,
  slideshow = false,
  reducedMobileHeight = false,
}: {
  trip: TripCardTrip;
  size?: "standard" | "compact";
  showPrice?: boolean;
  imageOnly?: boolean;
  showTravelStyles?: boolean;
  showImageSummary?: boolean;
  slideshow?: boolean;
  reducedMobileHeight?: boolean;
}) {
  const compact = size === "compact";
  const imageCardWithSummary = imageOnly && showImageSummary;

  let slideSources: string[] = [];
  if (slideshow) {
    const images = Array.from(
      new Set(
        (trip.images ?? [])
          .map((image) => normalizeTripImagePath(image, trip.slug))
          .filter(Boolean),
      ),
    );
    slideSources = images.length > 0 ? images : [getTripCardImage(trip)].filter(Boolean);
  }
  const hasSlideshow = slideSources.length > 0;
  const imageSizes = compact
    ? "(max-width: 640px) calc(50vw - 8px), (max-width: 1024px) 50vw, 25vw"
    : "(max-width: 640px) calc(50vw - 12px), (max-width: 1024px) calc(50vw - 12px), 25vw";

  return (
    <Link
      href={`/trips/${trip.slug}`}
      className={imageCardWithSummary ? "flex h-full w-full flex-col gap-2" : "block h-full w-full"}
    >
      <Card
        className={`flex flex-col gap-0 overflow-hidden py-0 transition-transform duration-200 hover:-translate-y-1 ${CARD_SURFACE} ${
          imageCardWithSummary
            ? "h-auto min-h-0 flex-none rounded-[0.9rem]"
            : compact
            ? "h-[360px] min-w-0 rounded-[0.9rem] sm:h-[400px]"
            : `h-full ${reducedMobileHeight ? "min-h-[256px]" : "min-h-[320px]"} rounded-[0.9rem] sm:min-h-[420px]`
        }`}
      >
        <div
          className={`relative -m-[1px] overflow-hidden bg-muted/60 ${
            imageOnly
              ? imageCardWithSummary
                ? "aspect-[25/27] w-full flex-none"
                : "flex-1"
              : `flex-[0_0_48%] min-h-[180px] sm:flex-[0_0_52%] ${
                  compact ? "sm:min-h-[200px]" : "sm:min-h-[220px]"
                }`
          }`}
        >
          {hasSlideshow ? (
            <TripCardSlideshow slides={slideSources} alt={trip.title} sizes={imageSizes} />
          ) : (
            <Image
              src={getTripCardImage(trip)}
              alt={trip.title}
              fill
              className="object-cover"
              sizes={imageSizes}
              loading={compact ? "lazy" : undefined}
            />
          )}
          <div
            className={`${hasSlideshow ? "pointer-events-none " : ""}absolute inset-0 bg-gradient-to-t ${
              imageOnly
                ? "from-black/70 via-black/10 to-transparent"
                : compact
                ? "from-black/12 via-black/24 to-black/24"
                : "from-black/70 via-black/15 to-transparent"
            }`}
          />
          {imageOnly ? (
            <div className={`${hasSlideshow ? "pointer-events-none " : ""}absolute inset-x-0 bottom-0 p-4`}>
              {!imageCardWithSummary ? (
                <h3 className="text-base font-semibold tracking-tight text-white sm:text-lg">{trip.title}</h3>
              ) : null}
              {showTravelStyles && trip.categories.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {trip.categories.map((category) => (
                    <Badge
                      key={category}
                      variant="secondary"
                      className="rounded-full border border-white/25 bg-transparent px-1.5 py-0.5 text-[0.55rem] font-medium leading-3 text-white sm:text-[0.65rem]"
                    >
                      {TRIP_CATEGORY_LABELS[category] ?? category}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        {imageOnly ? null : (
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
                        : "max-w-full rounded-full border border-border/70 bg-background/80 px-1.5 py-0.5 text-[0.55rem] font-medium leading-3 text-foreground/80 sm:px-2 sm:text-[0.72rem]"
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
              <div className="mt-auto flex items-center justify-between gap-1 border-t border-border/70 pt-2">
                <span className="shrink-0 rounded-full border border-border/70 bg-background/80 px-1.5 py-0.5 text-[0.6rem] font-medium leading-none text-foreground/80 sm:text-sm">
                  {formatDurationDays(trip.durationDays)}
                </span>
                {showPrice ? (
                  <div className="ml-auto flex min-w-0 max-w-[55%] shrink-0 items-center justify-end gap-0.5">
                    <Price
                      className="shrink-0 font-heading text-sm font-semibold leading-none text-foreground sm:text-base"
                      amount={trip.priceInRupees}
                    />
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </Card>
      {imageCardWithSummary ? (
        <div className="flex flex-col gap-1.5 px-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-5 tracking-tight text-foreground sm:text-base sm:leading-6">
            {trip.title}
          </h3>
          <div className="flex items-center justify-between gap-3 text-sm font-medium text-foreground">
            <span>{formatDurationDays(trip.durationDays)}</span>
            <Price className="font-heading text-base font-semibold text-foreground" amount={trip.priceInRupees} />
          </div>
        </div>
      ) : null}
    </Link>
  );
}
