"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, CheckCircle2, ChevronDown, Loader2, Ticket } from "lucide-react";

import { BookingCard, type BookingCardData } from "@/components/profile/booking-card";
import { cn } from "@/lib/utils";

type SectionKind = "upcoming" | "completed" | "cancelled" | "all";

const emptyIcons = {
  upcoming: Ticket,
  completed: CheckCircle2,
  cancelled: Ban,
  all: Ticket,
} as const;

/**
 * A collapsible bookings section that defers its data fetch until the user
 * expands it. Staff profiles render their booking lists through this so the
 * page (and its server round-trips) stay light on first load.
 */
export function LazyBookingsSection({
  title,
  description,
  endpoint,
  kind,
  emptyTitle,
  emptyDescription,
  defaultOpen = false,
}: {
  title: string;
  description?: string;
  endpoint: string;
  kind: SectionKind;
  emptyTitle: string;
  emptyDescription?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [bookings, setBookings] = useState<BookingCardData[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (cursor?: string) => {
    setLoading(true);
    setError(false);
    try {
      const url = new URL(endpoint, window.location.origin);
      if (cursor) url.searchParams.set("cursor", cursor);
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("Request failed");
      const data = (await response.json()) as {
        bookings?: BookingCardData[];
        nextCursor?: string | null;
      };
      const nextBookings = Array.isArray(data.bookings) ? data.bookings : [];
      setBookings((current) => (cursor && current ? [...current, ...nextBookings] : nextBookings));
      setNextCursor(data.nextCursor ?? null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (defaultOpen && bookings === null && !loading) {
      void load();
    }
  }, [defaultOpen, bookings, loading, load]);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);
    if (bookings === null && !loading) {
      void load();
    }
  }

  const EmptyIcon = emptyIcons[kind];

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-6 py-5 text-left transition-colors hover:bg-muted/40 sm:px-8"
      >
        <span className="flex flex-col gap-1.5">
          <span className="font-heading text-lg font-semibold uppercase tracking-wider text-foreground">
            {title}
          </span>
          {description ? (
            <span className="text-sm leading-relaxed text-muted-foreground">{description}</span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="px-6 pb-6 sm:px-8">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : error ? (
            <div className="rounded-[1.2rem] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
              Couldn&apos;t load {title.toLowerCase()}. Please try again.
            </div>
          ) : bookings && bookings.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-[1.2rem] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
              <EmptyIcon className="h-8 w-8 text-muted-foreground/50" />
              <div>
                <p className="font-medium text-foreground">{emptyTitle}</p>
                {emptyDescription ? (
                  <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
                ) : null}
              </div>
            </div>
          ) : bookings ? (
            <>
              <ul className="flex flex-col gap-3">
                {bookings.map((booking) => (
                  <li key={booking.id}>
                    <BookingCard booking={booking} />
                  </li>
                ))}
              </ul>
              {nextCursor ? (
                <button
                  type="button"
                  onClick={() => void load(nextCursor)}
                  className="mt-4 w-full rounded-full border border-border/80 px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                >
                  Load more
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
