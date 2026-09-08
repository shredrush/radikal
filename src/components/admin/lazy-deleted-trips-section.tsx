"use client";

import { useState } from "react";
import { ChevronDown, Loader2, Trash2 } from "lucide-react";

import { RestoreTripButton } from "@/components/admin/restore-trip-button";
import { formatPrice } from "@/lib/currency";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type DeletedTrip = {
  id: string;
  title: string;
  location: string;
  deletedAt: string | null;
  deletedById: string | null;
  guide: { name: string } | null;
  slots: Array<{ deletedAt: string | null }>;
  bookings: Array<{
    deletedAt: string | null;
    participantCount: number;
    totalPriceRupees: number;
    user: { name: string | null; email: string };
  }>;
  wishlistItems: Array<{ deletedAt: string | null }>;
};

export function LazyDeletedTripsSection({
  guideId,
  type,
}: {
  guideId: string | null;
  type?: string;
}) {
  const [open, setOpen] = useState(false);
  const [trips, setTrips] = useState<DeletedTrip[] | null>(null);
  const [deletedByNameById, setDeletedByNameById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);
    if (trips !== null || loading) return;

    setError(false);
    setLoading(true);
    try {
      const url = new URL("/api/admin/trips/deleted", window.location.origin);
      if (guideId) url.searchParams.set("guide", guideId);
      if (type) url.searchParams.set("type", type);
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("Request failed");

      const data = (await response.json()) as {
        trips?: DeletedTrip[];
        deletedByNameById?: Record<string, string>;
      };
      setTrips(Array.isArray(data.trips) ? data.trips : []);
      setDeletedByNameById(data.deletedByNameById ?? {});
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-muted/10">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/30"
      >
        <span>
          <span className="flex items-center gap-2 font-heading text-lg font-semibold tracking-wide text-foreground">
            <Trash2 className="h-4 w-4 text-destructive" />
            Soft deleted trips
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">
            Deleted trips stay hidden from customers and guides, with related slots, bookings, and
            wishlists preserved here for staff.
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="border-t border-border/70 p-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading deleted trips...
            </div>
          ) : error ? (
            <p className="rounded-[1.25rem] border border-dashed border-border/80 bg-muted/20 px-6 py-8 text-center text-sm text-muted-foreground">
              Couldn&apos;t load deleted trips. Close and reopen this section to try again.
            </p>
          ) : trips?.length === 0 ? (
            <p className="rounded-[1.25rem] border border-dashed border-border/80 bg-muted/20 px-6 py-8 text-center text-sm text-muted-foreground">
              No soft deleted trips.
            </p>
          ) : trips ? (
            <ul className="flex flex-col gap-4">
              {trips.map((trip) => {
                const deletedSlots = trip.slots.filter((slot) => slot.deletedAt);
                const deletedBookings = trip.bookings.filter((booking) => booking.deletedAt);
                const deletedWishlistItems = trip.wishlistItems.filter((item) => item.deletedAt);

                return (
                  <li key={trip.id} className="rounded-[1.25rem] border border-border/70 bg-background/95 p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{trip.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {trip.location} · {trip.guide?.name ?? "No guide linked"} · Deleted
                          {trip.deletedById ? ` by ${deletedByNameById[trip.deletedById] ?? "Unknown user"}` : ""}
                          {trip.deletedAt ? ` on ${formatDateTime(trip.deletedAt)}` : " recently"}
                        </p>
                      </div>
                      <RestoreTripButton tripId={trip.id} tripTitle={trip.title} />
                    </div>
                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                      <CountCard label="Slots" value={`${deletedSlots.length} deleted`} />
                      <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                        <p className="font-semibold text-foreground">Bookings</p>
                        <p className="mt-1 text-muted-foreground">{deletedBookings.length} deleted</p>
                        {deletedBookings.length > 0 ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {deletedBookings.reduce((sum, booking) => sum + booking.participantCount, 0)} travellers · {formatPrice(deletedBookings.reduce((sum, booking) => sum + booking.totalPriceRupees, 0))}
                          </p>
                        ) : null}
                      </div>
                      <CountCard label="Wishlists" value={`${deletedWishlistItems.length} deleted`} />
                    </div>
                    {deletedBookings.length > 0 ? (
                      <div className="mt-3 rounded-xl border border-border/70 bg-background/70 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Deleted booking users
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {deletedBookings.slice(0, 6).map((booking) => booking.user.name || booking.user.email).join(", ")}
                          {deletedBookings.length > 6 ? `, +${deletedBookings.length - 6} more` : ""}
                        </p>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function CountCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/70 p-3">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-muted-foreground">{value}</p>
    </div>
  );
}
