"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Price } from "@/components/currency/price";

export function BookingBar({
  tripId,
  pricePerPerson,
  durationDays,
  maxGroupSize,
}: {
  tripId: string;
  pricePerPerson: number;
  durationDays: number;
  maxGroupSize: number;
}) {
  const [people, setPeople] = useState(1);

  const total = pricePerPerson * people;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-border/70 p-5 shadow-[0_20px_60px_-35px_rgba(249,115,22,0.25)]">
      <div>
        <p className="font-heading text-2xl font-semibold text-foreground">
          <Price amount={total} />
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {durationDays} {durationDays === 1 ? "day" : "days"}
        </p>
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-2 py-1">
            <button
              type="button"
              aria-label="Remove person"
              disabled={people <= 1}
              onClick={() => setPeople((count) => Math.max(1, count - 1))}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border/70 text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-5 text-center text-sm font-semibold text-foreground">{people}</span>
            <button
              type="button"
              aria-label="Add person"
              disabled={people >= maxGroupSize}
              onClick={() => setPeople((count) => Math.min(maxGroupSize, count + 1))}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border/70 text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button
            size="sm"
            className="shrink-0 rounded-full bg-orange-700 text-white hover:bg-orange-800"
            nativeButton={false}
            render={
              <Link
                href={`/booking/${tripId}/checkout?participants=${people}`}
              />
            }
          >
            Book Your Spot
          </Button>
        </div>
        <Link
          href="/custom-trip"
          className="text-xs font-medium text-blue-600 underline underline-offset-2 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Private trip with your crew? Click here
        </Link>
      </div>
    </div>
  );
}
