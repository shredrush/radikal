"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  MapPin,
  MessageCircleHeart,
  Minus,
  Plus,
  Users,
  Wallet,
} from "lucide-react";

import { createCustomTripRequestAction } from "@/lib/actions/custom-trips";
import { FORM_FIELD_BORDER } from "@/lib/boundary-styles";
import { CUSTOM_TRIP_GROUP_LABELS, MAX_OPEN_CUSTOM_TRIP_CHATS } from "@/lib/custom-trips";
import { toDateInput } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SportIcon, type SportId } from "@/components/trips/sport-icon";
import { PhoneNumberField } from "@/components/forms/phone-number-field";

const SPORT_OPTIONS: { value: string; label: string; sport: SportId }[] = [
  { value: "TREK", label: "Trekking", sport: "trek" },
  { value: "BIKE", label: "Cycling", sport: "bike" },
  { value: "ROCKCLIMB", label: "Rock climbing", sport: "rockclimb" },
  { value: "EXPEDITION", label: "Expedition", sport: "expedition" },
  { value: "SKI", label: "Skiing", sport: "ski" },
  { value: "SNOWBOARD", label: "Snowboarding", sport: "snowboard" },
  { value: "YOGA", label: "Yoga", sport: "yoga" },
];

const inputClassName =
  `h-12 w-full rounded-2xl border ${FORM_FIELD_BORDER} bg-background px-4 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-orange-400 focus-visible:ring-2 focus-visible:ring-orange-500/20 dark:focus:border-orange-400`;

const errorInputClassName =
  "border-destructive/60 focus:border-destructive focus-visible:ring-destructive/10";

