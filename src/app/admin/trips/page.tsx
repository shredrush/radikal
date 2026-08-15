import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DeleteTripButton } from "@/components/admin/delete-trip-button";
import { AdminTripForm } from "@/components/admin/admin-trip-form";

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

const TRIP_CATEGORY_OPTIONS = [
  "ADVENTURE_ENTHUSIAST",
  "WOMEN_ONLY",
  "CORPORATE",
  "LUXURY",
  "FAMILY",
  "COURSE",
  "SELF_GUIDED",
  "BEGINNER_FRIENDLY",
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

export default async function AdminTripsPage() {
  await requireAdmin("/login?callbackUrl=/admin/trips");

  const [activities, guides] = await Promise.all([
    prisma.activity.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        guide: true,
        slots: true,
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
  const categoriesInUse = new Set(activities.flatMap((activity) => activity.categories)).size;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.08),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(249,115,22,0.08),_transparent_30%)]">
      <div className="mx-auto flex max-w-8xl flex-col gap-8 px-6 py-10 sm:py-14 lg:px-10">
        <header className="rounded-[2rem] border border-border/80 bg-background/90 p-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">Admin board</p>
              <h1 className="font-heading text-3xl font-semibold tracking-wide text-foreground sm:text-4xl">Trip management</h1>
              <p className="text-sm leading-7 text-muted-foreground">
                Update the live trips, guide assignments, categories, pricing, and image lists from one streamlined workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" className="rounded-full" nativeButton={false} render={<Link href="/admin/bookings" />}>
                View bookings
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" nativeButton={false} render={<Link href="/admin/guides" />}>
                Manage guides
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" nativeButton={false} render={<Link href="/profile" />}>
                Back to profile
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
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
        </header>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Trips catalog</h2>
            <p className="text-sm text-muted-foreground">{categoriesInUse} active travel-style categories across the catalog.</p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {activities.map((activity) => (
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
                <AdminTripForm activity={activity} guides={guides} supplemental={{
                    pickup: activity.tripLocation?.pickup ?? "",
                    drop: activity.tripLocation?.drop ?? "",
                    inclusions: activity.inclusions.filter(i => i.included).map(i => i.item),
                    exclusions: activity.inclusions.filter(i => !i.included).map(i => i.item),
                    highlights: activity.highlights.map(h => h.text),
                  }} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
