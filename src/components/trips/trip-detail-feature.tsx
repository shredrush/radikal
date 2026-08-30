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
import { TRIP_CATEGORY_LABELS } from "@/lib/trip-metadata";
import { cn } from "@/lib/utils";
import type { TripCategory, TripType } from "@/generated/prisma/client";

export type TripDetailFeatureTrip = {
  id: string;
  slug: string;
  title: string;
  type: TripType;
  description: string;
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
        "overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]",
        travelStyleTags.length > 0 && "gap-4 pt-3"
      )}
    >
      {travelStyleTags.length > 0 ? (
        <div className="flex flex-wrap gap-2 px-5 sm:px-6">
          {travelStyleTags.map((category) => (
            <Badge
              key={category}
              variant="secondary"
              className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[0.62rem] font-medium leading-3 text-foreground/80 sm:text-[0.72rem]"
            >
              {TRIP_CATEGORY_LABELS[category] ?? category}
            </Badge>
          ))}
        </div>
      ) : (
        <CardHeader>
          <CardTitle className="text-2xl">Trip details</CardTitle>
          <CardDescription>Everything you need to know before you go.</CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
        <p className="text-foreground">{trip.description}</p>
        <div className="grid gap-3 grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-muted/50 p-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Pickup</p>
            <p className="mt-1 text-sm font-medium text-foreground">{trip.tripLocation?.pickup ?? trip.location}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/50 p-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Drop</p>
            <p className="mt-1 text-sm font-medium text-foreground">{trip.tripLocation?.drop ?? trip.location}</p>
          </div>
        </div>
        <div className="grid gap-3 grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-muted/50 p-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Duration</p>
            <p className="mt-1 text-sm font-medium text-foreground">{formatDurationDays(trip.durationDays)}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/50 p-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Group size</p>
            <p className="mt-1 text-sm font-medium text-foreground">Up to {trip.maxGroupSize} travellers</p>
          </div>
        </div>
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
            <p className="mt-2">{trip.description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AvailableDatesCard({ trip }: { trip: TripDetailFeatureTrip }) {
  const now = new Date();
  const upcomingSlots = trip.slots.filter((slot) => !isSlotCompleted(slot.date, now));

  return (
    <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
      <CardHeader>
        <CardTitle className="text-xl">Available dates</CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingSlots.length > 0 ? (
          <ul className="space-y-2">
            {upcomingSlots.map((slot) => {
              const occupancy = getSlotOccupancyPercent(slot);
              return (
                <li key={slot.id}>
                  <Link
                    href={`/booking/${trip.id}/checkout?slot=${slot.id}`}
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
      </CardContent>
    </Card>
  );
}

export function CompletedDatesCard({ trip }: { trip: TripDetailFeatureTrip }) {
  const now = new Date();
  const completedSlots = trip.slots.filter((slot) => isSlotCompleted(slot.date, now));

  if (completedSlots.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
      <CardHeader>
        <CardTitle className="text-xl">Completed dates</CardTitle>
        <CardDescription>Past departures that have already set off.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {completedSlots.map((slot) => (
            <li
              key={slot.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-sm"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-medium text-muted-foreground line-through decoration-muted-foreground/40 decoration-2">
                  {formatTripDateRange(slot.date, trip.durationDays)}
                </span>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Completed
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function WhatsIncludedCard({ trip }: { trip: TripDetailFeatureTrip }) {
  return (
    <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
      <CardHeader>
        <CardTitle className="text-xl">What&apos;s included</CardTitle>
        <CardDescription>Covered in the price, and what to arrange yourself.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">Included</p>
            {trip.inclusions.filter((item) => item.included).map((item) => (
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
          <div className="border-t border-border/60 pt-4 space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-500 dark:text-rose-400">Not included</p>
            {trip.inclusions.filter((item) => !item.included).map((item) => (
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
        </div>
      </CardContent>
    </Card>
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
              <p className="line-clamp-6 text-base leading-8 text-muted-foreground">
                {trip.description}
              </p>
              <div className="flex flex-wrap items-start gap-2">
                {trip.categories.map((category) => (
                  <span key={category} className="rounded-full border border-border/80 bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                    {TRIP_CATEGORY_LABELS[category] ?? category}
                  </span>
                ))}
              </div>
            </div>
            <BookingBar
              tripId={trip.id}
              pricePerPerson={trip.priceInRupees}
              durationDays={trip.durationDays}
              maxGroupSize={trip.maxGroupSize}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <TripDetailsCard trip={trip} />
        <div className="flex flex-col gap-6">
          <AvailableDatesCard trip={trip} />
          <CompletedDatesCard trip={trip} />
          <WhatsIncludedCard trip={trip} />
        </div>
      </div>
    </div>
  );
}
