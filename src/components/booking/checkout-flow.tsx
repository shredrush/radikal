"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Minus, Plus, ShieldCheck, Users } from "lucide-react";

import { createBooking } from "@/lib/actions/booking";
import { processDummyPayment } from "@/lib/actions/payment";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

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
      router.push("/profile");
    });
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-border/80 bg-background/90 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
      <div className="border-b border-border/70 bg-muted/20 px-6 py-5 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Booking summary
        </p>
        <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground">
          {activity.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {activity.location} · {activity.durationDays}{" "}
          {activity.durationDays === 1 ? "day" : "days"}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-6 px-6 py-6 sm:px-8">
        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="slot" className="inline-flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            Select a date
          </Label>
          <select
            id="slot"
            value={slotId}
            disabled={step !== "select"}
            onChange={(event) => setSlotId(event.target.value)}
            className="h-12 w-full rounded-xl border border-border/70 bg-background/80 px-3 text-sm shadow-sm outline-none transition focus:border-black focus-visible:ring-2 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {availableSlots.map((slot) => (
              <option key={slot.id} value={slot.id} disabled={slot.spotsLeft <= 0}>
                {slot.dateRange} — {slot.spotsLeft > 0 ? `${slot.spotsLeft} spots left` : "Full"}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="participants" className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            Participants
          </Label>
          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/80 px-3 py-2">
            <button
              type="button"
              aria-label="Decrease participants"
              disabled={participantCount <= 1 || step !== "select"}
              onClick={() => setParticipantCount((count) => Math.max(1, count - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="font-heading text-lg font-semibold text-foreground">{participantCount}</span>
            <button
              type="button"
              aria-label="Increase participants"
              disabled={step !== "select" || (selectedSlot ? participantCount >= Math.max(1, selectedSlot.spotsLeft) : false)}
              onClick={() => setParticipantCount((count) => count + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2 border-t border-border/70 pt-4 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>
              {formatRupees(activity.priceInRupees)} × {participantCount}{" "}
              {participantCount === 1 ? "person" : "people"}
            </span>
            <span className="text-foreground">
              {formatRupees(totalPrice)}
            </span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Booking fee</span>
            <span className="text-foreground">₹0</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-[1.25rem] border border-border/70 bg-muted/20 px-4 py-3">
          <span className="text-sm font-medium text-foreground">Total due</span>
          <span className="font-heading text-2xl font-semibold text-foreground">
            {formatRupees(totalPrice)}
          </span>
        </div>

        {step !== "select" ? (
          <div className="flex items-center gap-2">
            <Badge variant={step === "confirmed" ? "default" : "secondary"} className="rounded-full px-3 py-1">
              {step === "confirmed" ? "Confirmed" : "Booking reserved · payment pending"}
            </Badge>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-border/70 px-6 py-5 sm:px-8">
        {step === "select" ? (
          <Button
            className="h-12 w-full rounded-full text-sm"
            disabled={isPending || !selectedSlot || selectedSlot.spotsLeft <= 0}
            onClick={handleReserve}
          >
            {isPending ? "Reserving…" : "Reserve your spot"}
          </Button>
        ) : (
          <Button
            className="h-12 w-full rounded-full text-sm"
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
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          Free cancellation up to 48 hours before departure
        </p>
      </div>
    </div>
  );
}
