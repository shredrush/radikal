import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard — Radikal",
};

function formatRupees(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const statusVariant = {
  PENDING: "secondary",
  CONFIRMED: "default",
  CANCELLED: "destructive",
} as const;

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const bookings = await prisma.booking.findMany({
    where: { userId: session.user.id },
    include: { activity: true, slot: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16">
      <div>
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Dashboard
        </p>
        <h1 className="font-heading text-2xl font-semibold tracking-wide">
          Welcome back, {session.user.name?.split(" ")[0] ?? "traveller"}
        </h1>
        <p className="text-sm text-muted-foreground">Your bookings with Radikal.</p>
      </div>

      {session.user.role === "ADMIN" ? (
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            nativeButton={false}
            render={<Link href="/admin/trips" />}
          >
            Manage trips
          </Button>
        </div>
      ) : null}

      {bookings.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No bookings yet</CardTitle>
            <CardDescription>
              Once you book a trip, it will show up here with its status.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{booking.activity.title}</CardTitle>
                    <CardDescription>
                      {booking.activity.location} ·{" "}
                      {formatDate(booking.slot.date)} ·{" "}
                      {booking.participantCount}{" "}
                      {booking.participantCount === 1 ? "participant" : "participants"}
                    </CardDescription>
                  </div>
                  <Badge variant={statusVariant[booking.status]}>
                    {booking.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total paid</span>
                <span className="font-heading text-lg font-semibold">
                  {formatRupees(booking.totalPriceRupees)}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Looking for your next trip?{" "}
        <Link href="/" className="text-foreground underline underline-offset-4">
          Browse activities
        </Link>
      </p>
    </div>
  );
}
