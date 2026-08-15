"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, MapPin, Search, Sparkles, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTripCardImage, getTripCardImagePosition } from "@/lib/trip-card-image";

const CATEGORY_LABELS: Record<string, string> = {
  ADVENTURE_ENTHUSIAST: "Adventure Enthusiast",
  WOMEN_ONLY: "Women Only",
  CORPORATE: "Corporate",
  LUXURY: "Luxury",
  FAMILY: "For Family",
  COURSE: "Courses",
  SELF_GUIDED: "Self Guided",
  BEGINNER_FRIENDLY: "Beginner Friendly",
};

type ActivityCardItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  location: string;
  priceInRupees: number;
  durationDays: number;
  categories: string[];
  images?: string[];
  type?: string;
  guide: { name: string } | null;
};

type FilterPanel = "what" | "when" | "where" | "who" | null;

const SPORT_OPTIONS = [
  { id: "winter", label: "Snowboard and Ski" },
  { id: "bike", label: "Cycling" },
  { id: "trek", label: "Hiking and Trekking" },
  { id: "expedition", label: "Summit Expedition" },
  { id: "rockclimb", label: "Rock Climbing" },
  { id: "yoga", label: "Yoga and Meditation" },
] as const;

const TRAVEL_STYLE_OPTIONS = [
  { id: "beginner-friendly", label: "Beginner Friendly" },
  { id: "women-only", label: "Women Only" },
  { id: "family", label: "For Family" },
  { id: "adventure-enthusiast", label: "Adventure Enthusiast" },
  { id: "course", label: "Courses" },
  { id: "self-guided", label: "Self Guided" },
] as const;

