import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TripsFilterBar } from "@/components/trips/trips-filter-bar";
import {
  matchesDifficultyFilter,
  matchesSportFilter,
  matchesTravelStyleFilter,
  normalizeDifficultyFilter,
  normalizeSportFilter,
  normalizeTravelStyleFilter,
} from "@/components/trips/sport-filters";
import { getDifficultyLabel } from "@/lib/difficulty";

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

function formatRupees(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string | string[] | undefined; difficulty?: string | string[] | undefined; travelStyle?: string | string[] | undefined }>;
}) {
  const { sport, difficulty, travelStyle } = await searchParams;
  const selectedSport = normalizeSportFilter(sport);
  const selectedDifficulty = normalizeDifficultyFilter(difficulty);
  const selectedTravelStyle = normalizeTravelStyleFilter(travelStyle);

  const activities = await prisma.activity.findMany({
    include: { guide: true },
    orderBy: { createdAt: "asc" },
  });

  const filteredActivities = activities.filter(
    (activity) =>
      matchesSportFilter(activity, selectedSport) &&
      matchesDifficultyFilter(activity, selectedDifficulty) &&
      matchesTravelStyleFilter(activity, selectedTravelStyle),
  );

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.08),_transparent_35%)]">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 sm:py-16">
        <TripsFilterBar
          selectedSport={selectedSport}
          selectedDifficulty={selectedDifficulty}
          selectedTravelStyle={selectedTravelStyle}
          filteredCount={filteredActivities.length}
          totalCount={activities.length}
        />

        {filteredActivities.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-border/80 bg-background/70 p-8 text-center text-sm text-muted-foreground">
            No trips match this sport yet. Try another filter.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {filteredActivities.map((activity) => (
              <Card
                key={activity.id}
                className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.35)]"
              >
                <div className="h-1.5 bg-gradient-to-r from-[#1d4ed8] via-[#f59e0b] to-[#38bdf8]" />
                <CardHeader className="gap-4">
                  <div className="flex flex-wrap gap-1.5">
                    {activity.categories.map((category) => (
                      <Badge key={category} variant="secondary" className="rounded-full">
                        {CATEGORY_LABELS[category] ?? category}
                      </Badge>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-xl">{activity.title}</CardTitle>
                    <CardDescription>
                      {activity.location}
                      {activity.guide ? ` · Guided by ${activity.guide.name}` : null}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-sm leading-7 text-muted-foreground">
                    {activity.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="rounded-full border border-border px-3 py-1">
                      {activity.durationDays} {activity.durationDays === 1 ? "day" : "days"}
                    </span>
                    <span className="rounded-full border border-border px-3 py-1 capitalize">
                      {getDifficultyLabel(activity.difficulty)}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-5">
                  <span className="font-heading text-xl font-semibold">
                    {formatRupees(activity.priceInRupees)}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={<Link href={`/trips/${activity.slug}`} />}
                    >
                      View details
                    </Button>
                    <Button
                      size="sm"
                      nativeButton={false}
                      render={<Link href={`/booking/${activity.id}/checkout`} />}
                    >
                      Book now
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
