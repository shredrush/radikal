"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createBooking } from "@/lib/actions/booking";
import { processDummyPayment } from "@/lib/actions/payment";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Activity = {
  id: string;
  title: string;
  location: string;
  priceInRupees: number;
  durationDays: number;
  maxGroupSize: number;
};

type SlotOption = {
  id: string;
  date: string;
  dateRange: string;
  spotsLeft: number;
};

function formatRupees(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

type Step = "select" | "review" | "paying" | "confirmed";

export function CheckoutFlow({
  activity,
  availableSlots,
  initialSlotId,
}: {
  activity: Activity;
  availableSlots: SlotOption[];
  initialSlotId: string;
}) {
  const router = useRouter();
  const [slotId, setSlotId] = useState(initialSlotId);
  const [participantCount, setParticipantCount] = useState(1);
  const [step, setStep] = useState<Step>("select");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedSlot = useMemo(
    () => availableSlots.find((slot) => slot.id === slotId) ?? availableSlots[0],
    [availableSlots, slotId]
  );

  const totalPrice = activity.priceInRupees * participantCount;

  function handleReserve() {
    setError(null);
    startTransition(async () => {
      const result = await createBooking({
        activityId: activity.id,
        slotId,
        participantCount,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setBookingId(result.bookingId);
      setStep("review");
    });
  }

  function handlePayNow() {
    if (!bookingId) return;
    setError(null);
    setStep("paying");
    startTransition(async () => {
      const result = await processDummyPayment({ bookingId });

      if (!result.success) {
        setError(result.error);
        setStep("review");
        return;
      }

      setStep("confirmed");
      router.push("/dashboard");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{activity.title}</CardTitle>
        <CardDescription>
          {activity.location} · {activity.durationDays}{" "}
          {activity.durationDays === 1 ? "day" : "days"} · up to{" "}
          {activity.maxGroupSize} people
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {error ? (
          <p
            role="alert"
            className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="slot">Date</Label>
          <select
            id="slot"
            value={slotId}
            disabled={step !== "select"}
            onChange={(event) => setSlotId(event.target.value)}
            className="h-10 w-full border border-transparent border-b-input bg-transparent text-sm outline-none focus-visible:border-b-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {availableSlots.map((slot) => (
              <option key={slot.id} value={slot.id} disabled={slot.spotsLeft <= 0}>
                {slot.dateRange} — {slot.spotsLeft > 0 ? `${slot.spotsLeft} spots left` : "Full"}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="participants">Participants</Label>
          <input
            id="participants"
            type="number"
            min={1}
            max={selectedSlot ? Math.max(1, selectedSlot.spotsLeft) : 1}
            value={participantCount}
            disabled={step !== "select"}
            onChange={(event) =>
              setParticipantCount(
                Math.max(1, Number(event.target.value) || 1)
              )
            }
            className="h-10 w-full border border-transparent border-b-input bg-transparent px-0 text-sm outline-none focus-visible:border-b-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-heading text-xl font-semibold">
            {formatRupees(totalPrice)}
          </span>
        </div>

        {step !== "select" ? (
          <div className="flex items-center gap-2">
            <Badge variant={step === "confirmed" ? "default" : "secondary"}>
              {step === "confirmed" ? "Confirmed" : "Booking reserved · payment pending"}
            </Badge>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        {step === "select" ? (
          <Button
            className="w-full"
            disabled={isPending || !selectedSlot || selectedSlot.spotsLeft <= 0}
            onClick={handleReserve}
          >
            {isPending ? "Reserving…" : "Reserve your spot"}
          </Button>
        ) : (
          <Button
            className="w-full"
            disabled={isPending || step === "confirmed"}
            onClick={handlePayNow}
          >
            {step === "paying" || isPending
              ? "Processing payment…"
              : step === "confirmed"
                ? "Payment successful"
                : "Pay Now"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
