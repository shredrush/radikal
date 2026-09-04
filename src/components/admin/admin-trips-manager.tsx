import Link from "next/link";
import { Compass, Trash2 } from "lucide-react";
import type { TripType } from "@/generated/prisma/client";

import { loadDb, prisma } from "@/lib/prisma";
import { fetchDeletedTripsWithDetails, fetchTripsWithDetails } from "@/lib/trips";
import { Button } from "@/components/ui/button";
import { AddTripForm } from "@/components/admin/add-trip-form";
import { AdminDraftsManager, type AdminDraftData } from "@/components/admin/admin-drafts-manager";
import { AdminTripCard } from "@/components/admin/admin-trip-card";
import { RestoreTripButton } from "@/components/admin/restore-trip-button";
import { formatDateTime } from "@/lib/format";
import { formatPrice } from "@/lib/currency";

const PAGE_SIZE = 20;

export async function AdminTripsManager({
  guides,
  drafts,
  selectedGuideId,
  type,
  page,
}: {
  guides: Array<{ id: string; name: string; photo: string | null; photos: string[]; videos: string[] }>;
  drafts: AdminDraftData[];
  selectedGuideId: string | null;
  type?: string;
  page: number;
}) {
  const where = {
    ...(selectedGuideId ? { guideId: selectedGuideId } : {}),
    ...(type ? { type: type as TripType } : {}),
  };

  const [trips, totalTrips, deletedTrips] = await Promise.all([
    loadDb("admin.trips-manager.trips", () => fetchTripsWithDetails(where, { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE })),
    loadDb("admin.trips-manager.trips-count", () => prisma.trip.count({ where: { deletedAt: null, ...where } })),
    loadDb("admin.trips-manager.deleted-trips", () => fetchDeletedTripsWithDetails(where, { take: 50 })),
  ]);
  const deletedByIds = [
    ...new Set(
      deletedTrips
        .map((trip) => trip.deletedById)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const deletedByUsers = deletedByIds.length
    ? await loadDb(
        "admin.trips-manager.deleted-by-users",
        () =>
          prisma.user.findMany({
            where: { id: { in: deletedByIds } },
            select: { id: true, name: true, email: true },
          }),
      )
    : [];
  const deletedByNameById = new Map(
    deletedByUsers.map((user) => [user.id, user.name || user.email] as const),
  );

  const totalPages = Math.max(1, Math.ceil(totalTrips / PAGE_SIZE));

  const paginationHref = (targetPage: number) =>
    `/admin/trips?${new URLSearchParams({
      ...(selectedGuideId ? { guide: selectedGuideId } : {}),
      ...(type ? { type } : {}),
      page: String(targetPage),
    }).toString()}`;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h3 className="font-heading text-lg font-semibold tracking-wide text-foreground">
              All trips
            </h3>
            <p className="text-sm text-muted-foreground">
              Add a new trip or edit an existing one. Changes go live immediately.
            </p>
          </div>
          <AdminDraftsManager drafts={drafts} />
          <AddTripForm guides={guides} />
        </div>

        {trips.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-[1.25rem] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
            <Compass className="h-8 w-8 text-muted-foreground/50" />
            <div>
              <p className="font-medium text-foreground">No trips found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedGuideId
                  ? "This guide has no trips. Pick another guide or clear the filter."
                  : type
                    ? "No trips match this sport type. Try another filter."
                    : "Add your first trip above — it goes live immediately."}
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {trips.map((trip) => (
              <AdminTripCard key={trip.id} trip={trip} guides={guides} />
            ))}
          </ul>
        )}
      </section>

      {totalPages > 1 ? (
        <nav className="flex items-center justify-center gap-4">
          {page > 1 ? (
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              nativeButton={false}
              render={<Link href={paginationHref(page - 1)} />}
            >
              Previous
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">Previous</span>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              nativeButton={false}
              render={<Link href={paginationHref(page + 1)} />}
            >
              Next
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">Next</span>
          )}
        </nav>
      ) : null}

      <section className="space-y-4">
        <div>
          <h3 className="flex items-center gap-2 font-heading text-lg font-semibold tracking-wide text-foreground">
            <Trash2 className="h-4 w-4 text-destructive" />
            Soft deleted trips
          </h3>
          <p className="text-sm text-muted-foreground">
            Deleted trips stay hidden from customers and guides, with related slots, bookings, and wishlists preserved here for staff. Reviews stay attached to the guide.
          </p>
        </div>

        {deletedTrips.length === 0 ? (
          <p className="rounded-[1.25rem] border border-dashed border-border/80 bg-muted/20 px-6 py-8 text-center text-sm text-muted-foreground">
            No soft deleted trips.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {deletedTrips.map((trip) => {
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
                        {trip.deletedById ? ` by ${deletedByNameById.get(trip.deletedById) ?? "Unknown user"}` : ""}
                        {trip.deletedAt ? ` on ${formatDateTime(trip.deletedAt)}` : " recently"}
                      </p>
                    </div>
                    <RestoreTripButton tripId={trip.id} tripTitle={trip.title} />
                  </div>

                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                    <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                      <p className="font-semibold text-foreground">Slots</p>
                      <p className="mt-1 text-muted-foreground">{deletedSlots.length} deleted</p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                      <p className="font-semibold text-foreground">Bookings</p>
                      <p className="mt-1 text-muted-foreground">{deletedBookings.length} deleted</p>
                      {deletedBookings.length > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {deletedBookings.reduce((sum, booking) => sum + booking.participantCount, 0)} travellers · {formatPrice(deletedBookings.reduce((sum, booking) => sum + booking.totalPriceRupees, 0))}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                      <p className="font-semibold text-foreground">Wishlists</p>
                      <p className="mt-1 text-muted-foreground">{deletedWishlistItems.length} deleted</p>
                    </div>
                  </div>

                  {deletedBookings.length > 0 ? (
                    <div className="mt-3 rounded-xl border border-border/70 bg-background/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Deleted booking users</p>
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
        )}
      </section>
    </div>
  );
}
