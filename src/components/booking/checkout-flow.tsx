"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  Minus,
  Plus,
  Shield,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { createBooking } from "@/lib/actions/booking";
import { ADVENTURE_INSURANCE_PER_PERSON_RUPEES } from "@/lib/booking-pricing";
import { sanitizeText } from "@/lib/sanitize";
import { FORM_FIELD_BORDER } from "@/lib/boundary-styles";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Price } from "@/components/currency/price";
import { formatDurationDays } from "@/lib/trip-dates";
import { cn } from "@/lib/utils";

type Trip = {
  id: string;
  slug: string;
  title: string;
  location: string;
  images: string[];
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

const CANCELLATION_POLICY_TIERS = [
  { when: "Up to 1 week before departure", refund: "Full refund" },
  { when: "Closer to departure", refund: "A fee may apply depending on notice given" },
  { when: "After the trip has started", refund: "No refund" },
];

const TRUST_POINTS = [
  { icon: ShieldCheck, text: "Cancel up to 1 week before departure for free" },
  { icon: Wallet, text: "Reserve your spot with a bank transfer" },
  { icon: Shield, text: "Travel and adventure insurance available" },
];

const STEPS = [
  { key: "select", label: "Trip options" },
  { key: "review", label: "Booking terms" },
  { key: "submitted", label: "Checkout" },
] as const;

type Step = (typeof STEPS)[number]["key"];

function SectionHeading({ number, children }: { number: number; children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2.5 font-heading text-lg font-semibold tracking-tight text-foreground">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white dark:bg-white dark:text-black">
        {number}
      </span>
      {children}
    </h3>
  );
}

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
  const [transactionId, setTransactionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [policyOpen, setPolicyOpen] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  const tripImages = useMemo(() => trip.images.filter(Boolean), [trip.images]);

  useEffect(() => {
    if (tripImages.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      setImageIndex((index) => (index + 1) % tripImages.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [tripImages.length]);

  const selectedSlot = useMemo(
    () => availableSlots.find((slot) => slot.id === slotId) ?? availableSlots[0],
    [availableSlots, slotId]
  );

  const basePrice = trip.priceInRupees * participantCount;
  const insuranceRupees = adventureInsurance
    ? ADVENTURE_INSURANCE_PER_PERSON_RUPEES * participantCount
    : 0;
  const totalPrice = basePrice + insuranceRupees;
  const stepIndex = STEPS.findIndex((item) => item.key === step);
  const canContinue = Boolean(
    selectedSlot && selectedSlot.spotsLeft > 0 && participantCount <= selectedSlot.spotsLeft
  );

  function handleReserve() {
    setError(null);
    setStep("review");
  }

  function handleSubmitPayment() {
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
      const result = await createBooking({
        tripId: trip.id,
        slotId,
        participantCount,
        adventureInsurance,
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
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      {/* Main booking card */}
      <div className="overflow-hidden rounded-[2rem] border border-border/80 bg-background/90 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
        <div className="border-b border-border/70 bg-muted/20 px-6 py-5 sm:px-8">
          <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {STEPS.map((item, index) => {
              const done = index < stepIndex;
              const active = index === stepIndex;
              return (
                <li key={item.key} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                      done && "bg-emerald-600 text-white",
                      active && "bg-black text-white dark:bg-white dark:text-black",
                      !done && !active && "border border-border bg-background text-muted-foreground"
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-semibold uppercase tracking-widest",
                      active
                        ? "text-foreground"
                        : done
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                  {index < STEPS.length - 1 ? (
                    <span className="h-px w-4 bg-border/80 sm:w-8" aria-hidden="true" />
                  ) : null}
                </li>
              );
            })}
          </ol>
          <h2 className="mt-4 font-heading text-2xl font-semibold tracking-tight text-foreground">
            {trip.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {trip.location} · {formatDurationDays(trip.durationDays)}
          </p>
        </div>

        <div className="flex flex-col gap-8 px-6 py-6 sm:px-8">
          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          {/* Date and group size */}
          <section className="space-y-5">
            <SectionHeading number={1}>Date and group size</SectionHeading>

            <div role="radiogroup" aria-label="Select a date" className="flex flex-col gap-2">
              {availableSlots.map((slot) => {
                const selected = slot.id === slotId;
                const full = slot.spotsLeft <= 0;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={full || step !== "select"}
                    onClick={() => setSlotId(slot.id)}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50",
                      selected
                        ? "border-black/60 bg-black/[0.04] dark:border-white/50 dark:bg-white/10"
                        : "border-border/70 bg-background/70 hover:border-black/30 hover:bg-muted/40"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                          selected
                            ? "border-black bg-black dark:border-white dark:bg-white"
                            : "border-border"
                        )}
                      >
                        {selected ? (
                          <Check className="h-2.5 w-2.5 text-white dark:text-black" />
                        ) : null}
                      </span>
                      <span className="font-medium text-foreground">{slot.dateRange}</span>
                    </span>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        full ? "text-muted-foreground line-through" : "text-muted-foreground"
                      )}
                    >
                      {full ? "Full" : `${slot.spotsLeft} spots left`}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/70 px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">Number of people</span>
                <span className="text-xs text-muted-foreground">
                  Max {trip.maxGroupSize} per trip
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Remove person"
                  disabled={participantCount <= 1 || step !== "select"}
                  onClick={() => setParticipantCount((count) => Math.max(1, count - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-6 text-center font-heading text-lg font-semibold text-foreground">
                  {participantCount}
                </span>
                <button
                  type="button"
                  aria-label="Add person"
                  disabled={
                    step !== "select" ||
                    participantCount >=
                      Math.min(selectedSlot?.spotsLeft ?? trip.maxGroupSize, trip.maxGroupSize)
                  }
                  onClick={() => setParticipantCount((count) => count + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>

          {/* Add-ons */}
          <section className="space-y-5 border-t border-border/70 pt-7">
            <SectionHeading number={2}>Add-ons</SectionHeading>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/70 px-4 py-3.5">
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
          </section>

          {/* Cancellation policy */}
          <section className="space-y-4 border-t border-border/70 pt-7">
            <SectionHeading number={3}>Cancellation policy</SectionHeading>
            <div className="overflow-hidden rounded-xl border border-border/70">
              <button
                type="button"
                onClick={() => setPolicyOpen((open) => !open)}
                aria-expanded={policyOpen}
                className="flex w-full items-center justify-between gap-4 bg-background/70 px-4 py-3.5 text-left transition hover:bg-muted/40"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-black bg-black dark:border-white dark:bg-white">
                    <Check className="h-2.5 w-2.5 text-white dark:text-black" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-foreground">Basic</span>
                    <span className="block text-xs text-muted-foreground">
                      Full refund if canceled 1 week before departure.
                    </span>
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    policyOpen && "rotate-180"
                  )}
                />
              </button>
              <div
                className={cn(
                  "grid transition-all duration-200 ease-out",
                  policyOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
              >
                <div className="overflow-hidden">
                  <ul className="divide-y divide-border/60 border-t border-border/60 bg-muted/20 px-4">
                    {CANCELLATION_POLICY_TIERS.map((tier) => (
                      <li
                        key={tier.when}
                        className="flex items-start justify-between gap-4 py-2.5 text-sm"
                      >
                        <span className="text-muted-foreground">{tier.when}</span>
                        <span className="text-right font-medium text-foreground">{tier.refund}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Payment */}
          {step === "review" ? (
            <section className="space-y-5 border-t border-border/70 pt-7">
              <SectionHeading number={4}>Pick how to pay</SectionHeading>
              <div className="flex flex-col gap-3 rounded-xl border border-black/60 bg-black/[0.04] p-4 dark:border-white/40 dark:bg-white/[0.06]">
                <div className="flex items-center gap-3">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-black bg-black dark:border-white dark:bg-white">
                    <Check className="h-2.5 w-2.5 text-white dark:text-black" />
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    Pay in full by bank transfer
                  </span>
                </div>
                <dl className="grid gap-2 text-sm">
                  {DEMO_PAYMENT_DETAILS.map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="text-right font-medium text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
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
            </section>
          ) : null}

          {step === "submitted" ? (
            <div className="border-t border-border/70 pt-7">
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <Check className="h-4 w-4" />
                Payment submitted — pending confirmation
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Sticky summary */}
      <aside className="lg:sticky lg:top-8">
        <div className="overflow-hidden rounded-[2rem] border border-border/80 bg-background/90 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col gap-5 px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-3">
              {tripImages.length > 0 ? (
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border/70 bg-muted/60">
                  {tripImages.map((src, index) => (
                    <div
                      key={src}
                      aria-hidden={index !== imageIndex}
                      className={cn(
                        "absolute inset-0 transition-opacity duration-1000 ease-out",
                        index === imageIndex ? "opacity-100" : "opacity-0"
                      )}
                    >
                      <Image
                        src={src}
                        alt={index === imageIndex ? trip.title : ""}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 22rem"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
              <p className="text-base font-semibold text-foreground">{trip.title}</p>
              <Link
                href={`/trips/${trip.slug}`}
                className="inline-block w-fit text-xs font-medium text-blue-600 underline underline-offset-2 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                View itinerary
              </Link>
            </div>

            <dl className="space-y-2 border-t border-border/70 pt-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Date(s)</dt>
                <dd className="text-right font-medium text-foreground">
                  {selectedSlot?.dateRange ?? "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">People</dt>
                <dd className="text-right font-medium text-foreground">
                  {participantCount} {participantCount === 1 ? "person" : "people"}
                </dd>
              </div>
            </dl>

            <div className="space-y-2 border-t border-border/70 pt-4 text-sm">
              <div className="flex items-center justify-between gap-4 text-muted-foreground">
                <span>
                  <Price amount={trip.priceInRupees} /> × {participantCount}{" "}
                  {participantCount === 1 ? "person" : "people"}
                </span>
                <span className="text-foreground">
                  <Price amount={basePrice} />
                </span>
              </div>
              {adventureInsurance ? (
                <div className="flex items-center justify-between gap-4 text-muted-foreground">
                  <span>
                    Adventure insurance × {participantCount}{" "}
                    {participantCount === 1 ? "person" : "people"}
                  </span>
                  <span className="text-foreground">
                    <Price amount={insuranceRupees} />
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4 text-muted-foreground">
                <span>Booking fee</span>
                <span className="text-foreground">
                  <Price amount={0} />
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-3">
                <span className="font-medium text-foreground">Total</span>
                <span className="font-heading text-2xl font-semibold text-foreground">
                  <Price amount={totalPrice} />
                </span>
              </div>
            </div>

            <ul className="space-y-2 border-t border-border/70 pt-4">
              {TRUST_POINTS.map((point) => (
                <li key={point.text} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <point.icon className="h-4 w-4 shrink-0 text-emerald-600" />
                  {point.text}
                </li>
              ))}
            </ul>

            <div className="border-t border-border/70 pt-4">
              {step === "select" ? (
                <Button
                  className="h-12 w-full rounded-full text-sm"
                  disabled={isPending || !canContinue}
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
                <Button className="h-12 w-full rounded-full text-sm" disabled>
                  Payment pending confirmation
                </Button>
              )}
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Free cancellation up to 1 week before departure
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
