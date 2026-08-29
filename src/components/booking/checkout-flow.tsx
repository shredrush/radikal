"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Minus, Plus, Shield, ShieldCheck, Users } from "lucide-react";

import { createBooking } from "@/lib/actions/booking";
import { ADVENTURE_INSURANCE_PER_PERSON_RUPEES } from "@/lib/booking-pricing";
import { submitTransactionId } from "@/lib/actions/payment";
import { sanitizeText } from "@/lib/sanitize";
import { FORM_FIELD_BORDER } from "@/lib/boundary-styles";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/currency/price";
import { formatDurationDays } from "@/lib/trip-dates";

type Trip = {
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

const DEMO_PAYMENT_DETAILS = [
  { label: "Bank", value: "HDFC Bank" },
  { label: "Account number", value: "5020 0062 8211 76" },
  { label: "IFSC code", value: "HDFC0005440" },
];

type Step = "select" | "review" | "submitted";

export function CheckoutFlow({
  trip,
  availableSlots,
  initialSlotId,
  initialParticipantCount,
}: {
  trip: Trip;
  availableSlots: SlotOption[];
  initialSlotId: string;
  initialParticipantCount: number;
}) {
  const router = useRouter();
  const [slotId, setSlotId] = useState(initialSlotId);
  const [participantCount, setParticipantCount] = useState(initialParticipantCount);
  const [adventureInsurance, setAdventureInsurance] = useState(false);
  const [step, setStep] = useState<Step>("select");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedSlot = useMemo(
    () => availableSlots.find((slot) => slot.id === slotId) ?? availableSlots[0],
    [availableSlots, slotId]
  );

  const basePrice = trip.priceInRupees * participantCount;
  const insuranceRupees = adventureInsurance
    ? ADVENTURE_INSURANCE_PER_PERSON_RUPEES * participantCount
    : 0;
  const totalPrice = basePrice + insuranceRupees;

  function handleReserve() {
    setError(null);
    startTransition(async () => {
      const result = await createBooking({
        tripId: trip.id,
        slotId,
        participantCount,
        adventureInsurance,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setBookingId(result.bookingId);
      setStep("review");
    });
  }

  function handleSubmitPayment() {
    if (!bookingId) return;

    // Sanitize locally before sending — mirrors the server-side sanitization.
    const cleanTransactionId = sanitizeText(transactionId, { maxLength: 100 });

    if (!cleanTransactionId) {
      setError("Please enter the transaction ID from your bank transfer.");
      return;
    }
    if (!/^[A-Za-z0-9-]+$/.test(cleanTransactionId)) {
      setError("Transaction ID can only contain letters, numbers and hyphens.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await submitTransactionId({
        bookingId,
        transactionId: cleanTransactionId,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setStep("submitted");
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
          {trip.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {trip.location} · {formatDurationDays(trip.durationDays)}
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
            className="h-12 w-full rounded-xl border border-emerald-600/40 bg-background/80 px-3 text-sm shadow-sm outline-none transition hover:border-emerald-600 focus:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-50"
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

        <div className="flex flex-col gap-2">
          <Label htmlFor="adventure-insurance" className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            Add-ons
          </Label>
          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/80 px-3 py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">Adventure insurance</span>
              <span className="text-xs text-muted-foreground">
                <Price amount={ADVENTURE_INSURANCE_PER_PERSON_RUPEES} /> per person
              </span>
            </div>
            <button
              id="adventure-insurance"
              type="button"
              role="switch"
              aria-checked={adventureInsurance}
              disabled={step !== "select"}
              onClick={() => setAdventureInsurance((on) => !on)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                adventureInsurance ? "bg-emerald-600" : "bg-muted"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  adventureInsurance ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="space-y-2 border-t border-border/70 pt-4 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>
              <Price amount={trip.priceInRupees} /> × {participantCount}{" "}
              {participantCount === 1 ? "person" : "people"}
            </span>
            <span className="text-foreground">
              <Price amount={basePrice} />
            </span>
          </div>
          {adventureInsurance ? (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>
                Adventure insurance × {participantCount}{" "}
                {participantCount === 1 ? "person" : "people"}
              </span>
              <span className="text-foreground">
                <Price amount={insuranceRupees} />
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Booking fee</span>
            <span className="text-foreground">
              <Price amount={0} />
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-[1.25rem] border border-border/70 bg-muted/20 px-4 py-3">
          <span className="text-sm font-medium text-foreground">Total due</span>
          <span className="font-heading text-2xl font-semibold text-foreground">
            <Price amount={totalPrice} />
          </span>
        </div>

        {step === "review" ? (
          <>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                Booking reserved · payment pending
              </Badge>
            </div>
            <div className="flex flex-col gap-3 rounded-[1.25rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm font-semibold text-foreground">
                Pay via bank transfer
              </p>
              <dl className="grid gap-2 text-sm">
                {DEMO_PAYMENT_DETAILS.map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right font-medium text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-col gap-2">
                <Label htmlFor="transaction-id" className="text-muted-foreground">
                  Transaction ID
                </Label>
                <input
                  id="transaction-id"
                  value={transactionId}
                  onChange={(event) => setTransactionId(event.target.value)}
                  placeholder="e.g. UTR / reference number"
                  className={`h-12 w-full rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 text-sm shadow-sm outline-none transition focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`}
                />
              </div>
            </div>
          </>
        ) : null}

        {step === "submitted" ? (
          <div className="flex items-center gap-2">
            <Badge className="rounded-full px-3 py-1">
              Payment submitted · pending confirmation
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
        ) : step === "review" ? (
          <Button
            className="h-12 w-full rounded-full text-sm"
            disabled={isPending || !transactionId.trim()}
            onClick={handleSubmitPayment}
          >
            {isPending ? "Submitting…" : "I have paid"}
          </Button>
        ) : (
          <Button
            className="h-12 w-full rounded-full text-sm"
            disabled
          >
            Payment pending confirmation
          </Button>
        )}
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          Free cancellation up to 1 week before departure
        </p>
      </div>
    </div>
  );
}
