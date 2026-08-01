import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CheckoutFlow } from "@/components/booking/checkout-flow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Checkout — Radikal",
};

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ activityId: string }>;
  searchParams: Promise<{ slot?: string }>;
}) {
  const { activityId } = await params;
  const { slot: slotIdParam } = await searchParams;

  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=/booking/${activityId}/checkout`);
  }

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    include: {
      guide: true,
      slots: {
        where: { date: { gte: new Date() } },
        orderBy: { date: "asc" },
      },
    },
  });

  if (!activity) {
    notFound();
  }

  const selectedSlot = slotIdParam
    ? activity.slots.find((slot) => slot.id === slotIdParam)
    : activity.slots[0];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
      <div>
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Checkout
        </p>
        <h1 className="font-heading text-2xl font-semibold tracking-wide">
          {activity.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {activity.location}
          {activity.guide ? ` · Guided by ${activity.guide.name}` : null}
        </p>
      </div>

      {!selectedSlot ? (
        <Card>
          <CardHeader>
            <CardTitle>No upcoming dates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              There are no available slots for this trip right now. Check back
              soon or get in touch for a custom date.
            </p>
          </CardContent>
        </Card>
      ) : (
        <CheckoutFlow
          activity={{
            id: activity.id,
            title: activity.title,
            location: activity.location,
            priceInRupees: activity.priceInRupees,
            durationDays: activity.durationDays,
            maxGroupSize: activity.maxGroupSize,
          }}
          availableSlots={activity.slots.map((slot) => ({
            id: slot.id,
            date: slot.date.toISOString(),
            spotsLeft: slot.capacity - slot.booked,
          }))}
          initialSlotId={selectedSlot.id}
        />
      )}
    </div>
  );
}