export function CustomTripForm({ atChatLimit = false, isGuest = false }: { atChatLimit?: boolean; isGuest?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [groupType, setGroupType] = useState<"PRIVATE" | "CORPORATE">("PRIVATE");
  const [sports, setSports] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [participantCount, setParticipantCount] = useState(6);
  const [budget, setBudget] = useState("");
  const [requirements, setRequirements] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<
    "sports" | "startDate" | "endDate" | "location" | null
  >(null);

  const sportsRef = useRef<HTMLDivElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);

  function clearFieldError() {
    setErrorField(null);
    setError(null);
    setSuccessMessage(null);
  }

  function toggleSport(value: string) {
    clearFieldError();
    setSports((current) =>
      current.includes(value)
        ? current.filter((sport) => sport !== value)
        : [...current, value],
    );
  }

  function updateParticipantCount(nextCount: number) {
    setParticipantCount(Math.min(200, Math.max(1, nextCount)));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setErrorField(null);

    if (atChatLimit) {
      setError(
        `You can have up to ${MAX_OPEN_CUSTOM_TRIP_CHATS} open custom trip chats at a time. Close an existing request before starting a new one.`,
      );
      return;
    }

    if (sports.length === 0) {
      setError("Choose at least one activity so we can match the right guide.");
      setErrorField("sports");
      sportsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!startDate || !endDate) {
      setError("Choose a start and end date for your trip.");
      setErrorField(!startDate ? "startDate" : "endDate");
      (!startDate ? startDateRef : endDateRef).current?.focus();
      return;
    }

    if (endDate < startDate) {
      setError("Your return date needs to be after your start date.");
      setErrorField("endDate");
      endDateRef.current?.focus();
      return;
    }

    if (!location.trim()) {
      setError("Tell us the place you have in mind.");
      setErrorField("location");
      locationRef.current?.focus();
      return;
    }

    startTransition(async () => {
      try {
        const result = await createCustomTripRequestAction({
          groupType,
          sports,
          startDate,
          endDate,
          location,
          participantCount,
          budgetRupees: budget === "" ? undefined : Number(budget),
          requirements,
          contactName,
          contactEmail,
          contactPhone,
        });

        if (!result.success) {
          setError(result.error);
          return;
        }

        if (isGuest) {
          setSuccessMessage("Your request is in. We created your account and emailed a temporary password so you can sign in to follow the conversation.");
        } else {
          router.push(`/custom-trip/${result.requestId}`);
        }
      } catch {
        setError("Could not send your trip request. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[2rem] border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_12px_32px_-18px_rgba(0,0,0,0.35)] sm:p-6">
      <div className="flex flex-col gap-6 sm:gap-8">
        <section className="rounded-[1.6rem] bg-gradient-to-br from-orange-50 via-white to-emerald-50/70 p-5 dark:from-orange-500/10 dark:via-card dark:to-emerald-500/10 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-700 dark:text-orange-300">
            Start with the spark
          </p>
          <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            What would make this trip unforgettable?
          </h2>
          <div
            ref={sportsRef}
            className={cn(
              "mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7",
              errorField === "sports" && "rounded-2xl bg-destructive/5 p-2 ring-1 ring-destructive/30",
            )}
          >
            {SPORT_OPTIONS.map((sport) => {
              const selected = sports.includes(sport.value);
              return (
                <button
                  key={sport.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleSport(sport.value)}
                  className={cn(
                    "group relative flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40",
                    selected
                      ? "border-emerald-300 bg-emerald-100/70 text-foreground shadow-sm dark:border-emerald-500/35 dark:bg-emerald-500/15"
                      : "border-orange-100 bg-orange-100/65 text-foreground shadow-sm hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100/70 dark:border-orange-500/15 dark:bg-orange-500/10 dark:hover:border-emerald-500/35 dark:hover:bg-emerald-500/15",
                  )}
                >
                  {selected ? (
                      <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  ) : null}
                  <span className={cn("flex size-10 items-center justify-center rounded-full", selected ? "bg-white/70 dark:bg-black/15" : "bg-orange-200/80 dark:bg-orange-400/15")}>
                    <SportIcon sport={sport.sport} className="size-6" iconClassName={selected ? "text-emerald-700 dark:text-emerald-200" : "text-foreground"} />
                  </span>
                  <span className="text-xs font-semibold leading-tight">{sport.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            Select every activity from above that belongs in the story. We&apos;ll shape the route, pacing and guide team around them.
          </p>
          {errorField === "sports" && error ? (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
            >
              Select at least one sport to continue.
            </p>
          ) : null}
        </section>

        {isGuest ? (
          <section className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/60 p-5 dark:border-emerald-500/15 dark:bg-emerald-500/5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Keep in touch</p>
            <h3 className="mt-2 font-heading text-xl font-semibold text-foreground">Where should we send your trip details?</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">We&apos;ll create your account and email a temporary password after you submit.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <input required maxLength={100} value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="Full name" autoComplete="name" className={inputClassName} />
              <input required type="email" maxLength={254} value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="Email address" autoComplete="email" className={inputClassName} />
              <PhoneNumberField id="custom-trip-phone" required className={inputClassName} onValueChange={setContactPhone} />
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
              Set the scene
            </p>
            <h3 className="mt-2 font-heading text-xl font-semibold text-foreground">Where are you drawn to?</h3>
            <div className="relative mt-3">
              <MapPin className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-emerald-600 dark:text-emerald-300" />
              <input
                id="location"
                ref={locationRef}
                type="text"
                maxLength={100}
                value={location}
                onChange={(event) => {
                  setLocation(event.target.value);
                  clearFieldError();
                }}
                placeholder="A region, a trail, or simply 'somewhere wild'"
                className={cn(inputClassName, "pl-10", errorField === "location" && errorInputClassName)}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200 sm:max-w-48">
            Not set on a place? Tell us the feeling and we&apos;ll suggest a fit.
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border border-orange-100 bg-orange-50/60 p-5 dark:border-orange-500/15 dark:bg-orange-500/5">
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <CalendarDays className="size-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">Find your window</p>
            </div>
            <h3 className="mt-2 font-heading text-xl font-semibold text-foreground">When should we go?</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="start-date" className="mb-1.5 block text-xs font-medium text-muted-foreground">Leave</label>
                <input
                  id="start-date"
                  ref={startDateRef}
                  type="date"
                  min={toDateInput(new Date())}
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    clearFieldError();
                  }}
                  className={cn(inputClassName, errorField === "startDate" && errorInputClassName)}
                />
              </div>
              <div>
                <label htmlFor="end-date" className="mb-1.5 block text-xs font-medium text-muted-foreground">Return</label>
                <input
                  id="end-date"
                  ref={endDateRef}
                  type="date"
                  min={startDate || toDateInput(new Date())}
                  value={endDate}
                  onChange={(event) => {
                    setEndDate(event.target.value);
                    clearFieldError();
                  }}
                  className={cn(inputClassName, errorField === "endDate" && errorInputClassName)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/60 p-5 dark:border-emerald-500/15 dark:bg-emerald-500/5">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <Users className="size-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">Bring your people</p>
            </div>
            <h3 className="mt-2 font-heading text-xl font-semibold text-foreground">Who is this for?</h3>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(["PRIVATE", "CORPORATE"] as const).map((value) => {
                const selected = groupType === value;
                const Icon = value === "PRIVATE" ? Users : BriefcaseBusiness;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setGroupType(value)}
                    className={cn(
                      "flex items-center gap-2 rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition",
                      selected
                        ? "border-emerald-400 bg-white text-emerald-800 shadow-sm dark:bg-card dark:text-emerald-200"
                        : "border-transparent bg-white/60 text-muted-foreground hover:border-emerald-200 dark:bg-card/40 dark:hover:border-emerald-500/30",
                    )}
                  >
                    <Icon className="size-4" />
                    {CUSTOM_TRIP_GROUP_LABELS[value]}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/75 px-3 py-2 dark:bg-card/60">
              <span className="text-sm text-muted-foreground">How many are coming?</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => updateParticipantCount(participantCount - 1)} disabled={participantCount <= 1} aria-label="Remove one traveller" className="flex size-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:border-emerald-300 disabled:opacity-35"><Minus className="size-3.5" /></button>
                <span className="w-7 text-center text-sm font-semibold text-foreground">{participantCount}</span>
                <button type="button" onClick={() => updateParticipantCount(participantCount + 1)} disabled={participantCount >= 200} aria-label="Add one traveller" className="flex size-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:border-emerald-300 disabled:opacity-35"><Plus className="size-3.5" /></button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-border/70 bg-muted/20 p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="size-4 text-orange-600 dark:text-orange-300" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">Make it yours</p>
          </div>
          <div className="mt-2 grid gap-4 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
            <div>
              <h3 className="font-heading text-xl font-semibold text-foreground">Have a group budget in mind?</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Optional. A ballpark helps us make thoughtful recommendations.</p>
              <div className="relative mt-3">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">₹</span>
                <input id="budget" type="number" min={0} max={10_000_000} step={1000} value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="Leave open for a tailored quote" className={cn(inputClassName, "pl-8")} />
              </div>
            </div>
            <div>
              <h3 className="font-heading text-xl font-semibold text-foreground">What else should your guide know?</h3>
              <textarea
                id="requirements"
                rows={3}
                maxLength={4000}
                value={requirements}
                onChange={(event) => setRequirements(event.target.value)}
                placeholder="Your pace, comforts, experience level, a celebration, or the one thing you don't want to miss..."
                className={`mt-3 w-full resize-none rounded-2xl border ${FORM_FIELD_BORDER} bg-background px-4 py-3 text-sm leading-6 shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-orange-400 focus-visible:ring-2 focus-visible:ring-orange-500/20 dark:focus:border-orange-400`}
              />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-[1.5rem] bg-foreground px-5 py-5 text-background sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold"><MessageCircleHeart className="size-4 text-orange-300" /> Your trip brief is ready</p>
            <p className="mt-1 text-sm text-background/65">We&apos;ll open a dedicated conversation to turn it into an itinerary and quote.</p>
          </div>
          <Button type="submit" size="lg" disabled={isPending || atChatLimit} className="shrink-0 rounded-full bg-orange-600 px-5 text-white hover:bg-orange-500 disabled:opacity-60">
            {isPending ? "Sending your brief..." : "Start the conversation"}
            <ArrowRight className="size-4" />
          </Button>
        </section>

        {error ? <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
        {successMessage ? <p role="status" className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">{successMessage}</p> : null}
      </div>
    </form>
  );
}
