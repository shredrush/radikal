import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Sparkles } from "lucide-react";

import { auth } from "@/lib/auth";
import { loadDb, prisma } from "@/lib/prisma";
import { CheckoutFlow } from "@/components/booking/checkout-flow";
import { FaqSection, type FaqItem } from "@/components/trips/faq-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTripDateRange } from "@/lib/trip-dates";
import { normalizeTripImagePath } from "@/lib/trip-card-image";

export const metadata: Metadata = {
  title: "Checkout — Radikal",
};

export const dynamic = "force-dynamic";

const BOOKING_FAQ_ITEMS: FaqItem[] = [
  {
    question: "How do I pay for my booking?",
    answer:
      "We settle by bank transfer. After you reserve your spot, the summary above shows our bank details — transfer the amount, then enter your transaction reference here so our team can match the payment.",
  },
  {
    question: "When is my booking confirmed?",
    answer:
      "Your spot is reserved as soon as you complete checkout. It’s confirmed once our team verifies your bank transfer, usually within a couple of working days.",
  },
  {
    question: "What’s your cancellation policy?",
    answer:
      "You can cancel free of charge up to 1 week before departure. Closer to the date, a fee may apply depending on how much notice you give.",
  },
  {
    question: "How do refunds work?",
    answer:
      "Refunds go back to the original account once your cancellation is processed. The amount depends on when you cancel, and our support team will confirm the timeline with you.",
  },
  {
    question: "Can I move my booking to another date?",
    answer:
      "Usually yes. Contact support with your booking details and we’ll move your spot to another available date where possible.",
  },
  {
    question: "Can you accommodate special needs?",
    answer:
      "Yes — share dietary requirements, accessibility needs or medical details in the “Special needs and services” section at checkout, and our team and your guide will review them before departure.",
  },
  {
    question: "Is there a booking fee?",
    answer:
      "No — the amount shown at checkout is the trip price only. We don’t add a separate booking fee.",
  },
  {
    question: "Do I need travel/adventure insurance?",
    answer:
      "You can opt in to adventure insurance as an add-on during checkout.",
  },
  {
    question: "What if Radikal cancels a trip?",
    answer:
      "If we have to cancel a departure, you’ll be offered a full refund or a transfer to another date — whichever you prefer.",
  },
];

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ slot?: string; participants?: string }>;
}) {
  const { tripId } = await params;
  const {
    slot: slotIdParam,
    participants: participantCountParam,
  } = await searchParams;

  const parsedParticipantCount = Number.parseInt(participantCountParam ?? "1", 10);
  const requestedParticipantCount = Number.isFinite(parsedParticipantCount)
    ? parsedParticipantCount
    : 1;

  const session = await auth();
  if (!session?.user) {
    const callbackParams = new URLSearchParams();
    if (slotIdParam) callbackParams.set("slot", slotIdParam);
    callbackParams.set("participants", String(Math.max(1, requestedParticipantCount)));
    const callbackUrl = `/booking/${tripId}/checkout?${callbackParams.toString()}`;

    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const trip = await loadDb(
    "checkout.trip",
    () =>
      prisma.trip.findFirst({
        where: { id: tripId, deletedAt: null },
        include: {
          guide: true,
          slots: {
            where: { date: { gte: new Date() }, deletedAt: null },
            orderBy: { date: "asc" },
          },
        },
      }),
  );

  if (!trip) {
    notFound();
  }

  const selectedSlot = slotIdParam
    ? trip.slots.find((slot) => slot.id === slotIdParam)
    : trip.slots[0];

  const initialParticipantCount = Math.min(
    Math.max(1, requestedParticipantCount),
    trip.maxGroupSize,
  );

  const normalizedImages = trip.images
    .map((image) => normalizeTripImagePath(image, trip.slug))
    .filter(Boolean);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:px-10 lg:py-16">
        <Link
          href={`/trips/${trip.slug}`}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-2 text-sm font-medium text-foreground transition hover:border-black/20 hover:bg-background"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to trip
        </Link>

        {/* Booking flow */}
        {!selectedSlot ? (
          <Card className="rounded-[2rem] border-border/80 bg-transparent shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
            <CardHeader>
              <CardTitle>No upcoming dates</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-4">
              <p className="text-sm text-muted-foreground">
                There are no available slots for this trip right now. Plan your own
                dates with a custom trip and our team will build an itinerary around
                you.
              </p>
              <Button
                size="sm"
                className="rounded-full bg-orange-700 text-white hover:bg-orange-800"
                nativeButton={false}
                render={<Link href="/custom-trip" />}
              >
                <Sparkles className="h-4 w-4" />
                Plan a custom trip
              </Button>
            </CardContent>
          </Card>
        ) : (
          <CheckoutFlow
            trip={{
              id: trip.id,
              slug: trip.slug,
              title: trip.title,
              location: trip.location,
              images: normalizedImages,
              priceInRupees: trip.priceInRupees,
              durationDays: trip.durationDays,
              maxGroupSize: trip.maxGroupSize,
            }}
            availableSlots={trip.slots.map((slot) => ({
              id: slot.id,
              date: slot.date.toISOString(),
              dateRange: formatTripDateRange(slot.date, trip.durationDays),
              spotsLeft: slot.capacity - slot.booked - slot.reserved,
            }))}
            initialSlotId={selectedSlot.id}
            initialParticipantCount={initialParticipantCount}
          />
        )}

        <FaqSection
          items={BOOKING_FAQ_ITEMS}
          title="Frequently asked questions"
        />
      </div>
    </div>
  );
}
