"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, MapPin, Search, Sparkles, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type ActivityCardItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  location: string;
  priceInRupees: number;
  durationDays: number;
  difficulty: string;
  categories: string[];
  type?: string;
  guide: { name: string } | null;
};

type FilterPanel = "what" | "when" | "where" | "who" | null;

const SPORT_OPTIONS = [
  { id: "ski", label: "Skiing" },
  { id: "snowboard", label: "Snowboarding" },
  { id: "bike", label: "Cycling" },
  { id: "trek", label: "Hiking and Trekking" },
  { id: "expedition", label: "Expedition" },
  { id: "rock-climbing", label: "Rock Climbing" },
  { id: "yoga", label: "Yoga and Meditation" },
] as const;

const TRAVEL_STYLE_OPTIONS = [
  { id: "beginner-friendly", label: "Beginner Friendly" },
  { id: "women-only", label: "Women Only" },
  { id: "for-family", label: "For Family" },
  { id: "adventure-enthusiast", label: "Adventure Enthusiast" },
  { id: "courses", label: "Courses" },
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
    case "ski":
      return activity.title.toLowerCase().includes("ski") || activity.description.toLowerCase().includes("ski") || activity.type === "SKI";
    case "snowboard":
      return activity.title.toLowerCase().includes("snowboard") || activity.description.toLowerCase().includes("snowboard") || activity.type === "SNOWBOARD";
    case "bike":
      return activity.title.toLowerCase().includes("bike") || activity.description.toLowerCase().includes("bike") || activity.type === "BIKE";
    case "trek":
      return activity.title.toLowerCase().includes("trek") || activity.description.toLowerCase().includes("trek") || activity.type === "TREK";
    case "expedition":
    case "climb":
      return activity.title.toLowerCase().includes("climb") || activity.description.toLowerCase().includes("climb") || activity.title.toLowerCase().includes("summit");
    case "rock-climbing":
      return activity.title.toLowerCase().includes("rock") && activity.title.toLowerCase().includes("climb");
    case "yoga":
      return activity.title.toLowerCase().includes("yoga") || activity.description.toLowerCase().includes("yoga");
    default:
      return true;
  }
}

