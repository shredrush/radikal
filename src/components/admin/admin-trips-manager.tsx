import Link from "next/link";
import { Compass } from "lucide-react";
import type { TripType } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { fetchTripsWithDetails } from "@/lib/trips";
import { Button } from "@/components/ui/button";
import { AddTripForm } from "@/components/admin/add-trip-form";
import { AdminDraftsManager, type AdminDraftData } from "@/components/admin/admin-drafts-manager";
import { AdminTripCard } from "@/components/admin/admin-trip-card";

const PAGE_SIZE = 10;

export async function AdminTripsManager({
  guides,
  drafts,
  selectedGuideId,
  type,
  page,
}: {
  guides: Array<{ id: string; name: string }>;
  drafts: AdminDraftData[];
  selectedGuideId: string | null;
  type?: string;
  page: number;
}) {
  const where = {
    ...(selectedGuideId ? { guideId: selectedGuideId } : {}),
    ...(type ? { type: type as TripType } : {}),
  };

  const [trips, totalTrips] = await Promise.all([
    fetchTripsWithDetails(where, { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.trip.count({ where }),
  ]);

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
    </div>
  );
}
