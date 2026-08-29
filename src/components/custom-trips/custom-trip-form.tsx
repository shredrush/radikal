"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  Check,
  MapPin,
  MessageSquareText,
  Users,
  Wallet,
} from "lucide-react";

import { createCustomTripRequestAction } from "@/lib/actions/custom-trips";
import { FORM_FIELD_BORDER } from "@/lib/boundary-styles";
import { CUSTOM_TRIP_GROUP_LABELS } from "@/lib/custom-trips";
import { ACTIVITY_TYPE_OPTIONS } from "@/lib/trip-metadata";
import { pluralize, toDateInput } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const inputClassName =
  `h-12 w-full rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`;

const errorInputClassName =
  "border-destructive/60 focus:border-destructive focus-visible:ring-destructive/10";

function RequiredAsterisk() {
  return (
    <span aria-hidden="true" className="text-destructive">
      *
    </span>
  );
}

export function CustomTripForm() {
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
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<
    "sports" | "startDate" | "endDate" | "location" | null
  >(null);

  const sportsRef = useRef<HTMLDivElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);

  function toggleSport(value: string) {
    setErrorField(null);
    setSports((current) =>
      current.includes(value)
        ? current.filter((sport) => sport !== value)
        : [...current, value],
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setErrorField(null);

    if (sports.length === 0) {
      setError("Select at least one sport.");
      setErrorField("sports");
      sportsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!startDate || !endDate) {
      setError("Choose both a start and an end date.");
      setErrorField(!startDate ? "startDate" : "endDate");
      const target = !startDate ? startDateRef : endDateRef;
      target.current?.focus();
      return;
    }

    if (endDate < startDate) {
      setError("End date must be on or after the start date.");
      setErrorField("endDate");
      endDateRef.current?.focus();
      return;
    }

    if (!location.trim()) {
      setError("Tell us where you'd like to go.");
      setErrorField("location");
      locationRef.current?.focus();
      return;
    }

    startTransition(async () => {
      const result = await createCustomTripRequestAction({
        groupType,
        sports,
        startDate,
        endDate,
        location,
        participantCount,
        budgetRupees: budget === "" ? undefined : Number(budget),
        requirements,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push(`/custom-trip/${result.requestId}`);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-[2rem] border border-border/80 bg-background/90 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]"
    >
      <div className="border-b border-border/70 bg-muted/20 px-6 py-5 sm:px-8">
        <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground">
          Tell us what you have in mind
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll get back to you with a tailored plan and a quote.
        </p>
      </div>

      <div className="flex flex-col gap-6 px-6 py-6 sm:px-8">
        {/* Group type */}
        <div className="flex flex-col gap-2">
          <Label className="text-muted-foreground">Who is this trip for?</Label>
          <div className="grid grid-cols-2 gap-3">
            {(["PRIVATE", "CORPORATE"] as const).map((value) => {
              const isOrange = value === "PRIVATE";
              const selected = groupType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGroupType(value)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-colors",
                    selected
                      ? isOrange
                        ? "border-orange-500/60 bg-orange-50 text-foreground dark:border-orange-500/40 dark:bg-orange-500/10"
                        : "border-emerald-500/60 bg-emerald-50 text-foreground dark:border-emerald-500/40 dark:bg-emerald-500/10"
                      : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  {isOrange ? (
                    <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  ) : (
                    <Briefcase className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <span className="text-sm font-semibold text-foreground">
                    {CUSTOM_TRIP_GROUP_LABELS[value]}
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {isOrange
                      ? "Friends, family or a personal group"
                      : "Offsites, team retreats and client events"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sports */}
        <div className="flex flex-col gap-2">
          <Label className="text-muted-foreground">
            What sports would you like? <RequiredAsterisk />{" "}
            <span className="font-normal normal-case">(choose one or more)</span>
          </Label>
          <div
            ref={sportsRef}
            className={cn(
              "flex flex-wrap gap-2 rounded-lg border border-transparent",
              errorField === "sports" && "border-destructive/50 bg-destructive/5",
            )}
          >
            {ACTIVITY_TYPE_OPTIONS.map((sport) => {
              const selected = sports.includes(sport.value);
              return (
                <button
                  key={sport.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleSport(sport.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    selected
                      ? "border-orange-500/50 bg-orange-50 text-foreground dark:border-orange-500/40 dark:bg-orange-500/10"
                      : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  {selected ? <Check className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" /> : null}
                  {sport.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dates */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="start-date" className="text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Start date <RequiredAsterisk />
            </Label>
            <input
              id="start-date"
              ref={startDateRef}
              type="date"
              min={toDateInput(new Date())}
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                setErrorField(null);
              }}
              className={cn(inputClassName, errorField === "startDate" && errorInputClassName)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="end-date" className="text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              End date <RequiredAsterisk />
            </Label>
            <input
              id="end-date"
              ref={endDateRef}
              type="date"
              min={startDate || toDateInput(new Date())}
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                setErrorField(null);
              }}
              className={cn(inputClassName, errorField === "endDate" && errorInputClassName)}
            />
          </div>
        </div>

        {/* Location */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="location" className="text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            Where would you like to go? <RequiredAsterisk />
          </Label>
          <input
            id="location"
            ref={locationRef}
            type="text"
            value={location}
            onChange={(event) => {
              setLocation(event.target.value);
              setErrorField(null);
            }}
            placeholder="e.g. Manali, Ladakh, Kashmir, Lahaul-Spiti"
            className={cn(inputClassName, errorField === "location" && errorInputClassName)}
          />
        </div>

        {/* Group size + budget */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="participants" className="text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Group size
            </Label>
            <input
              id="participants"
              type="number"
              min={1}
              max={200}
              value={participantCount}
              onChange={(event) => setParticipantCount(Number(event.target.value))}
              className={inputClassName}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="budget" className="text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" />
              Budget (₹, optional)
            </Label>
            <input
              id="budget"
              type="number"
              min={0}
              step={1000}
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              placeholder="e.g. 120000"
              className={inputClassName}
            />
          </div>
        </div>

        {/* Requirements */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="requirements" className="text-muted-foreground">
            <MessageSquareText className="h-3.5 w-3.5" />
            Anything else we should know?
          </Label>
          <textarea
            id="requirements"
            rows={4}
            value={requirements}
            onChange={(event) => setRequirements(event.target.value)}
            placeholder="Accommodation preferences, fitness levels, special requests…"
            className={`w-full resize-none rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 py-2.5 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-border/70 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              {CUSTOM_TRIP_GROUP_LABELS[groupType]}
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              {participantCount} {participantCount === 1 ? "person" : "people"}
            </Badge>
            {sports.length > 0 ? (
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {pluralize(sports.length, "sport")} selected
              </Badge>
            ) : null}
          </div>
          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" disabled={isPending} className="w-full rounded-xl bg-orange-700 text-white hover:bg-orange-800 sm:w-auto">
            {isPending ? "Sending request…" : "Send trip request"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}
