"use client";

import { useState } from "react";
import { ChevronDown, Loader2, Trash2 } from "lucide-react";

import { RestoreGuideButton } from "@/components/admin/restore-guide-button";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type DeletedGuide = {
  id: string;
  name: string;
  location: string;
  deletedAt: string | null;
  deletedByGuideRemoval: boolean;
  user: { email: string; username: string | null; deletedAt: string | null };
  reviews: Array<{ id: string }>;
  tripDrafts: Array<{ id: string }>;
  trips: Array<{
    id: string;
    slots: Array<{ id: string }>;
    bookings: Array<{ id: string }>;
    wishlistItems: Array<{ id: string }>;
  }>;
};

export function LazyDeletedGuidesSection() {
  const [open, setOpen] = useState(false);
  const [guides, setGuides] = useState<DeletedGuide[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);
    if (guides !== null || loading) return;

    setError(false);
    setLoading(true);
    try {
      const response = await fetch("/api/admin/guides/deleted", { cache: "no-store" });
      if (!response.ok) throw new Error("Request failed");

      const data = (await response.json()) as { guides?: DeletedGuide[] };
      setGuides(Array.isArray(data.guides) ? data.guides : []);
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
            Soft deleted guides
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">
            Restoring a guide restores only records retired with that guide. Removed profile media must
            be uploaded again.
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
              <Loader2 className="h-4 w-4 animate-spin" /> Loading deleted guides...
            </div>
          ) : error ? (
            <p className="rounded-[1.25rem] border border-dashed border-border/80 bg-muted/20 px-6 py-8 text-center text-sm text-muted-foreground">
              Couldn&apos;t load deleted guides. Close and reopen this section to try again.
            </p>
          ) : guides?.length === 0 ? (
            <p className="rounded-[1.25rem] border border-dashed border-border/80 bg-muted/20 px-6 py-8 text-center text-sm text-muted-foreground">
              No soft deleted guides.
            </p>
          ) : guides ? (
            <ul className="flex flex-col gap-4">
              {guides.map((guide) => {
                const slots = guide.trips.reduce((sum, trip) => sum + trip.slots.length, 0);
                const bookings = guide.trips.reduce(
                  (sum, trip) => sum + trip.bookings.length,
                  0,
                );
                const wishlists = guide.trips.reduce(
                  (sum, trip) => sum + trip.wishlistItems.length,
                  0,
                );
                const canRestore = guide.deletedByGuideRemoval && !guide.user.deletedAt;

                return (
                  <li key={guide.id} className="rounded-[1.25rem] border border-border/70 bg-background/95 p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{guide.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {guide.location} · /{guide.user.username ?? "no username"} · {guide.user.email} · Deleted {guide.deletedAt ? `on ${formatDateTime(guide.deletedAt)}` : "recently"}
                        </p>
                      </div>
                      {canRestore ? (
                        <RestoreGuideButton guideId={guide.id} guideName={guide.name} />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {guide.user.deletedAt
                            ? "Restore the linked account first."
                            : "Legacy or role/account removal: not safely restorable."}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <DetailCount label="Trips" value={`${guide.trips.length} retired`} />
                      <DetailCount label="Slots / bookings" value={`${slots} / ${bookings} retired`} />
                      <DetailCount label="Wishlists" value={`${wishlists} retired`} />
                      <DetailCount label="Reviews / drafts" value={`${guide.reviews.length} / ${guide.tripDrafts.length} retired`} />
                    </div>
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

function DetailCount({ label, value }: { label: string; value: string }) {
  return (
    <p className="rounded-xl border border-border/70 bg-background/70 p-3">
      <span className="font-semibold text-foreground">{label}</span>
      <br />
      <span className="text-muted-foreground">{value}</span>
    </p>
  );
}
