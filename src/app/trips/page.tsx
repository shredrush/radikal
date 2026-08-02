import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TripsFilterBar } from "@/components/trips/trips-filter-bar";
import {
  matchesDifficultyFilter,
  matchesSportFilter,
  matchesTravelStyleFilter,
  normalizeDifficultyFilter,
  normalizeSportFilter,
  normalizeTravelStyleFilter,
} from "@/components/trips/sport-filters";
import { getTripCardImage } from "@/lib/trip-card-image";
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

function normalizeLocationFilter(value: string | string[] | null | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.filter((item): item is string => Boolean(item));
}

function isDateWithinRange(slotDate: Date, startDate: string | null, endDate: string | null) {
  const normalizedSlotDate = new Date(slotDate);
  normalizedSlotDate.setHours(0, 0, 0, 0);

  if (startDate) {
    const normalizedStartDate = new Date(`${startDate}T00:00:00`);
    if (normalizedSlotDate < normalizedStartDate) {
      return false;
    }
  }

  if (endDate) {
    const normalizedEndDate = new Date(`${endDate}T00:00:00`);
    if (normalizedSlotDate > normalizedEndDate) {
      return false;
    }
  }

  return true;
}

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{
    sport?: string | string[] | undefined;
    difficulty?: string | string[] | undefined;
    travelStyle?: string | string[] | undefined;
    location?: string | string[] | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
  }>;
}) {
  const { sport, difficulty, travelStyle, location, startDate, endDate } = await searchParams;
  const selectedSport = normalizeSportFilter(sport);
  const selectedDifficulty = normalizeDifficultyFilter(difficulty);
  const selectedTravelStyle = normalizeTravelStyleFilter(travelStyle);
  const selectedLocation = normalizeLocationFilter(location);

  const activities = await prisma.activity.findMany({
    include: { guide: true, slots: true },
    orderBy: { createdAt: "asc" },
  });

  const filteredActivities = activities.filter((activity) => {
    const locationMatch =
      selectedLocation.length === 0 || selectedLocation.some((locationValue) => activity.location.toLowerCase().includes(locationValue.toLowerCase()));

    const dateMatch =
      !startDate && !endDate
        ? true
        : activity.slots.some((slot) => isDateWithinRange(slot.date, startDate ?? null, endDate ?? null));

    return (
      locationMatch &&
      dateMatch &&
      matchesSportFilter(activity, selectedSport) &&
      matchesDifficultyFilter(activity, selectedDifficulty) &&
      matchesTravelStyleFilter(activity, selectedTravelStyle)
    );
  });

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
          <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
            {filteredActivities.map((activity) => (
             <Link key={activity.id} href={`/trips/${activity.slug}`} className="block">
               <Card className="flex h-full min-h-[720px] flex-col overflow-hidden rounded-[1.25rem] border-0 bg-background/95 py-0 gap-0 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.3)] transition-transform duration-200 hover:-translate-y-1">
                 <div
                   className="relative -m-[1px] flex-[0_0_60%] min-h-[440px] bg-muted/60"
                   style={{
                     backgroundImage: `url(${getTripCardImage(activity)})`,
                     backgroundSize: "cover",
                     backgroundPosition: "center",
                   }}
                 >
                   <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                 </div>
                 <div className="flex flex-1 flex-col justify-between gap-1 p-5">
                   <div className="space-y-2">
                     <div className="space-y-1.5">
                       <h3 className="text-lg font-semibold tracking-tight text-foreground">{activity.title}</h3>
                       <p className="text-sm leading-6 text-muted-foreground">
                         {activity.location}
                         {activity.guide ? ` · Guided by ${activity.guide.name}` : null}
                       </p>
                     </div>
                     <div className="flex flex-wrap gap-1.5">
                       <span className="rounded-full border border-border/70 bg-background/80 px-2 py-1 text-[0.65rem] font-medium text-foreground/80">
                         {activity.location}
                       </span>
                       <span className="rounded-full border border-border/70 bg-background/80 px-2 py-1 text-[0.65rem] font-medium text-foreground/80">
                         {activity.durationDays} {activity.durationDays === 1 ? "day" : "days"}
                       </span>
                       {activity.categories.map((category) => (
                         <Badge key={category} variant="secondary" className="rounded-full border border-border/70 bg-background/80 px-2 py-1 text-[0.65rem] font-medium text-foreground/80">
                           {CATEGORY_LABELS[category] ?? category}
                         </Badge>
                       ))}
                     </div>
                   </div>
                   <div className="flex items-center justify-between border-t border-border/70 pt-2">
                     <span className="text-sm font-medium text-muted-foreground">From</span>
                     <span className="font-heading text-lg font-semibold text-foreground">
                       {formatRupees(activity.priceInRupees)}
                     </span>
                   </div>
                 </div>
               </Card>
             </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
