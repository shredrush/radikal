import type { BookingBoardItem } from "@/lib/bookings";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

/**
 * Shared booking stats used by the admin bookings page and the support board
 * bookings tab. Both render from the same data shape so the counts always
 * match what `BookingsBoard` shows below.
 */
export function BookingsStats({ items }: { items: BookingBoardItem[] }) {
  return (
    <section className="grid gap-3 md:grid-cols-5">
      <StatCard label="Total bookings" value={items.length} />
      <StatCard
        label="Pending payment"
        value={items.filter((booking) => booking.status === "PENDING").length}
      />
      <StatCard
        label="Confirmed"
        value={items.filter((booking) => booking.status === "CONFIRMED").length}
      />
      <StatCard
        label="Completed"
        value={items.filter((booking) => booking.status === "COMPLETED").length}
      />
      <StatCard
        label="Cancelled"
        value={items.filter((booking) => booking.status === "CANCELLED").length}
      />
    </section>
  );
}