export function SearchableTrips({ activities }: { activities: ActivityCardItem[] }) {
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

  const filteredActivities = useMemo(() => {
    const hasActiveFilters = selectedSports.length > 0 || selectedLocations.length > 0 || selectedTravelStyles.length > 0 || startDate || endDate;

    if (!hasActiveFilters) {
      return activities.slice(0, 4);
    }

    return activities.filter((activity) => {
      const sportMatch = selectedSports.length === 0 || selectedSports.some((sportId) => matchesSportSelection(activity, sportId));
      const locationMatch =
        selectedLocations.length === 0 || selectedLocations.some((location) => activity.location.toLowerCase().includes(location.toLowerCase()));
      const travelStyleMatch =
        selectedTravelStyles.length === 0 || selectedTravelStyles.some((style) => activity.categories.includes(style));
      const dateMatch = true;

      return sportMatch && locationMatch && travelStyleMatch && dateMatch;
    }).slice(0, 4);
  }, [activities, endDate, selectedLocations, selectedSports, selectedTravelStyles, startDate]);

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
      name: "Tashi Norbu",
      region: "Lahaul & Spiti",
      certifications: ["IMF Certified", "Avalanche Safety"],
      adventuresLed: "50+",
      image:
        "https://images.unsplash.com/photo-1599405653894-8a595f692abf?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Meera Rawat",
      region: "Kashmir",
      certifications: ["Women Leadership", "First Aid"],
      adventuresLed: "20+",
      image:
        "https://images.unsplash.com/photo-1661892526325-813afd121a4e?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Tenzin Dorjee",
      region: "Ladakh",
      certifications: ["IMF Certified", "Mountain Rescue"],
      adventuresLed: "35+",
      image:
        "https://images.unsplash.com/photo-1601224748193-d24f166b5c77?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Nawang Dolma",
      region: "Arunachal Pradesh",
      certifications: ["Yoga Instructor", "Ecotourism Guide"],
      adventuresLed: "28+",
      image:
        "https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?auto=format&fit=crop&w=400&q=80",
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
      className="mx-auto flex w-full max-w-none flex-col gap-8 bg-white px-6 py-10 sm:px-8 sm:py-16"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-1">
        <h3 className="font-heading text-2xl font-semibold tracking-wide text-foreground sm:text-3xl">
          Find your adventure
        </h3>
        <p className="text-lg text-muted-foreground">
          Small groups with certified local guides
        </p>
        <div className="flex w-full max-w-5xl flex-col gap-2 p-1.5 sm:p-2">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
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
                  className={`flex flex-col items-start gap-1 rounded-[0.95rem] border px-2.5 py-1.5 text-left transition ${
                    isActive ? "border-[#1d4ed8] bg-[#1d4ed8]/8 shadow-sm" : "border-border/70 bg-background/80 hover:border-[#1d4ed8]/40"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Icon className="size-3.5 text-[#1d4ed8]" />
                    {item.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                </button>
              );
            })}
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
                            isSelected ? "border-[#1d4ed8] bg-[#1d4ed8] text-white" : "border-border/70 bg-background text-foreground"
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
                      className="text-sm font-medium text-[#1d4ed8] transition hover:text-[#1e40af]"
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
                            } ${isSelected ? "bg-[#1d4ed8] text-white" : isInRange ? "bg-[#1d4ed8]/10 text-[#1d4ed8]" : "hover:bg-muted"}`}
                          >
                            {cell.date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {startDate ? (
                      <span className="rounded-full border border-[#1d4ed8]/20 bg-[#1d4ed8]/10 px-3 py-1 text-sm font-medium text-[#1d4ed8]">
                        From {formatDateForDisplay(startDate)}
                      </span>
                    ) : null}
                    {endDate ? (
                      <span className="rounded-full border border-[#1d4ed8]/20 bg-[#1d4ed8]/10 px-3 py-1 text-sm font-medium text-[#1d4ed8]">
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
                            isSelected ? "border-[#1d4ed8] bg-[#1d4ed8] text-white" : "border-border/70 bg-background text-foreground"
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
                            isSelected ? "border-[#1d4ed8] bg-[#1d4ed8] text-white" : "border-border/70 bg-background text-foreground"
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
                    className="text-sm font-medium text-[#1d4ed8] transition hover:text-[#1e40af]"
                  >
                    Clear filters
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <Button
            size="sm"
            variant="outline"
            className="w-full rounded-[0.95rem] border-[#1d4ed8] bg-background/95 px-3 py-1.5 text-[#1d4ed8] hover:bg-background/100 hover:text-[#1e40af] md:ml-auto md:w-auto"
            onClick={handleSearch}
          >
            <span className="flex items-center justify-center gap-2">
              <Search className="h-3.5 w-3.5" />
              <span className="text-sm">Search</span>
            </span>
          </Button>
        </div>

        <div className="mt-6 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              title: "Hiking and Trekking",
              filter: "trek",
              image:
                "https://plus.unsplash.com/premium_photo-1692976236758-817620ab62ba??auto=format&fit=crop&w=900&q=80",
              position: "center bottom",
            },
            {
              title: "Cycling",
              filter: "bike",
              image:
                "https://images.unsplash.com/photo-1604748954134-457791b2ce9b?auto=format&fit=crop&w=900&q=80",
              position: "center 95%",
            },
            {
              title: "Snowboarding",
              filter: "snowboard",
              image:
                "https://plus.unsplash.com/premium_photo-1708612612949-b2eaa75af46d?auto=format&fit=crop&w=900&q=80",
              position: "center 80%",
            },
            {
              title: "Yoga and Meditation",
              filter: "yoga",
              image:
                "https://images.unsplash.com/photo-1667586733525-0eea514bfb49?auto=format&fit=crop&w=900&q=80",
              position: "center 65%",
            },
            {
              title: "Expedition",
              filter: "expedition",
              image:
                "https://images.unsplash.com/photo-1643903096045-07741be1f245?auto=format&fit=crop&w=900&q=80",
              position: "center bottom",
            },
            {
              title: "Rock Climbing",
              filter: "rock-climbing",
              image:
                "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=900&q=80",
            },
            {
              title: "Skiing",
              filter: "ski",
              image:
                "https://images.unsplash.com/photo-1586356415056-bd7a5c2bbef7?auto=format&fit=crop&w=900&q=80",
              position: "center bottom",
            },
            {
              title: "Mix it up!",
              filter: undefined,
              image:
                "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80",
              position: "center 80%",
            },
          ].map((item) => (
            <Link
              key={item.title}
              href={item.filter ? `/trips?sport=${item.filter}` : "/trips"}
              className="relative flex h-[120px] min-w-0 items-end overflow-hidden rounded-[1.1rem] border border-border/70 bg-muted/60 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.3)] sm:h-[130px] lg:h-[140px]"
              style={{ backgroundImage: `url(${item.image})`, backgroundSize: "cover", backgroundPosition: item.position ?? "center" }}
            >
              <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/70 via-black/35 to-transparent" />
              <div className="relative z-10 flex w-full items-end p-2.5 sm:p-3">
                <p className="text-[clamp(0.8rem,1vw,1rem)] font-semibold text-white">{item.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="border-b border-border/60 bg-background/95 px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-foreground">
              Travel styles
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
                className="relative flex min-h-[160px] items-end overflow-hidden rounded-[1.25rem] border border-border/70 bg-muted/60 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.3)] sm:min-h-[190px]"
                style={{ backgroundImage: `url(${item.image})`, backgroundSize: "cover", backgroundPosition: "center" }}
              >
                <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/70 via-black/35 to-transparent" />
                <div className="relative z-10 flex w-full items-end p-3">
                  <p className="text-lg font-semibold text-white">{item.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="border-b border-border/60 bg-[#f3f8ff] px-3 pt-6 pb-4 sm:px-6 sm:pt-8 sm:pb-6 lg:px-8">
         <div className="mx-auto max-w-7xl">
           <div className="mb-3 flex items-center gap-2 px-1 sm:mb-4 sm:px-2">
             <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-foreground">
               Featured Trips
             </h4>
           </div>
           <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-4">
             {visibleActivities.map((activity) => (
              <Card
                key={activity.id}
                className="flex h-[680px] min-w-0 cursor-pointer flex-col overflow-hidden rounded-[1.15rem] border-0 bg-background/95 py-0 gap-0 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.3)]"
                onClick={() => window.location.href = `/trips/${activity.slug}`}
              >
                <div
                  className="relative -m-[1px] flex-[0_0_60%] min-h-[400px] bg-muted/60"
                  style={{
                    backgroundImage: `url(${getTripCardImage(activity)})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                </div>
                <div className="flex flex-1 flex-col justify-between gap-1 p-3 sm:p-3.5">
                  <div className="space-y-1.5">
                    <div className="space-y-1">
                      <h2 className="text-[clamp(0.95rem,1.2vw,1.15rem)] font-semibold leading-6 text-foreground">{activity.title}</h2>
                      <p>{activity.location}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {/* <span className="rounded-full border border-border/70 bg-background/80 px-2 py-1 text-[clamp(0.7rem,0.85vw,0.8rem)] font-medium text-foreground/80">
                        {activity.location}
                      </span> */}
                      {activity.categories.map((category) => (
                        <Badge
                          key={category}
                          variant="secondary"
                          className="!w-auto !max-w-full !whitespace-normal !normal-case !tracking-normal rounded-full border border-border/70 bg-background/80 px-1.5 py-0.75 text-center text-[clamp(0.62rem,0.78vw,0.72rem)] leading-4 font-medium text-foreground/80"
                        >
                          {CATEGORY_LABELS[category] ?? category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="mt-auto flex justify-end">
                    <span className="rounded-full border border-border/70 bg-transparent px-2.5 py-1 text-[clamp(0.8rem,0.95vw,0.95rem)] font-semibold text-foreground/90">
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
              className="rounded-full bg-[#1d4ed8] px-4 text-white hover:bg-[#1e40af]"
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
          <div className="mx-auto w-full max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Certified local guides
              </p>
              <h4 className="mt-2 font-heading text-3xl font-semibold tracking-wide text-foreground sm:text-4xl">
                Trusted guides for every ridge and valley
              </h4>
              <p className="mt-3 text-base text-muted-foreground">
                We partner with trusted local guides who are well versed with terrain.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-2 lg:grid-cols-4">
              {guideProfiles.map((guide) => (
                <Card key={guide.name} className="flex h-full min-w-0 flex-col overflow-hidden rounded-[0.9rem] border border-border/70 bg-card/95 shadow-[0_12px_32px_-22px_rgba(0,0,0,0.18)]">
                  <CardHeader className="gap-1.5 p-2">
                    <div className="flex flex-col items-center gap-1.5 text-center">
                      <img
                        src={guide.image}
                        alt={guide.name}
                        className="h-24 w-full rounded-[0.75rem] object-cover shadow-sm sm:h-28 lg:h-30"
                      />
                      <div className="w-full">
                        <div className="flex items-center justify-center gap-1">
                          <CardTitle className="text-[clamp(0.72rem,0.8vw,0.82rem)] leading-4 text-foreground">{guide.name}</CardTitle>
                          <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-[8px] font-bold text-white" aria-label="Verified guide">
                            ✓
                          </span>
                        </div>
                        <p className="mt-0.5 text-[clamp(0.62rem,0.7vw,0.7rem)] text-muted-foreground">{guide.region}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-1.5 p-2 pt-0">
                    <div className="flex flex-wrap justify-center gap-1">
                      {guide.certifications.map((certification) => (
                        <Badge key={certification} className="rounded-full border border-border/70 bg-background/80 px-1.25 py-0.5 text-[clamp(0.55rem,0.62vw,0.62rem)] font-medium text-foreground/90">
                          {certification}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-auto rounded-full border border-border px-1.5 py-0.75 text-center text-[clamp(0.6rem,0.64vw,0.64rem)] text-muted-foreground">
                      {guide.adventuresLed} adventures led
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="border-b border-border/60 bg-[#f3f8ff] px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <div className="max-w-3xl">
              <h4 className="mt-2 font-heading text-3xl font-semibold tracking-wide text-foreground sm:text-4xl">
                Travellers ❤️ Radikal Experiences
              </h4>
              <p className="mt-3 text-base text-muted-foreground">
                Real stories from people who chose small-group adventures in the Himalayas.
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
