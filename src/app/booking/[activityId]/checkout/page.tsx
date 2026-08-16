import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CheckoutFlow } from "@/components/booking/checkout-flow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTripDateRange } from "@/lib/trip-dates";
import { normalizeTripImagePath } from "@/lib/trip-card-image";

export const metadata: Metadata = {
  title: "Checkout — Radikal",
};

export const dynamic = "force-dynamic";

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
    const callbackUrl = slotIdParam
      ? `/booking/${activityId}/checkout?slot=${slotIdParam}`
      : `/booking/${activityId}/checkout`;

    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
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

  const normalizedImages = activity.images
    .map((image) => normalizeTripImagePath(image, activity.slug))
    .filter(Boolean);
  const galleryImages =
    normalizedImages.length > 0
      ? normalizedImages
      : [`/activities/${activity.slug}/cover.jpg`];
  const gallerySlots = Array.from(
    { length: 4 },
    (_, i) => galleryImages[i % galleryImages.length],
  );

  return (
    <div className="flex flex-1 flex-col bg-app-gradient">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:px-10 lg:py-16">
        <Link
          href={`/trips/${activity.slug}`}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-2 text-sm font-medium text-foreground transition hover:border-black/20 hover:bg-background"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to trip
        </Link>

        <div className="grid gap-8 lg:grid-cols-2 lg:items-stretch">
          {/* Left column — trip photos */}
          <div className="h-full overflow-hidden rounded-[2rem] border border-border/80 bg-background/90 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
            <div className="grid h-full min-h-[300px] grid-cols-4 grid-rows-2 gap-0.5 sm:min-h-[420px]">
              <div className="relative col-span-2 row-span-2 overflow-hidden bg-muted/60">
                <Image src={gallerySlots[0]} alt={`${activity.title} photo`} fill className="object-cover" sizes="50vw" priority />
              </div>
              <div className="relative col-span-1 row-span-1 overflow-hidden bg-muted/60">
                <Image src={gallerySlots[1]} alt={`${activity.title} photo`} fill className="object-cover" sizes="25vw" />
              </div>
              <div className="relative col-span-1 row-span-2 overflow-hidden bg-muted/60">
                <Image src={gallerySlots[3]} alt={`${activity.title} photo`} fill className="object-cover" sizes="25vw" />
              </div>
              <div className="relative col-span-1 row-span-1 overflow-hidden bg-muted/60">
                <Image src={gallerySlots[2]} alt={`${activity.title} photo`} fill className="object-cover" sizes="25vw" />
              </div>
            </div>
          </div>

          {/* Right column — booking form */}
          {!selectedSlot ? (
            <Card className="rounded-[2rem] border-border/80 bg-background/90 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
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
                dateRange: formatTripDateRange(slot.date, activity.durationDays),
                spotsLeft: slot.capacity - slot.booked,
              }))}
              initialSlotId={selectedSlot.id}
            />
          )}
        </div>
      </div>
    </div>
  );
}
