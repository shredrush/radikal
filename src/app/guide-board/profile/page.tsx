import { GuideBoardHeader } from "@/components/guides/guide-board-header";
import { GuideProfileEditor } from "@/components/guides/guide-profile-editor";
import { prisma } from "@/lib/prisma";
import { requireGuide } from "@/lib/guide-board";

export const dynamic = "force-dynamic";

export default async function GuideBoardProfilePage() {
  const { guide: sessionGuide } = await requireGuide();
  const guide = await prisma.guide.findUniqueOrThrow({
    where: { id: sessionGuide.id },
    select: {
      id: true,
      userId: true,
      name: true,
      bio: true,
      photo: true,
      photos: true,
      videos: true,
      mediaOrder: true,
      location: true,
      experienceYears: true,
      languages: true,
      certifications: {
        orderBy: { yearIssued: "desc" },
        select: { title: true },
      },
    },
  });

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 sm:py-14 lg:px-10">
        <GuideBoardHeader
          title="Edit public profile"
          description="Update the details travellers see on your public guide profile. Changes publish immediately after saving."
          active="profile"
          guideId={guide.id}
        />

        <section className="rounded-[1.5rem] border border-border/80 bg-background/95 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)] sm:p-8">
          <GuideProfileEditor guide={guide} />
        </section>
      </div>
    </div>
  );
}
