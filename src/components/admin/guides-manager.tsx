import type { Prisma } from "@/generated/prisma/client";
import { Users } from "lucide-react";

import { fetchGuidesWithDetails } from "@/lib/guides";
import { AddGuideForm } from "@/components/admin/add-guide-form";
import { GuideCard, type GuideCardData } from "@/components/admin/guide-card";

export async function GuidesManager({ where }: { where?: Prisma.GuideWhereInput }) {
  const guides = await fetchGuidesWithDetails(where);

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
    certifications: guide.certifications.map((cert) => ({
      title: cert.title,
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
          <div>
            <p className="font-medium text-foreground">No guides yet</p>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((guide) => (
            <GuideCard key={guide.id} guide={guide} />
          ))}
        </ul>
      )}
    </div>
  );
}
