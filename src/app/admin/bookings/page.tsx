import { requireAdmin } from "@/lib/authz";
import { getSupportBookings } from "@/lib/support-bookings";
import { SupportBookingsView } from "@/components/support/bookings-view";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  await requireAdmin("/login?callbackUrl=/admin/bookings");

  const bookings = await getSupportBookings();

  return (
    <div className="min-h-screen bg-app-gradient">
      <div className="mx-auto flex max-w-8xl flex-col gap-8 px-6 py-10 sm:py-14 lg:px-10">
        <AdminPageHeader
          title="Manage Bookings"
          description="A live view of every reservation made on the platform, across all travellers and trips."
          active="bookings"
        />

        <SupportBookingsView bookings={bookings} />
      </div>
    </div>
  );
}
