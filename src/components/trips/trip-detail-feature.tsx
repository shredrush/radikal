import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookingBar } from "@/components/trips/booking-bar";
import { TripGallery } from "@/components/trips/trip-gallery";
import { formatDurationDays, formatTripDateRange, isSlotCompleted } from "@/lib/trip-dates";
import { normalizeTripImagePath } from "@/lib/trip-card-image";
import { cn } from "@/lib/utils";
import type { TripCategory, TripType } from "@/generated/prisma/client";
import { CustomDateEnquiry } from "@/components/trips/custom-date-enquiry";
import { SafeMarkdown } from "@/components/trips/safe-markdown";

const sectionLabelClassName = "text-xs font-semibold uppercase tracking-[0.25em]";

export type TripDetailFeatureTrip = {
  id: string;
  slug: string;
  title: string;
  type: TripType;
  description: string;
  itinerary: string;
  location: string;
  categories: TripCategory[];
  durationDays: number;
  maxGroupSize: number;
  priceInRupees: number;
  images: string[];
  videos: string[];
  mediaOrder: string[];
  tripLocation: { pickup: string; drop: string } | null;
  inclusions: Array<{ id: string; item: string; included: boolean }>;
  highlights: Array<{ id: string; text: string }>;
  slots: Array<{ id: string; date: Date; capacity: number; booked: number; reserved: number }>;
};

function getSlotOccupancyPercent(slot: { capacity: number; booked: number; reserved: number }) {
  if (slot.capacity <= 0) {
    return 100;
  }

  return Math.min(100, Math.max(0, ((slot.booked + slot.reserved) / slot.capacity) * 100));
}

