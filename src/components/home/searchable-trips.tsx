"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, X } from "lucide-react";
import {
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { useEllipsisPlaceholder } from "@/hooks/use-ellipsis-placeholder";
import { matchesSearchQuery } from "@/components/trips/sport-filters";
import { getTripCardImage } from "@/lib/trip-card-image";
import { CTA_PILL } from "@/lib/card-styles";
import { FORM_FIELD_BORDER } from "@/lib/boundary-styles";
import { TestimonialCard } from "@/components/reviews/testimonial-card";
import { TripCard } from "@/components/trips/trip-card";
import { SportIcon } from "@/components/trips/sport-icon";
import {
  CommunityGuideMedia,
  type CommunityGuideMediaItem,
} from "@/components/guides/community-guide-media";

type TripCardItem = {
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

type Testimonial = {
  name: string;
  trip: string;
  quote: string;
  date?: string;
};

function prioritizeFeaturedTrips(trips: TripCardItem[], featuredTripSlugs: readonly string[]) {
  const featuredRank = new Map(featuredTripSlugs.map((slug, index) => [slug, index]));

  return trips
    .map((trip, index) => ({ trip, index }))
    .sort((left, right) => {
      const leftRank = featuredRank.get(left.trip.slug);
      const rightRank = featuredRank.get(right.trip.slug);

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
    .map(({ trip }) => trip);
}

export function SearchableTrips({
  trips,
  featuredTripSlugs = [],
  guideMedia = [],
  testimonials = [],
}: {
  trips: TripCardItem[];
  featuredTripSlugs?: readonly string[];
  guideMedia?: CommunityGuideMediaItem[];
  testimonials?: Testimonial[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const placeholder = useEllipsisPlaceholder(
    "Search trips, sports, or destinations",
    query.length === 0
  );

  const rankedTrips = useMemo(() => prioritizeFeaturedTrips(trips, featuredTripSlugs), [trips, featuredTripSlugs]);

  const filteredTrips = useMemo(() => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return rankedTrips.slice(0, 5);
    }

    return rankedTrips.filter((trip) => matchesSearchQuery(trip, normalizedQuery)).slice(0, 5);
  }, [query, rankedTrips]);

  const suggestions = useMemo(() => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return [];
    }

    return rankedTrips
      .filter((trip) => matchesSearchQuery(trip, normalizedQuery))
      .slice(0, 6);
  }, [query, rankedTrips]);

  const visibleTrips = filteredTrips;

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    router.push(trimmedQuery ? `/trips?q=${encodeURIComponent(trimmedQuery)}` : "/trips");
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      router.push(`/trips/${suggestions[activeIndex].slug}`);
    }
  };

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
        <div className="mt-1 mx-auto flex w-[90%] max-w-[53.7rem] flex-col gap-2 p-1 sm:mt-2 sm:p-2">
          <form
            onSubmit={handleSearchSubmit}
            className={`relative flex items-center gap-2 rounded-full border ${FORM_FIELD_BORDER} bg-background/95 p-1.5 pl-4 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)] transition focus-within:border-ring focus-within:shadow-[0_30px_55px_-25px_rgba(0,0,0,0.3)] sm:pl-5`}
          >
            <Search className="size-4 shrink-0 text-muted-foreground sm:size-5" />
            <input
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(-1);
              }}
              placeholder={placeholder}
              aria-label="Search trips, sports, or destinations"
              autoComplete="off"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleSearchKeyDown}
              className="h-10 w-full min-w-0 border-0 bg-transparent px-0 text-xs text-foreground outline-none placeholder:text-muted-foreground sm:text-base"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveIndex(-1);
                }}
                aria-label="Clear search"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            ) : null}
            <button
              type="submit"
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-black px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-white/90 sm:px-5"
            >
              <Search className="size-3.5" />
              <span>Search</span>
            </button>
            {isFocused && query.trim() ? (
              <div className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-[1rem] border border-border bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)] backdrop-blur">
                {suggestions.length > 0 ? (
                  <ul className="max-h-[320px] overflow-y-auto py-1">
                    {suggestions.map((trip, index) => (
                      <li key={trip.id}>
                        <button
                          type="button"
                          onMouseDown={() => router.push(`/trips/${trip.slug}`)}
                          onMouseEnter={() => setActiveIndex(index)}
                          className={`flex w-full items-center gap-3 px-3 py-2 text-left transition ${
                            index === activeIndex
                              ? "bg-orange-50"
                              : "hover:bg-orange-50"
                          }`}
                        >
                          <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                            <Image
                              src={getTripCardImage(trip)}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {trip.title}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {trip.location}
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

        <div className="mt-5 grid w-[94%] max-w-[57rem] grid-cols-3 gap-3 p-1 sm:p-2 lg:grid-cols-6">
          {[
              {
                title: "Hiking and Trekking",
                filter: "trek",
                sport: "trek",
              },
              {
                title: "Cycling",
                filter: "bike",
                sport: "bike",
              },
              {
                title: "Rock Climbing",
                filter: "rockclimb",
                sport: "rockclimb",
              },
              {
                title: "Summit Expedition",
                filter: "expedition",
                sport: "expedition",
              },
              {
                title: "Skiing",
                filter: "winter",
                sport: "ski",
              },
              {
                title: "Snowboarding",
                filter: "winter",
                sport: "snowboard",
              },
            ].map((item) => (
              <Link key={item.title} href={`/trips?sport=${item.filter}`} className="group flex min-w-0 flex-col items-center gap-2 rounded-[1rem] px-2 py-3 text-center transition hover:-translate-y-1 hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:py-4">
                <span className="flex size-14 items-center justify-center rounded-full border border-border/70 bg-transparent text-foreground shadow-[0_8px_26px_-18px_rgba(0,0,0,0.55)] transition duration-300 group-hover:border-orange-500/60 group-hover:text-orange-700 group-hover:shadow-[0_18px_30px_-20px_rgba(194,65,12,0.7)] dark:group-hover:text-orange-300 sm:size-16">
                  <SportIcon sport={item.sport} className="size-6 sm:size-7" />
                </span>
                <span className="font-heading text-xs font-semibold tracking-wide text-foreground sm:text-sm">
                  {item.title}
                </span>
              </Link>
            ))}
        </div>
      </div>

      <div className="-mt-4 px-3 pt-6 pb-5 sm:px-6 sm:pt-8 sm:pb-7 lg:px-8">
        <div className="mx-auto w-full max-w-8xl">
          <div className="mb-6 flex items-end justify-between gap-4 sm:mb-7">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                Travel styles
              </p>
            </div>
            <Link
              href="/trips"
              className="hidden items-center gap-1 text-sm font-semibold text-foreground underline-offset-4 transition hover:text-orange-700 hover:underline sm:flex"
            >
              Browse all trips
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">
            {[
              {
                title: "Beginner Friendly",
                image:
                  "https://plus.unsplash.com/premium_photo-1676982098817-844e52754258?auto=format&fit=crop&w=900&q=80",
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
                title: "For Families",
                image:
                  "https://images.unsplash.com/photo-1503431153573-96e959f4d9b7?auto=format&fit=crop&w=900&q=80",
              },
              {
                title: "Women Only",
                image:
                  "https://plus.unsplash.com/premium_photo-1732538263622-a8f2501e3a82?auto=format&fit=crop&w=900&q=80",
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
                className="group relative aspect-[4/3] min-w-0 overflow-hidden rounded-[1rem] bg-muted shadow-[0_8px_26px_-18px_rgba(0,0,0,0.55)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_38px_-20px_rgba(0,0,0,0.7)]"
              >
                <Image
                  src={item.image}
                  alt=""
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                  sizes="(max-width: 1023px) calc(33vw - 16px), 16vw"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                <div className="relative z-10 flex h-full items-end px-3 pb-1 pt-3 sm:px-4 sm:pb-2 sm:pt-4">
                  <p className="font-heading text-[0.875rem] font-semibold tracking-wide text-white sm:text-base">
                    {item.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="border-b border-border/60 px-3 pt-4 pb-4 sm:px-6 sm:pt-5 sm:pb-6 lg:px-8">
         <div className="mx-auto max-w-8xl">
           <div className="mb-3 flex flex-col gap-1 px-1 sm:mb-4 sm:px-2">
             <h4 className="font-heading text-2xl font-semibold tracking-wide text-foreground sm:text-3xl">
              Curated trips crafted by expert guides. Book your next adventure with confidence.
             </h4>
           </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5">
             {visibleTrips.length === 0 ? (
               <p className="col-span-full rounded-[1rem] border border-dashed border-border/80 bg-background/70 px-4 py-10 text-center text-sm text-muted-foreground">
                 No trips match your search yet. Try a broader destination or trip name.
               </p>
             ) : null}
                 {visibleTrips.map((trip, index) => (
                   <div key={trip.id} className={index > 3 ? "hidden w-full min-w-0 md:flex" : "flex w-full min-w-0"}>
                      <TripCard imageOnly showPrice={false} trip={trip} />
                   </div>
                 ))}
            </div>
          </div>
         
         <div className="mt-6 flex justify-center">
            <Button
              size="sm"
              className={`${CTA_PILL} px-4`}
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
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                The places and people behind the plans
              </p>
              <h4 className="mt-1 font-heading text-2xl font-semibold tracking-wide text-foreground sm:text-3xl">
                More than a booking platform — a home for guides
              </h4>
              </div>
            </div>

            <CommunityGuideMedia items={guideMedia} />

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                size="sm"
                className={`${CTA_PILL} px-5`}
                nativeButton={false}
                render={<Link href="/become-a-guide" />}
              >
                <span className="flex items-center gap-2">
                  <span>Become a Guide</span>
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
              <Button
                size="sm"
                className="rounded-full border border-black bg-white px-5 text-black hover:bg-neutral-100 dark:border-white dark:bg-black dark:text-white dark:hover:bg-neutral-900"
                nativeButton={false}
                render={<Link href="/community" />}
              >
                <span className="flex items-center gap-2">
                  <span>Check Out Our Community</span>
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
            </div>
          </div>
        </div>

        <div className="border-b border-border/60 bg-background/95 px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto w-full max-w-8xl">
            <div className="max-w-4xl">
              <h4 className="mt-2 font-heading text-2xl font-semibold tracking-wide text-foreground sm:text-3xl">
                Outdoor lovers share their Radikal experiences
              </h4>
              <p className="mt-3 text-base text-muted-foreground">
                Real stories from small-group, sustainable adventures
              </p>
            </div>

            <div className="mt-8 !grid !w-full !grid-cols-2 !gap-2 lg:!grid-cols-4">
              {testimonials.map((testimonial, index) => {
                const key = `${testimonial.name}-${testimonial.trip}-${index}`;
                return <TestimonialCard key={key} testimonial={testimonial} />;
              })}
            </div>
          </div>
        </div>

    </section>
  );
}
