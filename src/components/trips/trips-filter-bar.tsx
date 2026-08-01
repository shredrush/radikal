"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DIFFICULTY_FILTERS, SPORT_FILTERS, TRAVEL_STYLE_FILTERS } from "@/components/trips/sport-filters";

type TripsFilterBarProps = {
  selectedSport: string[];
  selectedDifficulty: string[];
  selectedTravelStyle: string[];
  filteredCount: number;
  totalCount: number;
};

export function TripsFilterBar({
  selectedSport,
  selectedDifficulty,
  selectedTravelStyle,
  filteredCount,
  totalCount,
}: TripsFilterBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSelectFilter = (key: "sport" | "difficulty" | "travelStyle", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentValues = params.getAll(key);

    if (value === "all") {
      params.delete(key);
    } else if (currentValues.includes(value)) {
      const remainingValues = currentValues.filter((item) => item !== value);
      params.delete(key);
      remainingValues.forEach((item) => params.append(key, item));
    } else {
      params.append(key, value);
    }

    const nextQuery = params.toString();
    const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname;

    router.push(nextHref, { scroll: false });
  };

  const selectedSports = searchParams.getAll("sport");
  const selectedDifficulties = searchParams.getAll("difficulty");
  const selectedTravelStyles = searchParams.getAll("travelStyle");

  return (
    <div className="flex flex-col gap-3 rounded-[1.25rem] border border-border/60 bg-background/70 p-3 sm:p-4">
      <div className="flex flex-col gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Sport</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {SPORT_FILTERS.map((filter) => {
              const isActive = selectedSports.includes(filter.id) || (filter.id === "all" && selectedSports.length === 0);

              return (
                <Button
                  key={filter.id}
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  size="xs"
                  onClick={() => handleSelectFilter("sport", filter.id)}
                  className={
                    isActive
                      ? "h-7 bg-[#1d4ed8] px-2.5 text-[10px] text-white hover:bg-[#1e40af]"
                      : "h-7 px-2.5 text-[10px]"
                  }
                >
                  {filter.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Travel Style</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {TRAVEL_STYLE_FILTERS.map((filter) => {
              const isActive = selectedTravelStyles.includes(filter.id) || (filter.id === "all" && selectedTravelStyles.length === 0);

              return (
                <Button
                  key={filter.id}
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  size="xs"
                  onClick={() => handleSelectFilter("travelStyle", filter.id)}
                  className={
                    isActive
                      ? "h-7 bg-[#1d4ed8] px-2.5 text-[10px] text-white hover:bg-[#1e40af]"
                      : "h-7 px-2.5 text-[10px]"
                  }
                >
                  {filter.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Difficulty</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {DIFFICULTY_FILTERS.map((filter) => {
              const isActive = selectedDifficulties.includes(filter.id) || (filter.id === "all" && selectedDifficulties.length === 0);

              return (
                <Button
                  key={filter.id}
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  size="xs"
                  onClick={() => handleSelectFilter("difficulty", filter.id)}
                  className={isActive ? "bg-[#1d4ed8] text-white hover:bg-[#1e40af]" : "text-[10px]"}
                >
                  {filter.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filteredCount} of {totalCount} trips
      </p>
    </div>
  );
}
