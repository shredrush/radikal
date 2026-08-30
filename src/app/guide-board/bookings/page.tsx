import { requireGuide } from "@/lib/guide-board";
import { fetchBookingsWithDetails } from "@/lib/bookings";
import { safeDb } from "@/lib/prisma";
import { GuideBoardHeader } from "@/components/guides/guide-board-header";
import { BookingsBoard } from "@/components/bookings/bookings-board";
import { GuideActivityLog } from "@/components/guides/guide-activity-log";

export const dynamic = "force-dynamic";

export default async function GuideBoardBookingsPage() {
  const { guide } = await requireGuide();

  const items = await safeDb(
    "guide-board.bookings",
    () => fetchBookingsWithDetails({ trip: { guideId: guide.id } }),
    [],
  );

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-8xl flex-col gap-8 px-6 py-10 sm:py-14 lg:px-10">
        <GuideBoardHeader
          title="My Bookings"
          description="Trips travellers have reserved with you as their guide."
          active="bookings"
          guideId={guide.id}
        />

        <section className="rounded-[1.5rem] border border-border/80 bg-background/95 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
          <BookingsBoard items={items} slotCancel hideDeletedSection />
        </section>

        <GuideActivityLog />
      </div>
    </div>
  );
}