export function TripDetailsCard({
  trip,
  travelStyleTags = [],
}: {
  trip: TripDetailFeatureTrip;
  travelStyleTags?: string[];
}) {
  return (
    <Card
      className={cn(
        "h-full overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]",
        travelStyleTags.length > 0 && "gap-4 pt-5"
      )}
    >
      {travelStyleTags.length > 0 ? (
        <div className="flex flex-wrap gap-2 px-5 sm:px-6">
          {travelStyleTags.map((style) => (
            <Badge
              key={style}
              variant="secondary"
              className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[0.62rem] font-medium leading-3 text-foreground/80 sm:text-[0.72rem]"
            >
              {style}
            </Badge>
          ))}
        </div>
      ) : (
        <CardHeader>
          <CardTitle className="text-2xl">Trip details</CardTitle>
          <CardDescription>Everything you need to know before you go.</CardDescription>
        </CardHeader>
      )}
      <CardContent className="flex flex-1 flex-col space-y-4 text-sm leading-7 text-muted-foreground">
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          <div className="min-w-0 rounded-xl border border-border/70 bg-muted/50 p-2 sm:p-3">
            <p className="whitespace-nowrap text-[0.5rem] font-semibold uppercase leading-tight tracking-[0.05em] text-muted-foreground sm:text-[0.65rem] sm:tracking-[0.2em]">Pickup</p>
            <p className="mt-1 truncate text-xs font-medium text-foreground sm:text-sm">{trip.tripLocation?.pickup ?? trip.location}</p>
          </div>
          <div className="min-w-0 rounded-xl border border-border/70 bg-muted/50 p-2 sm:p-3">
            <p className="whitespace-nowrap text-[0.5rem] font-semibold uppercase leading-tight tracking-[0.05em] text-muted-foreground sm:text-[0.65rem] sm:tracking-[0.2em]">Drop</p>
            <p className="mt-1 truncate text-xs font-medium text-foreground sm:text-sm">{trip.tripLocation?.drop ?? trip.location}</p>
          </div>
          <div className="min-w-0 rounded-xl border border-border/70 bg-muted/50 p-2 sm:p-3">
            <p className="whitespace-nowrap text-[0.5rem] font-semibold uppercase leading-tight tracking-[0.05em] text-muted-foreground sm:text-[0.65rem] sm:tracking-[0.2em]">Duration</p>
            <p className="mt-1 truncate text-xs font-medium text-foreground sm:text-sm">{formatDurationDays(trip.durationDays)}</p>
          </div>
          <div className="min-w-0 rounded-xl border border-border/70 bg-muted/50 p-2 sm:p-3">
            <p className="whitespace-nowrap text-[0.5rem] font-semibold uppercase leading-tight tracking-[0.05em] text-muted-foreground sm:text-[0.65rem] sm:tracking-[0.2em]">Group size</p>
            <p className="mt-1 truncate text-xs font-medium text-foreground sm:text-sm">{trip.maxGroupSize}</p>
          </div>
        </div>
        <p className="whitespace-pre-wrap text-foreground">{trip.description}</p>
        {trip.itinerary ? (
          <>
            <ItineraryDisclosure itinerary={trip.itinerary} className="lg:hidden" />
            <ItineraryDisclosure itinerary={trip.itinerary} open className="hidden lg:block" />
          </>
        ) : null}
        <WhatsIncludedSection trip={trip} />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Why travellers love this trip</h2>
          {trip.highlights.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {trip.highlights.map((highlight) => (
                <li key={highlight.id} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-black" />
                  <span>{highlight.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 whitespace-pre-wrap">{trip.description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ItineraryDisclosure({
  itinerary,
  open = false,
  className,
}: {
  itinerary: string;
  open?: boolean;
  className?: string;
}) {
  return (
    <details open={open} className={cn("group", className)}>
      <summary className="flex w-full cursor-pointer list-none items-center justify-start gap-2 border-y border-border/50 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/20 [&::-webkit-details-marker]:hidden">
        <span className={cn(sectionLabelClassName, "text-black dark:text-white")}>Itinerary</span>
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 shrink-0 -translate-y-0.5 rotate-45 border-b-2 border-r-2 border-current text-black transition-transform duration-200 group-open:translate-y-0.5 group-open:rotate-[225deg] dark:text-white"
        />
      </summary>
      <div className="pt-3">
        <SafeMarkdown className="text-foreground">{itinerary}</SafeMarkdown>
      </div>
    </details>
  );
}

export function AvailableDatesCard({ trip }: { trip: TripDetailFeatureTrip }) {
  const now = new Date();
  const upcomingSlots = trip.slots.filter((slot) => !isSlotCompleted(slot.date, now));
  const completedSlots = trip.slots.filter((slot) => isSlotCompleted(slot.date, now));

  return (
    <Card className="overflow-hidden rounded-[1.5rem] border-border/80 pb-0 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
      <CardHeader>
        <CardTitle className="text-xl">Available dates</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="px-(--card-spacing)">
          {upcomingSlots.length > 0 ? (
            <ul className="max-h-[11.5rem] space-y-2 overflow-y-auto pr-1">
              {upcomingSlots.map((slot) => {
                const occupancy = getSlotOccupancyPercent(slot);
                return (
                  <li key={slot.id}>
                    <Link
                      href={`/booking/${trip.id}/checkout?slot=${slot.id}`}
                      prefetch={false}
                      className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-emerald-600/40 bg-background/70 px-3 py-2 text-sm transition-colors hover:border-emerald-600 hover:bg-emerald-600/10 focus-visible:border-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/20 active:border-emerald-700 active:bg-emerald-600/20"
                    >
                      <span
                        className="absolute inset-y-0 left-0 bg-emerald-100/90 dark:bg-emerald-900/90 transition-[width] duration-300"
                        style={{ width: `${occupancy}%` }}
                        aria-hidden="true"
                      />
                      <span className="relative z-10 font-medium transition-colors">
                        {formatTripDateRange(slot.date, trip.durationDays)}
                      </span>
                      <span className="relative z-10 opacity-90 transition-colors">
                        {occupancy >= 100 ? "Sold out" : `${Math.max(slot.capacity - slot.booked - slot.reserved, 0)} spots left`}
                      </span>
                      {occupancy >= 100 ? (
                        <span className="absolute inset-x-0 top-1/2 z-20 h-px bg-emerald-800/70" aria-hidden="true" />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming dates are available yet.</p>
          )}
          <CustomDateEnquiry tripId={trip.id} />
        </div>
        {completedSlots.length > 0 ? (
          <details className="group border-t border-border/60">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-muted/30 px-(--card-spacing) py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/20 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-1.5">
                Competed ({completedSlots.length})
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              </span>
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 -translate-y-0.5 rotate-45 border-b-2 border-r-2 border-current transition-transform duration-200 group-open:translate-y-0.5 group-open:rotate-[225deg]"
              />
            </summary>
            <ul className="space-y-2 border-t border-border/60 px-(--card-spacing) py-2.5">
              {completedSlots.map((slot) => (
                <li
                  key={slot.id}
                  className="flex items-center rounded-xl border border-emerald-700 bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm dark:border-emerald-700 dark:bg-emerald-900"
                >
                  <span className="flex items-center gap-1.5">
                    {formatTripDateRange(slot.date, trip.durationDays)}
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-100" aria-label="Completed" />
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function WhatsIncludedSection({ trip }: { trip: TripDetailFeatureTrip }) {
  const includedItems = trip.inclusions.filter((item) => item.included);
  const excludedItems = trip.inclusions.filter((item) => !item.included);

  if (includedItems.length === 0 && excludedItems.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4" aria-labelledby="whats-included-heading">
      <div className="grid gap-4 sm:grid-cols-2">
        {includedItems.length > 0 ? (
          <div className="space-y-2.5">
            <p className={cn(sectionLabelClassName, "text-emerald-600 dark:text-emerald-400")}>Included</p>
            {includedItems.map((item) => (
              <div key={item.id} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                  </svg>
                </span>
                <span className="text-sm leading-6 text-foreground">{item.item}</span>
              </div>
            ))}
          </div>
        ) : null}
        {excludedItems.length > 0 ? (
          <div className="space-y-2.5">
            <p className={cn(sectionLabelClassName, "text-rose-500 dark:text-rose-400")}>Not included</p>
            {excludedItems.map((item) => (
              <div key={item.id} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-500 dark:bg-rose-950/50 dark:text-rose-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                    <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                  </svg>
                </span>
                <span className="text-sm leading-6 text-muted-foreground">{item.item}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function TripDetailFeature({
  trip,
  action,
}: {
  trip: TripDetailFeatureTrip;
  action?: ReactNode;
}) {
  const normalizedTripImages = trip.images
    .map((image) => normalizeTripImagePath(image, trip.slug))
    .filter(Boolean);
  const normalizedMediaOrder = trip.mediaOrder
    .map((item) => (trip.images.includes(item) ? normalizeTripImagePath(item, trip.slug) : item))
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
        <div className="grid items-stretch gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="relative overflow-hidden bg-muted/60">
            <TripGallery
              images={normalizedTripImages}
              videos={trip.videos}
              mediaOrder={normalizedMediaOrder}
              fallbackImage={`/activities/${trip.slug}/cover.png`}
              alt={trip.title}
              compact
            />
          </div>
          <div className="flex flex-col justify-between gap-6 px-8 py-8 sm:px-10 sm:py-10 lg:px-0 lg:pt-4 lg:pb-8 lg:pr-10">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <h1 className="font-heading text-3xl font-semibold tracking-wide sm:text-4xl">
                  {trip.title}
                </h1>
                {action}
              </div>
              <p className="line-clamp-6 whitespace-pre-wrap text-base leading-8 text-muted-foreground">
                {trip.description}
              </p>
            </div>
            <BookingBar
              tripId={trip.id}
              pricePerPerson={trip.priceInRupees}
              durationDays={trip.durationDays}
              maxGroupSize={trip.maxGroupSize}
              hasUpcomingSlots={trip.slots.some((slot) => !isSlotCompleted(slot.date, new Date()))}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <TripDetailsCard trip={trip} />
          <div className="flex flex-col gap-6">
            <AvailableDatesCard trip={trip} />
          </div>
      </div>
    </div>
  );
}
