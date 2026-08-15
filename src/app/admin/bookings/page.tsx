import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { ConfirmPaymentButton } from "@/components/admin/confirm-payment-button";
import { CancelBookingButton } from "@/components/admin/cancel-booking-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatTripDateRange } from "@/lib/trip-dates";
import { getTripCardImage } from "@/lib/trip-card-image";
import { CalendarDays, MapPin, Ticket, Users } from "lucide-react";

export const dynamic = "force-dynamic";

function formatRupees(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const statusStyles: Record<string, string> = {
  PENDING: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  CONFIRMED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  CANCELLED: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

function statusLabel(status: string) {
  if (status === "CONFIRMED") return "Confirmed";
  if (status === "CANCELLED") return "Cancelled";
  return "Pending payment";
}

export default async function AdminBookingsPage() {
  await requireAdmin("/login?callbackUrl=/admin/bookings");

  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      activity: true,
      slot: true,
    },
  });

  const confirmedCount = bookings.filter((b) => b.status === "CONFIRMED").length;
  const pendingCount = bookings.filter((b) => b.status === "PENDING").length;
  const confirmedRevenue = bookings
    .filter((b) => b.status === "CONFIRMED")
    .reduce((sum, b) => sum + b.totalPriceRupees, 0);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.08),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(249,115,22,0.08),_transparent_30%)]">
      <div className="mx-auto flex max-w-8xl flex-col gap-8 px-6 py-10 sm:py-14 lg:px-10">
        <header className="rounded-[2rem] border border-border/80 bg-background/90 p-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">Admin board</p>
              <h1 className="font-heading text-3xl font-semibold tracking-wide text-foreground sm:text-4xl">Booking management</h1>
              <p className="text-sm leading-7 text-muted-foreground">
                A live view of every reservation made on the platform, across all travellers and trips.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" className="rounded-full" nativeButton={false} render={<Link href="/admin/trips" />}>
                Manage trips
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" nativeButton={false} render={<Link href="/admin/guides" />}>
                Manage guides
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" nativeButton={false} render={<Link href="/profile" />}>
                Back to profile
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-4">
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Total bookings</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{bookings.length}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Confirmed</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{confirmedCount}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Pending payment</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{pendingCount}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Confirmed revenue</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{formatRupees(confirmedRevenue)}</p>
            </div>
          </div>
        </header>

        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">All bookings</h2>
          <p className="text-sm text-muted-foreground">
            Sorted by most recent first. Includes the traveller, trip, and payment status.
          </p>
        </div>

        {bookings.length === 0 ? (
          <Card className="overflow-hidden border-border/70 bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)]">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4 rounded-[1.2rem] border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
                <Ticket className="h-8 w-8 text-muted-foreground/50" />
                <div>
                  <p className="font-medium text-foreground">No bookings yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Reservations will appear here as soon as travellers book a trip.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {bookings.map((booking) => (
              <Card key={booking.id} className="overflow-hidden border-border/70 bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)]">
                <CardHeader className="border-b border-border/70 bg-muted/20">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-widest ${statusStyles[booking.status] ?? statusStyles.PENDING}`}
                        >
                          {statusLabel(booking.status)}
                        </span>
                        <Badge variant="outline" className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                          {booking.activity.location}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl">{booking.activity.title}</CardTitle>
                      <CardDescription className="text-sm leading-6 text-muted-foreground">
                        {booking.user.name} · {booking.user.email}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">Total paid</p>
                      <p className="mt-1 font-heading text-xl font-semibold text-foreground">
                        {formatRupees(booking.totalPriceRupees)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      {formatTripDateRange(booking.slot.date, booking.activity.durationDays)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-primary" />
                      {booking.participantCount}{" "}
                      {booking.participantCount === 1 ? "participant" : "participants"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-primary" />
                      {booking.activity.location}
                    </span>
                  </div>

                  {booking.status === "PENDING" ? (
                    <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4">
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Transaction ID:</span>{" "}
                        {booking.paymentTransactionId ?? "Not submitted yet"}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <CancelBookingButton bookingId={booking.id} />
                        <ConfirmPaymentButton bookingId={booking.id} />
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
