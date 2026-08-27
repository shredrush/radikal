import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminTripForm } from "@/components/admin/admin-trip-form";
import { AddTripForm } from "@/components/admin/add-trip-form";
import { type SlotItem } from "@/components/admin/admin-trip-slots";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export const dynamic = "force-dynamic";

const ACTIVITY_TYPE_OPTIONS = [
  { value: "TREK", label: "Hiking & Trekking" },
  { value: "BIKE", label: "Cycling" },
  { value: "SNOWBOARD", label: "Snowboarding" },
  { value: "SKI", label: "Skiing" },
  { value: "ROCKCLIMB", label: "Rock Climbing" },
  { value: "EXPEDITION", label: "Summit Expedition" },
  { value: "YOGA", label: "Yoga & Meditation" },
] as const;

const TRIP_CATEGORY_LABELS: Record<string, string> = {
  ADVENTURE_ENTHUSIAST: "Adventure Enthusiast",
  WOMEN_ONLY: "Women Only",
  CORPORATE: "Corporate",
  LUXURY: "Luxury",
  FAMILY: "For Family",
  COURSE: "Courses",
  SELF_GUIDED: "Self Guided",
  BEGINNER_FRIENDLY: "Beginner Friendly",
};

function getActivityTypeLabel(value: string) {
  return ACTIVITY_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

// Format the stored slot date in the server's local timezone, matching how the
// public trip pages render the same dates (see lib/trip-dates.ts).
function toSlotItem(slot: {
  id: string;
  date: Date;
  capacity: number;
  booked: number;
  reserved: number;
}): SlotItem {
  const date = new Date(slot.date);
  const pad = (value: number) => String(value).padStart(2, "0");
  const dateInput = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const dateLabel = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return {
    id: slot.id,
    dateInput,
    dateLabel,
    capacity: slot.capacity,
    booked: slot.booked,
    reserved: slot.reserved,
    spotsLeft: Math.max(0, slot.capacity - slot.booked - slot.reserved),
  };
}

export default async function AdminTripsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[] | undefined }>;
}) {
  const session = await requirePermission("trips.manage", "/login?callbackUrl=/admin/trips");
  const { type } = await searchParams;
  const selectedType = typeof type === "string" ? type : "";

  const [activities, guides] = await Promise.all([
    prisma.activity.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        guide: true,
        slots: { orderBy: { date: "asc" } },
        tripLocation: true,
        inclusions: { orderBy: { order: "asc" } },
        highlights: { orderBy: { order: "asc" } },
      },
    }),
    prisma.guide.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const totalUpcomingSlots = activities.reduce((count, activity) => count + activity.slots.length, 0);

  const visibleActivities = selectedType
    ? activities.filter((activity) => activity.type === selectedType)
    : activities;

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-8xl flex-col gap-8 px-6 py-10 sm:py-14 lg:px-10">
        <AdminPageHeader
          title="Manage Trips"
          description="Update the listed  trip details"
          active="trips"
          role={session.user.role}
        />

        <section className="min-w-0">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Trips live</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{activities.length}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Guides linked</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{guides.length}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Upcoming slots</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{totalUpcomingSlots}</p>
            </div>
          </div>
        </section>

        <AddTripForm guides={guides} />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-nowrap gap-1.5 overflow-x-auto">
            <Button
              variant={selectedType === "" ? "default" : "outline"}
              size="xs"
              className="rounded-full"
              nativeButton={false}
              render={<Link href="/admin/trips" />}
            >
              All
            </Button>
            {ACTIVITY_TYPE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={selectedType === option.value ? "default" : "outline"}
                size="xs"
                className="rounded-full"
                nativeButton={false}
                render={<Link href={`/admin/trips?type=${option.value}`} />}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {visibleActivities.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-border/80 bg-background/70 p-8 text-center text-sm text-muted-foreground">
            No trips match this sport type. Try another filter.
          </div>
        ) : (
        <div className="flex flex-col gap-6">
          {visibleActivities.map((activity) => (
            <Card key={activity.id} className="overflow-hidden border-border/70 bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)]">
              <CardHeader className="border-b border-border/70 bg-muted/20">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full border border-black/10 bg-black/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-foreground">
                        {getActivityTypeLabel(activity.type)}
                      </Badge>
                      <Badge variant="outline" className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                        {activity.location}
                      </Badge>
                      <Badge variant="outline" className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                        {activity.durationDays} day{activity.durationDays === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    <div>
                      <CardTitle className="text-xl">{activity.title}</CardTitle>
                      <CardDescription className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                        {activity.guide ? `Guide: ${activity.guide.name}` : "No guide linked yet"}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activity.categories.slice(0, 3).map((category) => (
                      <Badge key={category} variant="secondary" className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-foreground/80">
                        {TRIP_CATEGORY_LABELS[category] ?? category}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <AdminTripForm
                  activity={activity}
                  guides={guides}
                  slots={activity.slots.map(toSlotItem)}
                  supplemental={{
                    pickup: activity.tripLocation?.pickup ?? "",
                    drop: activity.tripLocation?.drop ?? "",
                    inclusions: activity.inclusions.filter(i => i.included).map(i => i.item),
                    exclusions: activity.inclusions.filter(i => !i.included).map(i => i.item),
                    highlights: activity.highlights.map(h => h.text),
                  }}
                />
              </CardContent>
            </Card>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
