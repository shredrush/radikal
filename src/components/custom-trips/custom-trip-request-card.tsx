import Link from "next/link";
import { CalendarDays, Compass, MessageSquare, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  CUSTOM_TRIP_GROUP_LABELS,
  CUSTOM_TRIP_STATUS_LABELS,
  CUSTOM_TRIP_STATUS_STYLES,
  formatCustomTripDateRange,
  sportLabel,
  type CustomTripRequestListItem,
} from "@/lib/custom-trips";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/currency/price";

export function CustomTripRequestCard({
  request,
}: {
  request: CustomTripRequestListItem;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[1.2rem] border border-border/70 bg-muted/20 p-5 transition-colors hover:border-border sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={cn(
              "rounded-full border px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-widest",
              CUSTOM_TRIP_STATUS_STYLES[request.status] ?? CUSTOM_TRIP_STATUS_STYLES.NEW,
            )}
          >
            {CUSTOM_TRIP_STATUS_LABELS[request.status] ?? request.status}
          </Badge>
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {CUSTOM_TRIP_GROUP_LABELS[request.groupType] ?? request.groupType}
          </span>
        </div>

        <h3 className="font-heading text-base font-semibold tracking-wide text-foreground">
          Custom trip · {request.location || "Flexible location"}
        </h3>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatCustomTripDateRange(request.startDate, request.endDate)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {request.participantCount} traveller{request.participantCount === 1 ? "" : "s"}
          </span>
          {request.budgetRupees != null ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="font-medium text-foreground">Budget</span>
              <Price amount={request.budgetRupees} />
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {request.sports.map((sport) => (
            <span
              key={sport}
              className="rounded-full border border-border/70 bg-background px-2 py-0.5 text-[0.65rem] text-muted-foreground"
            >
              {sportLabel(sport)}
            </span>
          ))}
        </div>
      </div>

      <Link
        href={`/custom-trip/${request.id}`}
        className="inline-flex shrink-0 items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
      >
        <MessageSquare className="h-4 w-4" />
        View & chat
      </Link>
    </div>
  );
}

export function CustomTripRequestEmpty() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[1.2rem] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
      <Compass className="h-8 w-8 text-muted-foreground/50" />
      <div>
        <p className="font-medium text-foreground">No custom trips yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Plan a private group or corporate trip on your own dates and sports.
        </p>
      </div>
      <Link
        href="/custom-trip"
        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        <Compass className="h-4 w-4" />
        Plan a custom trip
      </Link>
    </div>
  );
}
