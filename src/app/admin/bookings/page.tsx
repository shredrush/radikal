import Link from "next/link";

import { hasPermission, requirePermission } from "@/lib/authz";
import { fetchBookingsWithDetails } from "@/lib/bookings";
import { prisma, safeDb } from "@/lib/prisma";
import { BookingsBoard } from "@/components/bookings/bookings-board";
import { BookingsStats } from "@/components/bookings/bookings-stats";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminGuideFilter } from "@/components/admin/admin-guide-filter";
import { Button } from "@/components/ui/button";
import { ACTIVITY_TYPE_OPTIONS } from "@/lib/trip-metadata";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string | string[] | undefined;
    guide?: string | string[] | undefined;
  }>;
}) {
  const session = await requirePermission(
    "bookings.read",
    "/login?callbackUrl=/admin/bookings",
  );

  const canConfirm = hasPermission(session.user.role, "bookings.confirm");
  const canCancel = hasPermission(session.user.role, "bookings.cancel");
  const { type, guide } = await searchParams;
  const selectedType =
    ACTIVITY_TYPE_OPTIONS.find(
      (option) => typeof type === "string" && option.value === type,
    )?.value ?? "";
  const selectedGuideId = typeof guide === "string" ? guide : "";

  const guides = await safeDb(
    "admin.bookings.guide-filter",
    () =>
      prisma.guide.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    [],
  );
  const activeGuideId = guides.some((item) => item.id === selectedGuideId)
    ? selectedGuideId
    : "";
  const items = await safeDb(
    "admin.bookings.items",
    () =>
      fetchBookingsWithDetails(
        {
          trip: {
            ...(activeGuideId ? { guideId: activeGuideId } : {}),
            ...(selectedType ? { type: selectedType } : {}),
          },
        },
        { completePast: true, includeBookingIds: true, includePaymentDetails: true },
      ),
    [],
  );

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-8xl flex-col gap-8 px-6 py-10 sm:py-14 lg:px-10">
        <AdminPageHeader
          title="Manage Bookings"
          description="A live view of every booking on the platform"
          active="bookings"
          role={session.user.role}
        />

        <BookingsStats items={items} />

        <div className="flex flex-wrap items-end justify-between gap-4">
          <AdminGuideFilter
            guides={guides}
            selectedGuideId={activeGuideId}
            type={selectedType || undefined}
            pathname="/admin/bookings"
          />

          <div className="flex flex-nowrap gap-1.5 overflow-x-auto">
            <Button
              variant={selectedType === "" ? "default" : "outline"}
              size="xs"
              className="rounded-full border-2 border-black dark:border-white"
              nativeButton={false}
              render={<Link href={activeGuideId ? `/admin/bookings?guide=${activeGuideId}` : "/admin/bookings"} />}
            >
              All
            </Button>
            {ACTIVITY_TYPE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={selectedType === option.value ? "default" : "outline"}
                size="xs"
                className="rounded-full border-2 border-black dark:border-white"
                nativeButton={false}
                render={
                  <Link
                    href={`/admin/bookings?${new URLSearchParams({
                      ...(activeGuideId ? { guide: activeGuideId } : {}),
                      type: option.value,
                    }).toString()}`}
                  />
                }
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <section className="rounded-[1.5rem] border border-border/80 bg-background/95 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
          <BookingsBoard
            items={items}
            adminActions={{ canConfirm, canCancel }}
          />
        </section>
      </div>
    </div>
  );
}
