"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { matchesSearchQuery } from "@/components/trips/sport-filters";
import { getTripCardImage } from "@/lib/trip-card-image";

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

type GuideProfile = {
  slug: string;
  name: string;
  location: string;
  photo: string | null;
  certifications: string[];
};

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

export function SearchableTrips({
  activities,
  featuredTripSlugs = [],
  guides = [],
}: {
  activities: ActivityCardItem[];
  featuredTripSlugs?: readonly string[];
  guides?: GuideProfile[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const rankedActivities = useMemo(() => prioritizeFeaturedActivities(activities, featuredTripSlugs), [activities, featuredTripSlugs]);

  const filteredActivities = useMemo(() => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return rankedActivities.slice(0, 4);
    }

    return rankedActivities.filter((activity) => matchesSearchQuery(activity, normalizedQuery)).slice(0, 4);
  }, [query, rankedActivities]);

  const suggestions = useMemo(() => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return [];
    }

    return rankedActivities
      .filter((activity) => matchesSearchQuery(activity, normalizedQuery))
      .slice(0, 6);
  }, [query, rankedActivities]);

  const visibleActivities = filteredActivities;

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    router.push(trimmedQuery ? `/trips?q=${encodeURIComponent(trimmedQuery)}` : "/trips");
  };

  const guideImageMap: Record<string, string> = {
    tenzin:
      "https://images.unsplash.com/photo-1601224748193-d24f166b5c77?auto=format&fit=crop&w=400&q=80",
    tashi:
      "https://images.unsplash.com/photo-1599405653894-8a595f692abf?auto=format&fit=crop&w=400&q=80",
    meera:
      "https://images.unsplash.com/photo-1661892526325-813afd121a4e?auto=format&fit=crop&w=400&q=80",
    nawang:
      "https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?auto=format&fit=crop&w=400&q=80",
    pema:
      "https://images.unsplash.com/photo-1548789997-82da68437ad8?auto=format&fit=crop&w=400&q=80",
  };

  const guideFallbackImage =
    "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=400&q=80";

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
      className="mx-auto flex w-full max-w-none flex-col gap-8 px-4 py-10 sm:px-6 sm:py-16 lg:px-10"
    >
      <div className="-mt-3 mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-1 sm:-mt-4">
        <h3 className="font-heading text-2xl font-semibold tracking-wide text-foreground sm:text-3xl">
          Learn. Explore. Belong.
        </h3>
        <p className="text-lg text-muted-foreground">
          Small groups, led by certified experts
        </p>
        <div className="mt-1 mx-auto flex w-full max-w-xl flex-col gap-2 p-1 sm:mt-2 sm:p-2">
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex items-center gap-2 rounded-full border border-orange-100 bg-background/95 p-1.5 pl-4 shadow-[0_20px_60px_-35px_rgba(249,115,22,0.25)] transition focus-within:border-emerald-200 focus-within:shadow-[0_30px_55px_-25px_rgba(16,185,129,0.3)] sm:pl-5"
          >
            <Search className="size-4 shrink-0 text-muted-foreground sm:size-5" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search trips, sports, or destinations…"
              aria-label="Search trips, sports, or destinations"
              autoComplete="off"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="h-10 w-full min-w-0 border-0 bg-transparent px-0 text-sm text-foreground outline-none placeholder:text-muted-foreground sm:text-base"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            ) : null}
            <button
              type="submit"
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-black px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 sm:px-5"
            >
              <Search className="size-3.5" />
              <span>Search</span>
            </button>
            {isFocused && query.trim() ? (
              <div className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-[1rem] border border-orange-100 bg-background/95 shadow-[0_20px_60px_-35px_rgba(249,115,22,0.25)] backdrop-blur">
                {suggestions.length > 0 ? (
                  <ul className="max-h-[320px] overflow-y-auto py-1">
                    {suggestions.map((activity) => (
                      <li key={activity.id}>
                        <button
                          type="button"
                          onMouseDown={() => router.push(`/trips/${activity.slug}`)}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-orange-50"
                        >
                          <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                            <Image
                              src={getTripCardImage(activity)}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {activity.title}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {activity.location}
                            </span>
                          </span>
                          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No trips found for “{query.trim()}”
                  </p>
                )}
                <button
                  type="button"
                  onMouseDown={() => router.push(`/trips?q=${encodeURIComponent(query.trim())}`)}
                  className="flex w-full items-center justify-between gap-2 border-t border-border/60 px-4 py-2.5 text-left text-sm font-medium text-foreground transition hover:bg-orange-50"
                >
                  <span className="flex items-center gap-2">
                    <Search className="size-4 text-muted-foreground" />
                    See all trips for “{query.trim()}”
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </div>
            ) : null}
          </form>
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
              className="relative flex h-[120px] min-w-0 items-end overflow-hidden rounded-[1.1rem] border border-border/70 bg-muted/60 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.3)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_30px_55px_-25px_rgba(0,0,0,0.35)] sm:h-[130px] lg:h-[140px]"
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
                className="relative flex min-h-[140px] items-end overflow-hidden rounded-[1.25rem] border border-border/70 bg-muted/60 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.3)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_30px_55px_-25px_rgba(0,0,0,0.35)] sm:min-h-[190px]"
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

      <div className="border-b border-border/60 px-3 pt-6 pb-4 sm:px-6 sm:pt-8 sm:pb-6 lg:px-8">
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
             {visibleActivities.length === 0 ? (
               <p className="col-span-full rounded-[1rem] border border-dashed border-border/80 bg-background/70 px-4 py-10 text-center text-sm text-muted-foreground">
                 No trips match your search yet. Try a broader destination or activity name.
               </p>
             ) : null}
             {visibleActivities.map((activity) => (
              <Card
                key={activity.id}
                className="flex h-[420px] min-w-0 cursor-pointer flex-col gap-0 overflow-hidden rounded-[1rem] border border-orange-100 bg-background/95 py-0 shadow-[0_20px_60px_-35px_rgba(249,115,22,0.25)] transition-transform duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_30px_55px_-25px_rgba(16,185,129,0.3)] sm:h-[480px]"
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
              {guides.map((guide) => (
                <Link key={guide.slug} href={`/${guide.slug}`} className="block">
                  <Card className="flex h-full min-w-0 flex-col overflow-hidden rounded-[0.85rem] border border-orange-100 bg-card/95 py-0 shadow-[0_16px_45px_-28px_rgba(249,115,22,0.25)] transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_30px_55px_-25px_rgba(16,185,129,0.3)]">
                    <CardHeader className="gap-0 p-0 pb-0 px-0">
                      <div className="flex flex-col items-center text-center">
                        <Image
                          src={guide.photo ?? guideImageMap[guide.slug] ?? guideFallbackImage}
                          alt={guide.name}
                          width={400}
                          height={320}
                          className="h-32 w-full rounded-b-[0.7rem] rounded-t-[0.85rem] object-cover shadow-sm sm:h-36 lg:h-40"
                        />
                        <div className="w-full px-2 pb-3 pt-2">
                          <CardTitle className="text-[clamp(0.82rem,0.95vw,1rem)] leading-4 text-foreground">{guide.name}</CardTitle>
                          <p className="mt-0.5 text-[clamp(0.68rem,0.76vw,0.8rem)] text-muted-foreground">{guide.location}</p>
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
                Stories from people who chose small-group sustainable adventures
              </p>
            </div>

            <div className="mt-8 !grid !w-full !grid-cols-2 !gap-2 lg:!grid-cols-4">
              {testimonials.map((testimonial) => (
                <Card key={testimonial.name} className="flex h-full min-h-[80px] flex-col justify-between overflow-hidden rounded-[0.95rem] border border-orange-100 bg-card/95 p-2.5 shadow-[0_16px_45px_-28px_rgba(249,115,22,0.22)] transition-transform duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_30px_55px_-25px_rgba(16,185,129,0.28)] sm:min-h-[120px] sm:p-3 lg:min-h-[120px] lg:p-4">
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

    </section>
  );
}
