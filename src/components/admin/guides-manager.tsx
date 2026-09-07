import type { Prisma } from "@/generated/prisma/client";
import { Trash2, Users } from "lucide-react";

import { fetchGuidesWithDetails } from "@/lib/guides";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { AddGuideForm } from "@/components/admin/add-guide-form";
import { GuideCard, type GuideCardData } from "@/components/admin/guide-card";
import { RestoreGuideButton } from "@/components/admin/restore-guide-button";

export async function GuidesManager({
  where,
}: {
  where?: Prisma.GuideWhereInput;
}) {
  const [guides, deletedGuides] = await Promise.all([
    fetchGuidesWithDetails(where),
    prisma.guide.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        location: true,
        deletedAt: true,
        deletedByGuideRemoval: true,
        user: { select: { email: true, username: true, deletedAt: true } },
        reviews: { where: { deletedWithGuide: true }, select: { id: true } },
        tripDrafts: { where: { deletedWithGuide: true }, select: { id: true } },
        trips: {
          where: { deletedWithGuide: true },
          select: {
            id: true,
            slots: { where: { deletedWithTrip: true }, select: { id: true } },
            bookings: {
              where: { deletedWithTrip: true },
              select: { id: true },
            },
            wishlistItems: {
              where: { deletedWithTrip: true },
              select: { id: true },
            },
          },
        },
      },
    }),
  ]);

  const items: GuideCardData[] = guides.map((guide) => ({
    id: guide.id,
    userId: guide.user?.id ?? null,
    name: guide.name,
    username: guide.user?.username ?? null,
    bio: guide.bio,
    photo: guide.photo,
    photos: guide.photos,
    videos: guide.videos,
    mediaOrder: guide.mediaOrder,
    location: guide.location,
    experienceYears: guide.experienceYears,
    languages: guide.languages,
    sports: guide.sports,
    certifications: guide.certifications.map((cert) => ({ title: cert.title })),
    reviews: guide.reviews.map((review) => ({
      id: review.id,
      authorName: review.user.name,
      rating: review.rating,
      comment: review.comment,
      tripName: review.tripName,
      tripDate: review.tripDate,
      createdAt: review.createdAt,
    })),
    tripsCount: guide._count.trips,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <AddGuideForm />
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[1.25rem] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
          <Users className="h-8 w-8 text-muted-foreground/50" />
          <p className="font-medium text-foreground">No guides yet</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((guide) => (
            <GuideCard key={guide.id} guide={guide} />
          ))}
        </ul>
      )}

      <section className="space-y-4 border-t border-border/70 pt-6">
        <div>
          <h3 className="flex items-center gap-2 font-heading text-lg font-semibold tracking-wide text-foreground">
            <Trash2 className="h-4 w-4 text-destructive" />
            Soft deleted guides
          </h3>
          <p className="text-sm text-muted-foreground">
            Restoring a guide restores only records retired with that guide.
            Removed profile media must be uploaded again.
          </p>
        </div>
        {deletedGuides.length === 0 ? (
          <p className="rounded-[1.25rem] border border-dashed border-border/80 bg-muted/20 px-6 py-8 text-center text-sm text-muted-foreground">
            No soft deleted guides.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {deletedGuides.map((guide) => {
              const slots = guide.trips.reduce(
                (sum, trip) => sum + trip.slots.length,
                0,
              );
              const bookings = guide.trips.reduce(
                (sum, trip) => sum + trip.bookings.length,
                0,
              );
              const wishlists = guide.trips.reduce(
                (sum, trip) => sum + trip.wishlistItems.length,
                0,
              );
              const canRestore =
                guide.deletedByGuideRemoval && !guide.user.deletedAt;

              return (
                <li
                  key={guide.id}
                  className="rounded-[1.25rem] border border-border/70 bg-background/95 p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">
                        {guide.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {guide.location} · /
                        {guide.user.username ?? "no username"} ·{" "}
                        {guide.user.email} · Deleted{" "}
                        {guide.deletedAt
                          ? `on ${formatDateTime(guide.deletedAt)}`
                          : "recently"}
                      </p>
                    </div>
                    {canRestore ? (
                      <RestoreGuideButton
                        guideId={guide.id}
                        guideName={guide.name}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {guide.user.deletedAt
                          ? "Restore the linked account first."
                          : "Legacy or role/account removal: not safely restorable."}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <p className="rounded-xl border border-border/70 bg-background/70 p-3">
                      <span className="font-semibold text-foreground">
                        Trips
                      </span>
                      <br />
                      <span className="text-muted-foreground">
                        {guide.trips.length} retired
                      </span>
                    </p>
                    <p className="rounded-xl border border-border/70 bg-background/70 p-3">
                      <span className="font-semibold text-foreground">
                        Slots / bookings
                      </span>
                      <br />
                      <span className="text-muted-foreground">
                        {slots} / {bookings} retired
                      </span>
                    </p>
                    <p className="rounded-xl border border-border/70 bg-background/70 p-3">
                      <span className="font-semibold text-foreground">
                        Wishlists
                      </span>
                      <br />
                      <span className="text-muted-foreground">
                        {wishlists} retired
                      </span>
                    </p>
                    <p className="rounded-xl border border-border/70 bg-background/70 p-3">
                      <span className="font-semibold text-foreground">
                        Reviews / drafts
                      </span>
                      <br />
                      <span className="text-muted-foreground">
                        {guide.reviews.length} / {guide.tripDrafts.length}{" "}
                        retired
                      </span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
