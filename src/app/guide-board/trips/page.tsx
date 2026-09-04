import { requireGuide } from "@/lib/guide-board";
import { GuideBoardHeader } from "@/components/guides/guide-board-header";
import { GuideTripsManager } from "@/components/guides/guide-trips-manager";

export const dynamic = "force-dynamic";

export default async function GuideBoardTripsPage() {
  const { guide } = await requireGuide();

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-8xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
        <GuideBoardHeader
          title="My Trips"
          description="Add or edit the trips you lead. Changes go live after our team reviews them."
          active="trips"
          guideId={guide.id}
        />

        <section className="rounded-[1.5rem] border border-border/80 bg-background/95 p-4 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)] sm:p-6">
          <GuideTripsManager guideId={guide.id} />
        </section>
      </div>
    </div>
  );
}
