import { CheckCircle2, Clock3, Compass, XCircle } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { GuideTripForm, type GuideTripData } from "@/components/guides/guide-trip-form";
import { GuideTripSlotsToggle } from "@/components/guides/guide-trip-slots-toggle";
import type { SlotItem } from "@/components/admin/admin-trip-slots";

function toGuideTripData(activity: {
  id: string;
  title: string;
  type: string;
  location: string;
  description: string;
  priceInRupees: number;
  durationDays: number;
  maxGroupSize: number;
  categories: string[];
  images: string[];
  tripLocation: { pickup: string; drop: string } | null;
  inclusions: Array<{ included: boolean; item: string }>;
  highlights: Array<{ text: string }>;
}): GuideTripData {
  return {
    id: activity.id,
    title: activity.title,
    type: activity.type,
    location: activity.location,
    description: activity.description,
    priceInRupees: activity.priceInRupees,
    durationDays: activity.durationDays,
    maxGroupSize: activity.maxGroupSize,
    categories: activity.categories,
    images: activity.images,
    pickup: activity.tripLocation?.pickup ?? "",
    drop: activity.tripLocation?.drop ?? "",
    inclusions: activity.inclusions.filter((i) => i.included).map((i) => i.item),
    exclusions: activity.inclusions.filter((i) => !i.included).map((i) => i.item),
    highlights: activity.highlights.map((h) => h.text),
  };
}

function toSlotItem(slot: { id: string; date: Date; capacity: number; booked: number; reserved: number }): SlotItem {
  const date = new Date(slot.date);
  const pad = (value: number) => String(value).padStart(2, "0");

  return {
    id: slot.id,
    dateInput: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    dateLabel: date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    capacity: slot.capacity,
    booked: slot.booked,
    reserved: slot.reserved,
    spotsLeft: Math.max(0, slot.capacity - slot.booked - slot.reserved),
  };
}

export async function GuideTripsManager({ guideId }: { guideId: string }) {
  const [activities, pendingChanges] = await Promise.all([
    prisma.activity.findMany({
      where: { guideId },
      orderBy: { createdAt: "asc" },
      include: {
        tripLocation: true,
        inclusions: { orderBy: { order: "asc" } },
        highlights: { orderBy: { order: "asc" } },
        slots: { orderBy: { date: "asc" } },
      },
    }),
    prisma.tripChangeRequest.findMany({
      where: { guideId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const pending = pendingChanges.filter((change) => change.status === "PENDING");

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-lg font-semibold tracking-wide text-foreground">
              Your trips
            </h3>
            <p className="text-sm text-muted-foreground">
              Add a new trip or edit an existing one. Changes go live after staff review.
            </p>
          </div>
          <GuideTripForm guideId={guideId} />
        </div>

        {activities.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-[1.25rem] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
            <Compass className="h-8 w-8 text-muted-foreground/50" />
            <div>
              <p className="font-medium text-foreground">No trips yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first trip above — it will be reviewed by our team before going live.
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {activities.map((activity) => {
              const data = toGuideTripData(activity);
              return (
                <li key={activity.id} className="rounded-[1.25rem] border border-border/70 bg-background/95 p-4 shadow-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{activity.title}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {activity.location} · {activity.durationDays} day{activity.durationDays === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-col items-end gap-3">
                    <GuideTripForm guideId={guideId} activity={data} />
                    <GuideTripSlotsToggle
                      activityId={activity.id}
                      slots={activity.slots.map(toSlotItem)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="font-heading text-lg font-semibold tracking-wide text-foreground">
          Pending review
        </h3>

        {pending.length === 0 ? (
          <p className="rounded-[1.25rem] border border-dashed border-border/80 bg-muted/20 px-6 py-8 text-center text-sm text-muted-foreground">
            No changes waiting for review.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((change) => {
              const proposed = change.proposed as { title?: string };
              return (
                <li
                  key={change.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-amber-500/30 bg-amber-500/5 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Clock3 className="h-4 w-4 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {proposed?.title ?? "Untitled trip"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {change.type === "CREATE" ? "New trip" : "Trip edit"} awaiting approval
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="rounded-full border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-600">
                    Pending
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="font-heading text-lg font-semibold tracking-wide text-foreground">
          Review history
        </h3>

        {pendingChanges.filter((change) => change.status !== "PENDING").length === 0 ? (
          <p className="rounded-[1.25rem] border border-dashed border-border/80 bg-muted/20 px-6 py-8 text-center text-sm text-muted-foreground">
            No reviewed changes yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pendingChanges
              .filter((change) => change.status !== "PENDING")
              .map((change) => {
                const proposed = change.proposed as { title?: string };
                const approved = change.status === "APPROVED";
                return (
                  <li
                    key={change.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-border/70 bg-background/95 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      {approved ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {proposed?.title ?? "Untitled trip"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {change.type === "CREATE" ? "New trip" : "Trip edit"} ·{" "}
                          {approved ? "Approved" : "Rejected"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        approved
                          ? "rounded-full border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-600"
                          : "rounded-full border-destructive/40 bg-destructive/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-destructive"
                      }
                    >
                      {approved ? "Approved" : "Rejected"}
                    </Badge>
                  </li>
                );
              })}
          </ul>
        )}
      </section>
    </div>
  );
}
