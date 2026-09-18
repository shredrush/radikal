"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Price } from "@/components/currency/price";
import { formatDurationDays } from "@/lib/trip-dates";

export function BookingBar({
  tripId,
  pricePerPerson,
  durationDays,
  maxGroupSize,
  hasUpcomingSlots,
}: {
  tripId: string;
  pricePerPerson: number;
  durationDays: number;
  maxGroupSize: number;
  hasUpcomingSlots: boolean;
}) {
  const [people, setPeople] = useState(1);

  const total = pricePerPerson * people;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-x-2 gap-y-2 rounded-[1.5rem] border border-border/70 p-5 shadow-[0_20px_60px_-35px_rgba(249,115,22,0.25)] sm:gap-x-4">
      <p className="font-heading text-2xl font-semibold text-foreground">
        <Price amount={total} />
      </p>
      <div className="flex w-fit items-center gap-1 rounded-full border border-border/70 bg-background/70 px-1 py-0.5 sm:gap-2 sm:px-2 sm:py-1">
        <button
          type="button"
          aria-label="Remove person"
          disabled={people <= 1}
          onClick={() => setPeople((count) => Math.max(1, count - 1))}
          className="flex h-5 w-5 items-center justify-center rounded-full border border-border/70 text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 sm:h-7 sm:w-7"
        >
          <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        </button>
        <span className="min-w-4 text-center text-xs font-semibold text-foreground sm:min-w-5 sm:text-sm">{people}</span>
        <button
          type="button"
          aria-label="Add person"
          disabled={people >= maxGroupSize}
          onClick={() => setPeople((count) => Math.min(maxGroupSize, count + 1))}
          className="flex h-5 w-5 items-center justify-center rounded-full border border-border/70 text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 sm:h-7 sm:w-7"
        >
          <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        </button>
      </div>
      <Button
        size="xs"
        className="shrink-0 rounded-full bg-orange-700 text-white hover:bg-orange-800 sm:h-9 sm:px-4"
        nativeButton={false}
        render={
          <Link
            href={hasUpcomingSlots ? `/booking/${tripId}/checkout?participants=${people}` : "#custom-date-enquiry"}
            prefetch={false}
            onClick={hasUpcomingSlots ? undefined : () => window.dispatchEvent(new Event("open-custom-date-enquiry"))}
          />
        }
      >
        Book Your Spot
      </Button>
      <p className="text-sm text-muted-foreground">{formatDurationDays(durationDays)}</p>
      <Link
        href="/custom-trip"
        className="col-span-2 justify-self-end text-xs font-medium text-blue-600 underline underline-offset-2 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      >
        Private trip with your crew? Click here
      </Link>
    </div>
  );
}
