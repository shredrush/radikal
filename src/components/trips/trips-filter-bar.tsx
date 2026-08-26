"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { SPORT_FILTERS, TRAVEL_STYLE_FILTERS } from "@/components/trips/sport-filters";
import { SportIcon } from "@/components/trips/sport-icon";

type TripsFilterBarProps = {
  selectedSport: string[];
  selectedTravelStyle: string[];
  filteredCount: number;
  totalCount: number;
};

export function TripsFilterBar({
  selectedSport,
  filteredCount,
  totalCount,
}: TripsFilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSelectFilter = (key: "sport" | "travelStyle", value: string) => {
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

  const selectedTravelStyles = searchParams.getAll("travelStyle");
  const normalizedSelectedSports = selectedSport.map((sport) => (sport === "climb" ? "expedition" : sport));

  return (
    <div className="flex flex-col gap-3 rounded-[1.25rem] border border-orange-100 p-3 sm:p-4">
      <Button
        type="button"
        variant="outline"
        size="xs"
        className="h-7 w-[112px] self-start rounded-full border-orange-300 px-3 text-[10px] text-orange-700 hover:bg-orange-50"
        onClick={() => setIsOpen((value) => !value)}
      >
        {isOpen ? "Hide Filters" : "Show Filters"}
      </Button>

      {isOpen ? (
        <div className="flex flex-col gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-orange-700">Sport</p>
            <div className="grid grid-cols-4 gap-2.5">
              {SPORT_FILTERS.map((filter) => {
               const isActive = normalizedSelectedSports.includes(filter.id) || (filter.id === "all" && normalizedSelectedSports.length === 0);

                return (
                  <Button
                    key={filter.id}
                    type="button"
                    variant={isActive ? "default" : "outline"}
                    size="xs"
                    onClick={() => handleSelectFilter("sport", filter.id)}
                    className={
                      isActive
                        ? "h-auto min-h-7 w-full min-w-0 justify-start !whitespace-normal uppercase !tracking-normal px-2 py-1.5 text-left text-[10px] leading-4 bg-orange-100 text-orange-800 hover:bg-orange-100 hover:text-orange-800"
                        : "h-auto min-h-7 w-full min-w-0 justify-start !whitespace-normal uppercase !tracking-normal px-2 py-1.5 text-left text-[10px] leading-4 hover:border-orange-300 hover:bg-orange-100/60 hover:text-orange-800"
                    }
                  >
                    {filter.id !== "all" ? <SportIcon sport={filter.id} className="size-3.5" /> : null}
                    <span className="min-w-0 break-words whitespace-normal">{filter.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-700">Travel Style</p>
            <div className="grid grid-cols-4 gap-3.5">
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
                        ? "h-auto min-h-7 w-full min-w-0 justify-start !whitespace-normal uppercase !tracking-normal px-2 py-1.5 text-left text-[10px] leading-4 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-800"
                        : "h-auto min-h-7 w-full min-w-0 justify-start !whitespace-normal uppercase !tracking-normal px-2 py-1.5 text-left text-[10px] leading-4 hover:border-emerald-300 hover:bg-emerald-100/60 hover:text-emerald-800"
                    }
                  >
                    <span className="min-w-0 break-words whitespace-normal">{filter.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
