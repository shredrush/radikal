import { hasPermission, requirePermission } from "@/lib/authz";
import { getSupportBookings } from "@/lib/support-bookings";
import { SupportBookingsView } from "@/components/support/bookings-view";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  const session = await requirePermission(
    "bookings.read",
    "/login?callbackUrl=/admin/bookings",
  );

  const bookings = await getSupportBookings();

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-8xl flex-col gap-8 px-6 py-10 sm:py-14 lg:px-10">
        <AdminPageHeader
          title="Manage Bookings"
          description="A live view of every booking on the platform"
          active="bookings"
          role={session.user.role}
        />

        <SupportBookingsView
          bookings={bookings}
          canConfirm={hasPermission(session.user.role, "bookings.confirm")}
          canCancel={hasPermission(session.user.role, "bookings.cancel")}
        />
      </div>
    </div>
  );
}
