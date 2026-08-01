import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getDifficultyLabel } from "@/lib/difficulty";
import { formatTripDateRange } from "@/lib/trip-dates";

const CATEGORY_LABELS: Record<string, string> = {
  ADVENTURE_ENTHUSIAST: "Adventure Enthusiast",
  WOMEN_ONLY: "Women Only",
  CORPORATE: "Corporate",
  LUXURY: "Luxury",
  FOR_FAMILY: "For Family",
  COURSES: "Courses",
  SELF_GUIDED: "Self Guided",
  BEGINNER_FRIENDLY: "Beginner Friendly",
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  SKI: "Ski",
  SNOWBOARD: "Snowboard",
  BIKE: "Bike",
  TREK: "Hiking and Trekking",
};

function getActivityTypeLabel(activity: { type: string; title: string; description: string; slug: string }) {
  if (activity.type === "TREK") {
    const haystack = [activity.title, activity.description, activity.slug]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (haystack.includes("climb") || haystack.includes("summit")) {
      return "Expedition";
    }
  }

  return ACTIVITY_TYPE_LABELS[activity.type] ?? activity.type;
}

function formatRupees(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  const activity = await prisma.activity.findUnique({
    where: { slug: tripId },
    include: {
      guide: {
        include: {
          certifications: true,
        },
      },
      slots: {
        where: {
          date: {
            gte: new Date(),
          },
        },
        orderBy: {
          date: "asc",
        },
      },
    },
  });

  if (!activity) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.08),_transparent_35%)]">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 sm:py-16">
        <div className="rounded-[2rem] border border-border/80 bg-background/90 p-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)] sm:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="flex flex-wrap gap-2">
                {activity.categories.map((category) => (
                  <span key={category} className="rounded-full border border-border/80 bg-muted px-3 py-1 text-sm text-muted-foreground">
                    {CATEGORY_LABELS[category] ?? category}
                  </span>
                ))}
              </div>
              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  {getActivityTypeLabel(activity)}
                </p>
                <h1 className="font-heading text-3xl font-semibold tracking-wide sm:text-4xl">
                  {activity.title}
                </h1>
                <p className="text-base leading-8 text-muted-foreground">
                  {activity.description}
                </p>
              </div>
            </div>
            <div className="rounded-[1.75rem] bg-gradient-to-br from-[#1d4ed8] to-[#0f172a] p-6 text-white shadow-[0_20px_60px_-35px_rgba(0,0,0,0.55)] sm:min-w-[280px]">
              <p className="text-sm uppercase tracking-[0.3em] text-white/70">Starting from</p>
              <p className="mt-3 font-heading text-3xl font-semibold">{formatRupees(activity.priceInRupees)}</p>
              <p className="mt-2 text-sm text-white/80">
                {activity.durationDays} {activity.durationDays === 1 ? "day" : "days"} • {activity.maxGroupSize} guests max
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  size="sm"
                  className="rounded-full"
                  nativeButton={false}
                  render={<Link href={`/booking/${activity.id}/checkout`} />}
                >
                  Book now
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20"
                  nativeButton={false}
                  render={<Link href="/trips" />}
                >
                  Back to trips
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
            <CardHeader>
              <CardTitle className="text-2xl">Trip details</CardTitle>
              <CardDescription>Everything you need to know before you go.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 text-sm leading-7 text-muted-foreground">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-muted/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Location</p>
                  <p className="mt-2 font-medium text-foreground">{activity.location}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Difficulty</p>
                  <p className="mt-2 font-medium text-foreground">{getDifficultyLabel(activity.difficulty)}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Group size</p>
                  <p className="mt-2 font-medium text-foreground">Up to {activity.maxGroupSize} travellers</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Custom</p>
                  <p className="mt-2 font-medium text-foreground">{activity.isCustom ? "Yes, tailored for your group" : "Standard departure"}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Available dates</p>
                {activity.slots.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {activity.slots.map((slot) => (
                      <li key={slot.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm">
                        <span className="font-medium text-foreground">
                          {formatTripDateRange(slot.date, activity.durationDays)}
                        </span>
                        <span className="text-muted-foreground">
                          {Math.max(slot.capacity - slot.booked, 0)} spots left
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 font-medium text-foreground">No upcoming dates are available yet.</p>
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Why travellers love this trip</h2>
                <p className="mt-2">{activity.description}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
            <CardHeader>
              <CardTitle className="text-2xl">Your guide</CardTitle>
              <CardDescription>Certified local experts with deep Himalayan knowledge.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 text-sm leading-7 text-muted-foreground">
              {activity.guide ? (
                <>
                  <div>
                    <p className="text-lg font-semibold text-foreground">{activity.guide.name}</p>
                    <p className="mt-1">{activity.guide.bio}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Base</p>
                    <p className="mt-2 font-medium text-foreground">{activity.guide.location}</p>
                    <p className="mt-1">{activity.guide.experienceYears} years of guiding experience</p>
                  </div>
                  {activity.guide.certifications.length > 0 ? (
                    <div>
                      <p className="text-sm font-semibold text-foreground">Certifications</p>
                      <ul className="mt-2 space-y-2">
                        {activity.guide.certifications.map((certification) => (
                          <li key={certification.id} className="rounded-xl border border-border/70 bg-background/70 px-3 py-2">
                            <p className="font-medium text-foreground">{certification.title}</p>
                            <p className="text-xs text-muted-foreground">{certification.issuingBody}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : (
                <p>No guide details are available for this trip yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
