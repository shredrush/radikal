"use client";

import { useState, useTransition } from "react";
import { Briefcase, CalendarDays, MapPin, Users, Wallet } from "lucide-react";
import { toast } from "sonner";

import { setCustomTripStatusAction } from "@/lib/actions/custom-trips";
import {
  CUSTOM_TRIP_GROUP_LABELS,
  CUSTOM_TRIP_STATUS_LABELS,
  CUSTOM_TRIP_STATUS_STYLES,
  formatCustomTripDateRange,
  sportLabel,
  type CustomTripRequestDetail,
} from "@/lib/custom-trips";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CustomTripChatPanel } from "@/components/custom-trips/custom-trip-chat-panel";

const STATUS_OPTIONS = ["NEW", "IN_REVIEW", "QUOTED", "CONFIRMED", "CANCELLED"] as const;

export function CustomTripRequestDetailPanel({
  request,
}: {
  request: CustomTripRequestDetail;
}) {
  const [status, setStatus] = useState<string>(request.status);
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(nextStatus: string) {
    if (nextStatus === status) return;

    startTransition(async () => {
      try {
        await setCustomTripStatusAction(request.id, nextStatus as (typeof STATUS_OPTIONS)[number]);
        setStatus(nextStatus);
        toast.success(`Request marked as ${CUSTOM_TRIP_STATUS_LABELS[nextStatus] ?? nextStatus}.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not update status.";
        toast.error(message);
      }
    });
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-heading text-base font-semibold text-foreground">
              {request.customer.name}
              {request.customer.username ? ` (@${request.customer.username})` : ""}
            </p>
          </div>
          <p className="truncate text-sm text-muted-foreground">{request.customer.email}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5" />
            {CUSTOM_TRIP_GROUP_LABELS[request.groupType] ?? request.groupType}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Badge
            className={cn(
              "rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-widest",
              CUSTOM_TRIP_STATUS_STYLES[status] ?? CUSTOM_TRIP_STATUS_STYLES.NEW,
            )}
          >
            {CUSTOM_TRIP_STATUS_LABELS[status] ?? status}
          </Badge>
          <label className="sr-only" htmlFor="custom-trip-status">
            Status
          </label>
          <select
            id="custom-trip-status"
            value={status}
            disabled={isPending}
            onChange={(event) => handleStatusChange(event.target.value)}
            className="h-9 rounded-lg border border-border/70 bg-background/80 px-2 text-xs shadow-sm outline-none transition focus:border-black disabled:opacity-50"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {CUSTOM_TRIP_STATUS_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Requirements summary */}
      <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-foreground">Dates</p>
              <p className="text-muted-foreground">
                {formatCustomTripDateRange(request.startDate, request.endDate)}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-foreground">Location</p>
              <p className="text-muted-foreground">{request.location}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-foreground">Group size</p>
              <p className="text-muted-foreground">
                {request.participantCount}{" "}
                {request.participantCount === 1 ? "person" : "people"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-foreground">Budget</p>
              <p className="text-muted-foreground">
                {request.budgetRupees != null
                  ? `₹${request.budgetRupees.toLocaleString("en-IN")}`
                  : "Not specified"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {request.sports.map((sport) => (
            <Badge
              key={sport}
              variant="secondary"
              className="rounded-full border border-border/70 bg-background/80 px-2.5 py-0.5 text-[0.62rem]"
            >
              {sportLabel(sport)}
            </Badge>
          ))}
        </div>

        {request.requirements ? (
          <div className="mt-3 rounded-xl border border-border/60 bg-background/60 p-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Requirements
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {request.requirements}
            </p>
          </div>
        ) : null}
      </div>

      <CustomTripChatPanel
        requestId={request.id}
        role="support"
        messages={request.messages}
      />
    </div>
  );
}