function formatDateForDisplay(value: string) {
  if (!value) {
    return "";
  }

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function getCalendarDays(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingDays = (firstDay.getDay() + 6) % 7;
  const cells: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  for (let index = 0; index < leadingDays; index += 1) {
    const date = new Date(year, month, -leadingDays + index + 1);
    cells.push({ date, isCurrentMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(year, month, day), isCurrentMonth: true });
  }

  while (cells.length % 7 !== 0) {
    const nextDay = cells.length - (daysInMonth + leadingDays) + 1;
    cells.push({ date: new Date(year, month + 1, nextDay), isCurrentMonth: false });
  }

  return cells;
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function isWithinRange(day: Date, startDate: string, endDate: string) {
  if (!startDate || !endDate) {
    return false;
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  return day >= start && day <= end;
}

function matchesSportSelection(activity: ActivityCardItem, sportId: string) {
  switch (sportId) {
    case "winter":
      return activity.type === "SKI" || activity.type === "SNOWBOARD";
    case "bike":
      return activity.type === "BIKE";
    case "trek":
      return activity.type === "TREK";
    case "expedition":
      return activity.type === "EXPEDITION";
    case "rockclimb":
      return activity.type === "ROCKCLIMB";
    case "yoga":
      return activity.type === "YOGA";
    default:
      return true;
  }
}

function matchesTravelStyleSelection(activity: ActivityCardItem, styleId: string) {
  switch (styleId) {
    case "beginner-friendly":
      return activity.categories.includes("BEGINNER_FRIENDLY");
    case "women-only":
      return activity.categories.includes("WOMEN_ONLY");
    case "family":
      return activity.categories.includes("FAMILY");
    case "adventure-enthusiast":
      return activity.categories.includes("ADVENTURE_ENTHUSIAST");
    case "course":
      return activity.categories.includes("COURSE");
    case "self-guided":
      return activity.categories.includes("SELF_GUIDED");
    default:
      return false;
  }
}

function prioritizeFeaturedActivities(activities: ActivityCardItem[], featuredTripSlugs: readonly string[]) {
  const featuredRank = new Map(featuredTripSlugs.map((slug, index) => [slug, index]));

  return activities
    .map((activity, index) => ({ activity, index }))
    .sort((left, right) => {
      const leftRank = featuredRank.get(left.activity.slug);
      const rightRank = featuredRank.get(right.activity.slug);

      if (leftRank === undefined && rightRank === undefined) {
        return left.index - right.index;
      }

      if (leftRank === undefined) {
        return 1;
      }

      if (rightRank === undefined) {
        return -1;
      }

      return leftRank - rightRank;
    })
    .map(({ activity }) => activity);
}

export function SearchableTrips({ activities, featuredTripSlugs = [] }: { activities: ActivityCardItem[]; featuredTripSlugs?: readonly string[] }) {
  const router = useRouter();
  const [activePanel, setActivePanel] = useState<FilterPanel>(null);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedTravelStyles, setSelectedTravelStyles] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [displayMonth, setDisplayMonth] = useState(() => new Date());

  const locationOptions = useMemo(() => {
    return Array.from(new Set(activities.map((activity) => activity.location).filter(Boolean))).sort();
  }, [activities]);

  const rankedActivities = useMemo(() => prioritizeFeaturedActivities(activities, featuredTripSlugs), [activities, featuredTripSlugs]);

  const filteredActivities = useMemo(() => {
    const hasActiveFilters = selectedSports.length > 0 || selectedLocations.length > 0 || selectedTravelStyles.length > 0 || startDate || endDate;

    if (!hasActiveFilters) {
      return rankedActivities.slice(0, 4);
    }

    return rankedActivities.filter((activity) => {
      const sportMatch = selectedSports.length === 0 || selectedSports.some((sportId) => matchesSportSelection(activity, sportId));
      const locationMatch =
        selectedLocations.length === 0 || selectedLocations.some((location) => activity.location.toLowerCase().includes(location.toLowerCase()));
      const travelStyleMatch =
        selectedTravelStyles.length === 0 || selectedTravelStyles.some((style) => matchesTravelStyleSelection(activity, style));
      const dateMatch = true;

      return sportMatch && locationMatch && travelStyleMatch && dateMatch;
    }).slice(0, 4);
  }, [endDate, rankedActivities, selectedLocations, selectedSports, selectedTravelStyles, startDate]);

  const hasActiveFilters = selectedSports.length > 0 || selectedLocations.length > 0 || selectedTravelStyles.length > 0 || startDate || endDate;
  const visibleActivities = filteredActivities;

  const toggleSelection = (value: string, current: string[], setter: (next: string[]) => void) => {
    if (current.includes(value)) {
      setter(current.filter((item) => item !== value));
      return;
    }

    setter([...current, value]);
  };

  const handleSearch = () => {
    const params = new URLSearchParams();

    selectedSports.forEach((sport) => params.append("sport", sport));
    selectedLocations.forEach((location) => params.append("location", location));
    selectedTravelStyles.forEach((travelStyle) => params.append("travelStyle", travelStyle));

    if (startDate) {
      params.set("startDate", startDate);
    }

    if (endDate) {
      params.set("endDate", endDate);
    }

    router.push(`/trips${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleDateSelection = (selectedDate: string) => {
    if (!selectedDate) {
      return;
    }

    const nextSelection = new Date(`${selectedDate}T00:00:00`);

    if (!startDate || (startDate && endDate)) {
      setStartDate(selectedDate);
      setEndDate("");
      setDisplayMonth(nextSelection);
      return;
    }

    const currentStart = new Date(`${startDate}T00:00:00`);

    if (nextSelection < currentStart) {
      setStartDate(selectedDate);
      setEndDate("");
      setDisplayMonth(nextSelection);
      return;
    }

    if (nextSelection.getTime() === currentStart.getTime()) {
      setEndDate(selectedDate);
      setDisplayMonth(nextSelection);
      return;
    }

    setEndDate(selectedDate);
    setDisplayMonth(nextSelection);
  };

  const getPanelSummary = (panel: FilterPanel) => {
    switch (panel) {
      case "what":
        return selectedSports.length > 0 ? selectedSports.map((sportId) => SPORT_OPTIONS.find((sport) => sport.id === sportId)?.label ?? sportId).join(", ") : "All sports";
      case "when":
        if (startDate && endDate) {
          return `${formatDateForDisplay(startDate)} → ${formatDateForDisplay(endDate)}`;
        }
        if (startDate) {
          return `From ${formatDateForDisplay(startDate)}`;
        }
        if (endDate) {
          return `Until ${formatDateForDisplay(endDate)}`;
        }
        return "Any dates";
      case "where":
        return selectedLocations.length > 0 ? selectedLocations.join(", ") : "Any location";
      case "who":
        return selectedTravelStyles.length > 0
          ? selectedTravelStyles.map((styleId) => TRAVEL_STYLE_OPTIONS.find((style) => style.id === styleId)?.label ?? styleId).join(", ")
          : "Any travel style";
      default:
        return "";
    }
  };

  const guideProfiles = [
    {
      id: "tashi",
      name: "Tashi Norbu",
      region: "Lahaul & Spiti",
      certifications: ["IMF Certified", "Avalanche Safety"],
      image:
        "https://images.unsplash.com/photo-1599405653894-8a595f692abf?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "meera",
      name: "Meera Rawat",
      region: "Kashmir",
      certifications: ["Women Leadership", "First Aid"],
      image:
        "https://images.unsplash.com/photo-1661892526325-813afd121a4e?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "tenzin",
      name: "Tenzin Namgyal",
      region: "Ladakh",
      certifications: ["IMF Certified", "Mountain Rescue"],
      image:
        "https://images.unsplash.com/photo-1601224748193-d24f166b5c77?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "nawang",
      name: "Nawang Dolma",
      region: "Arunachal Pradesh",
      certifications: ["Yoga Instructor"],
      image:
        "https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "pema",
      name: "Pema Chhoden",
      region: "Sikkim",
      certifications: ["High Altitude Trekking", "First Aid"],
      image:
        "https://images.unsplash.com/photo-1548789997-82da68437ad8?w=900?auto=format&fit=crop&w=400&q=80",
    },
  ];

  const testimonials = [
    {
      name: "Riya S.",
      trip: "Snowboarding Escape in Gulmarg",
      quote:
        "Every detail felt effortless. The guide was calm, knowledgeable, and made our first snowboarding experience unforgettable.",
      image:
        "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Arjun M.",
      trip: "Ladakh Cycling Adventure",
      quote:
        "The route, pacing, and support were incredible. It felt adventurous without losing comfort or safety.",
      image:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Naina K.",
      trip: "Women-only Trek in Kashmir",
      quote:
        "The whole experience was empowering and beautifully organized. We felt taken care of from start to finish.",
      image:
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Vikram T.",
      trip: "Expedition in the Zanskar Range",
      quote:
        "The crew made difficult terrain feel doable, and every summit push was supported by clear planning and calm leadership.",
      image:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
    },
  ];

  return (
    <section
      id="upcoming-trips"
      className="mx-auto flex w-full max-w-none flex-col gap-8 bg-white px-4 py-10 sm:px-6 sm:py-16 lg:px-10"
    >
      <div className="-mt-3 mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-1 sm:-mt-4">
        <h3 className="font-heading text-2xl font-semibold tracking-wide text-foreground sm:text-3xl">
          Adventure, Reimagined
        </h3>
        <p className="text-lg text-muted-foreground">
          Small groups, led by certified experts
        </p>
        <div className="mt-1 flex w-full max-w-6xl flex-col gap-2 p-1 sm:mt-2 sm:p-2">
          <div className="flex flex-wrap items-stretch gap-1.5 sm:gap-2">
            {[
              { id: "what", label: "What", icon: Sparkles, description: getPanelSummary("what") },
              { id: "when", label: "When", icon: CalendarDays, description: getPanelSummary("when") },
              { id: "where", label: "Where", icon: MapPin, description: getPanelSummary("where") },
              { id: "who", label: "Who", icon: Users, description: getPanelSummary("who") },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activePanel === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActivePanel(isActive ? null : (item.id as FilterPanel))}
                  className={`flex min-w-[calc(50%-0.375rem)] flex-1 flex-col items-start gap-0.5 rounded-[0.9rem] border px-1.5 py-1.25 text-left transition sm:min-w-0 sm:flex-[1_1_0%] sm:px-2.5 sm:py-1.5 ${
                    isActive ? "border-black bg-black/10 shadow-sm" : "border-border/70 bg-background/80 hover:border-black/30"
                  }`}
                >
                  <span className="flex items-center gap-1 text-[0.72rem] font-semibold text-foreground sm:text-sm">
                    <Icon className="size-3 shrink-0 text-foreground sm:size-3.5" />
                    {item.label}
                  </span>
                  <span className="hidden text-[0.65rem] text-muted-foreground sm:block sm:text-xs">{item.description}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={handleSearch}
              className="flex min-w-[calc(50%-0.375rem)] flex-1 items-center justify-center gap-1 rounded-[0.9rem] border border-black bg-background/95 px-1.25 py-1 text-foreground transition hover:bg-black/5 sm:min-w-0 sm:flex-[0_0_auto] sm:px-2 sm:py-1.5"
            >
              <Search className="size-3.5 shrink-0 sm:size-4" />
              <span className="text-[0.72rem] font-semibold sm:text-xs">Search</span>
            </button>
          </div>

          {activePanel ? (
            <div className="rounded-[1.25rem] p-4">
              {activePanel === "what" ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Choose one or more sports</p>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {SPORT_OPTIONS.map((sport) => {
                      const isSelected = selectedSports.includes(sport.id);

                      return (
                        <button
                          key={sport.id}
                          type="button"
                          onClick={() => toggleSelection(sport.id, selectedSports, setSelectedSports)}
                          className={`flex w-full min-w-0 items-start gap-2 rounded-2xl border px-3 py-2 text-left text-sm transition ${
                            isSelected ? "border-black bg-black text-white" : "border-border/70 bg-background text-foreground"
                          }`}
                        >
                          {isSelected ? <Check className="size-3.5" /> : null}
                          <span className="min-w-0 break-words whitespace-normal leading-5">{sport.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {activePanel === "when" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Select a date range</p>
                      <p className="text-sm text-muted-foreground">
                        Pick a start date, then choose an end date to tailor your trip search.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate("");
                        setEndDate("");
                        setDisplayMonth(new Date());
                      }}
                      className="text-sm font-medium text-foreground transition hover:text-black"
                    >
                      Clear dates
                    </button>
                  </div>

                  <div className="mx-auto w-full max-w-[18rem] rounded-[1rem] border border-border/70 bg-background/70 p-2.5 sm:max-w-[16rem]">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, 1))}
                        className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        aria-label="Previous month"
                      >
                        <ChevronLeft className="size-3.5" />
                      </button>
                      <p className="text-xs font-semibold text-foreground">
                        {displayMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                      </p>
                      <button
                        type="button"
                        onClick={() => setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1))}
                        className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        aria-label="Next month"
                      >
                        <ChevronRight className="size-3.5" />
                      </button>
                    </div>

                    <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                        <div key={day} className="py-1">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="mt-1 grid grid-cols-7 gap-1">
                      {getCalendarDays(displayMonth).map((cell, index) => {
                        const dateValue = `${cell.date.getFullYear()}-${String(cell.date.getMonth() + 1).padStart(2, "0")}-${String(cell.date.getDate()).padStart(2, "0")}`;
                        const isSelected = startDate && endDate
                          ? isSameDay(cell.date, new Date(`${startDate}T00:00:00`)) || isSameDay(cell.date, new Date(`${endDate}T00:00:00`))
                          : startDate
                            ? isSameDay(cell.date, new Date(`${startDate}T00:00:00`))
                            : false;
                        const isInRange = startDate && endDate ? isWithinRange(cell.date, startDate, endDate) : false;

                        return (
                          <button
                            key={`${dateValue}-${index}`}
                            type="button"
                            onClick={() => handleDateSelection(dateValue)}
                            className={`flex h-8 items-center justify-center rounded-full text-xs transition ${
                              cell.isCurrentMonth ? "text-foreground" : "text-muted-foreground/70"
                            } ${isSelected ? "bg-black text-white" : isInRange ? "bg-black/10 text-foreground" : "hover:bg-muted"}`}
                          >
                            {cell.date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {startDate ? (
                      <span className="rounded-full border border-black/10 bg-black/5 px-3 py-1 text-sm font-medium text-foreground">
                        From {formatDateForDisplay(startDate)}
                      </span>
                    ) : null}
                    {endDate ? (
                      <span className="rounded-full border border-black/10 bg-black/5 px-3 py-1 text-sm font-medium text-foreground">
                        To {formatDateForDisplay(endDate)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {activePanel === "where" ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Choose one or more destinations</p>
                  <div className="flex flex-wrap gap-2">
                    {locationOptions.map((location) => {
                      const isSelected = selectedLocations.includes(location);

                      return (
                        <button
                          key={location}
                          type="button"
                          onClick={() => toggleSelection(location, selectedLocations, setSelectedLocations)}
                          className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
                            isSelected ? "border-black bg-black text-white" : "border-border/70 bg-background text-foreground"
                          }`}
                        >
                          {isSelected ? <Check className="size-3.5" /> : null}
                          {location}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {activePanel === "who" ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Choose one or more travel styles</p>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {TRAVEL_STYLE_OPTIONS.map((style) => {
                      const isSelected = selectedTravelStyles.includes(style.id);

                      return (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => toggleSelection(style.id, selectedTravelStyles, setSelectedTravelStyles)}
                          className={`flex w-full min-w-0 items-start gap-2 rounded-2xl border px-3 py-2 text-left text-sm transition ${
                            isSelected ? "border-black bg-black text-white" : "border-border/70 bg-background text-foreground"
                          }`}
                        >
                          {isSelected ? <Check className="size-3.5" /> : null}
                          <span className="min-w-0 break-words whitespace-normal leading-5">{style.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {hasActiveFilters ? (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSports([]);
                      setSelectedLocations([]);
                      setSelectedTravelStyles([]);
                      setStartDate("");
                      setEndDate("");
                      setActivePanel(null);
                    }}
                    className="text-sm font-medium text-foreground transition hover:text-black"
                  >
                    Clear filters
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              title: "Hiking and Trekking",
              filter: "trek",
              image:
                "https://plus.unsplash.com/premium_photo-1692976236758-817620ab62ba??auto=format&fit=crop&w=900&q=80",
              position: "center 40%",
            },
            {
              title: "Cycling",
              filter: "bike",
              image:
                "https://images.unsplash.com/photo-1604748954134-457791b2ce9b?auto=format&fit=crop&w=900&q=80",
              position: "center 75%",
            },
            {
              title: "Snowboarding",
              filter: "winter",
              image:
                "https://plus.unsplash.com/premium_photo-1708612612949-b2eaa75af46d?auto=format&fit=crop&w=900&q=80",
              position: "center 65%",
            },
            {
              title: "Yoga and Meditation",
              filter: "yoga",
              image:
                "https://images.unsplash.com/photo-1554245120-94a6fc6feb96?auto=format&fit=crop&w=900&q=80",
              position: "center 80%",
            },
            {
              title: "Summit Expedition",
              filter: "expedition",
              image:
                "https://images.unsplash.com/photo-1643903096045-07741be1f245?auto=format&fit=crop&w=900&q=80",
              position: "center 50%",
            },
            {
              title: "Rock Climbing",
              filter: "rockclimb",
              image:
                "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=900&q=80",
              position: "center 30%",
            },
            {
              title: "Skiing",
              filter: "winter",
              image:
                "https://images.unsplash.com/photo-1586356415056-bd7a5c2bbef7?auto=format&fit=crop&w=900&q=80",
              position: "center bottom",
            },
            {
              title: "Mix it up!",
              filter: undefined,
              image:
                "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80",
              position: "center 70%",
            },
          ].map((item) => (
            <Link
              key={item.title}
              href={item.filter ? `/trips?sport=${item.filter}` : "/trips"}
              className="relative flex h-[120px] min-w-0 items-end overflow-hidden rounded-[1.1rem] border border-border/70 bg-muted/60 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.3)] sm:h-[130px] lg:h-[140px]"
            >
              <Image
                src={item.image}
                alt={item.title}
                fill
                className="object-cover"
                style={{ objectPosition: item.position }}
                sizes="(max-width: 640px) calc(50vw - 12px), (max-width: 1024px) 50vw, 25vw"
                loading="eager"
              />
              <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/70 via-black/35 to-transparent" />
              <div className="relative z-10 flex w-full items-end p-2.5 sm:p-3">
                <p className="text-[clamp(0.8rem,1vw,1rem)] font-semibold text-white">{item.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="border-b border-border/60 bg-background/95 px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto flex w-full max-w-8xl flex-col gap-8">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-foreground">
              Travel styles
            </p>
          </div>
          <div className="grid w-full grid-cols-3 gap-3 lg:grid-cols-6">
            {[
            {
              title: "Beginner Friendly",
              image:
                "https://plus.unsplash.com/premium_photo-1676982098817-844e52754258?auto=format&fit=crop&w=900&q=80",
            },
            {
              title: "Women Only",
              image:
                "https://plus.unsplash.com/premium_photo-1732538263622-a8f2501e3a82?auto=format&fit=crop&w=900&q=80",
            },
            {
              title: "For Family",
              image:
                "https://images.unsplash.com/photo-1503431153573-96e959f4d9b7?auto=format&fit=crop&w=900&q=80",
            },
            {
              title: "Adventure Enthusiast",
              image:
                "https://images.unsplash.com/photo-1676823648066-01a3e8db31c2?auto=format&fit=crop&w=900&q=80",
            },
            {
              title: "Courses",
              image:
                "https://plus.unsplash.com/premium_photo-1661963517045-f3ad4911bf4b?auto=format&fit=crop&w=900&q=80",
            },
            {
              title: "Self Guided",
              image:
                "https://plus.unsplash.com/premium_photo-1709311446331-fbc1800fd833?auto=format&fit=crop&w=900&q=80",
            },
            ].map((item) => (
              <Link
                key={item.title}
                href="/trips"
                className="relative flex min-h-[140px] items-end overflow-hidden rounded-[1.25rem] border border-border/70 bg-muted/60 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.3)] sm:min-h-[190px]"
              >
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) calc(50vw - 12px), (max-width: 1024px) 33vw, 16vw"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/70 via-black/35 to-transparent" />
                <div className="relative z-10 flex w-full items-end p-2.5 sm:p-3">
                  <p className="text-[clamp(0.7rem,1.8vw,1rem)] font-semibold leading-4 text-white sm:text-lg">{item.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="border-b border-border/60 bg-white px-3 pt-6 pb-4 sm:px-6 sm:pt-8 sm:pb-6 lg:px-8">
         <div className="mx-auto max-w-8xl">
           <div className="mb-3 flex flex-col gap-1 px-1 sm:mb-4 sm:px-2">
             <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
               Featured Trips
             </p>
             <h4 className="font-heading text-2xl font-semibold tracking-wide text-foreground sm:text-3xl">
              Curated, small group, sustainable adventures with certified local guides
             </h4>
           </div>
           <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-3">
             {visibleActivities.map((activity) => (
              <Card
                key={activity.id}
                className="flex h-[420px] min-w-0 cursor-pointer flex-col gap-0 overflow-hidden rounded-[1rem] border-0 bg-background/95 py-0 shadow-[0_16px_45px_-28px_rgba(0,0,0,0.28)] sm:h-[480px]"
                onClick={() => window.location.href = `/trips/${activity.slug}`}
              >
                <div className="relative -m-[1px] flex-[0_0_48%] min-h-[220px] overflow-hidden bg-muted/60 sm:flex-[0_0_52%] sm:min-h-[250px]">
                  <Image
                    src={getTripCardImage(activity)}
                    alt={activity.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) calc(50vw - 8px), (max-width: 1024px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/12 via-black/24 to-black/24" />
                </div>
                <div className="flex flex-1 flex-col justify-between gap-1 p-2.5 sm:p-3">
                  <div className="space-y-1.5">
                    <div className="space-y-1">
                      <h2 className="text-[clamp(0.9rem,1.05vw,1.02rem)] font-semibold leading-5 text-foreground">{activity.title}</h2>
                      <p className="text-sm text-muted-foreground">{activity.location}</p>
                    </div>
                    <div className="flex min-h-[1.35rem] flex-wrap content-start gap-1">
                      {activity.categories.map((category) => (
                        <Badge
                          key={category}
                          variant="secondary"
                          className="!w-auto !max-w-full !whitespace-normal !normal-case !tracking-normal rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-center text-[0.72rem] leading-4 font-medium text-foreground/80 sm:text-[0.8rem]"
                        >
                          {CATEGORY_LABELS[category] ?? category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="mt-auto flex justify-end">
                    <span className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[0.6rem] font-medium leading-4 text-foreground/80 sm:text-xs">
                      {activity.durationDays} {activity.durationDays === 1 ? "day" : "days"}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
            </div>
          </div>
         
         <div className="mt-6 flex justify-center">
            <Button
              size="sm"
              className="rounded-full bg-black px-4 text-white hover:bg-neutral-800"
              nativeButton={false}
              render={<Link href="/trips" />}
            >
              <span className="flex items-center gap-2">
                <span>Explore More Adventures</span>
                <ArrowRight className="h-4 w-4" />
              </span>
            </Button>
          </div>
        </div>
 
        <div className="border-b border-border/60 bg-background/95 px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto w-full max-w-8xl">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                More than a booking platform — a home for guides
              </p>
              <h4 className="mt-1 font-heading text-2xl font-semibold tracking-wide text-foreground sm:text-3xl">
                Tours crafted by certified local guides, with a commitment to sustainable travel
              </h4>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 xl:grid-cols-5 lg:grid-cols-5">
              {guideProfiles.map((guide) => (
                <Link key={guide.id} href={`/${guide.id}`} className="block">
                  <Card className="flex h-full min-w-0 flex-col overflow-hidden rounded-[0.85rem] border border-border/70 bg-card/95 py-0 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.18)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_50px_-28px_rgba(0,0,0,0.22)]">
                    <CardHeader className="gap-0 p-0 pb-0 px-0">
                      <div className="flex flex-col items-center text-center">
                        <Image
                          src={guide.image}
                          alt={guide.name}
                          width={400}
                          height={320}
                          className="h-32 w-full rounded-b-[0.7rem] rounded-t-[0.85rem] object-cover shadow-sm sm:h-36 lg:h-40"
                        />
                        <div className="w-full px-2 pb-3 pt-2">
                          <CardTitle className="text-[clamp(0.82rem,0.95vw,1rem)] leading-4 text-foreground">{guide.name}</CardTitle>
                          <p className="mt-0.5 text-[clamp(0.68rem,0.76vw,0.8rem)] text-muted-foreground">{guide.region}</p>
                          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                            {guide.certifications.map((certification) => (
                              <Badge key={certification} className="rounded-full border border-border/70 bg-background/80 px-1.5 py-0.45 text-[clamp(0.62rem,0.62vw,0.72rem)] font-small text-foreground/90">
                                {certification}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-b border-border/60 bg-background/95 px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto w-full max-w-8xl">
            <div className="max-w-4xl">
              <h4 className="mt-2 font-heading text-2xl font-semibold tracking-wide text-foreground sm:text-3xl">
                Travellers love the Radikal Experiences
              </h4>
              <p className="mt-3 text-base text-muted-foreground">
                Stories from people who chose small-group sustainable adventures in the Himalayas.
              </p>
            </div>

            <div className="mt-8 !grid !w-full !grid-cols-2 !gap-2 lg:!grid-cols-4">
              {testimonials.map((testimonial) => (
                <Card key={testimonial.name} className="flex h-full min-h-[80px] flex-col justify-between overflow-hidden rounded-[0.95rem] border border-border/70 bg-card/95 p-2.5 shadow-[0_16px_45px_-28px_rgba(0,0,0,0.18)] sm:min-h-[120px] sm:p-3 lg:min-h-[120px] lg:p-4">
                  <CardContent className="flex flex-1 flex-col justify-between gap-0 p-0">
                    <p className="text-[clamp(0.74rem,0.95vw,1rem)] font-semibold leading-5 text-foreground sm:leading-6 lg:leading-7">
                      “{testimonial.quote}”
                    </p>
                    <div className="ml-auto mt-2 flex flex-col items-end text-right">
                      <p className="text-[clamp(0.78rem,0.9vw,0.95rem)] font-semibold text-foreground">
                        {testimonial.name}
                      </p>
                      <p className="text-[clamp(0.68rem,0.8vw,0.8rem)] text-muted-foreground">
                        {testimonial.trip}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

      {filteredActivities.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No trips match your search yet. Try a broader destination or activity name.
        </p>
      ) : null}

    </section>
  );
}
