import { hasPermission, requirePermission } from "@/lib/authz";
import { fetchBookingsWithDetails } from "@/lib/bookings";
import { BookingsBoard } from "@/components/bookings/bookings-board";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  const session = await requirePermission(
    "bookings.read",
    "/login?callbackUrl=/admin/bookings",
  );

  const canConfirm = hasPermission(session.user.role, "bookings.confirm");
  const canCancel = hasPermission(session.user.role, "bookings.cancel");

  const items = await fetchBookingsWithDetails(
    {},
    { completePast: true, includeBookingIds: true, includePaymentDetails: true },
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
