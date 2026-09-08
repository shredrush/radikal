import type { Prisma } from "@/generated/prisma/client";
import { Users } from "lucide-react";

import { hasPermission, type Role } from "@/lib/authz";
import { fetchGuidesWithDetails } from "@/lib/guides";
import { prisma, safeDb } from "@/lib/prisma";
import { AddGuideForm } from "@/components/admin/add-guide-form";
import { GuideCard, type GuideCardData } from "@/components/admin/guide-card";
import { GuideApplicationsPanel } from "@/components/admin/guide-applications-panel";
import { LazyDeletedGuidesSection } from "@/components/admin/lazy-deleted-guides-section";

export async function GuidesManager({
  where,
  role,
}: {
  where?: Prisma.GuideWhereInput;
  role?: Role;
}) {
  const canManageApplications = hasPermission(role, "guideApplications.manage");
  const [guides, pendingApplicationCount] = await Promise.all([
    fetchGuidesWithDetails(where),
    canManageApplications
      ? safeDb(
          "admin.guides.pending-applications-count",
          () => prisma.guideApplication.count({ where: { status: "PENDING" } }),
          0,
        )
      : Promise.resolve(0),
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
        {canManageApplications ? (
          <GuideApplicationsPanel pendingCount={pendingApplicationCount} />
        ) : null}
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

      <LazyDeletedGuidesSection />
    </div>
  );
}
