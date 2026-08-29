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
import { matchesSearchQuery } from "@/components/trips/sport-filters";
import { getTripCardImage } from "@/lib/trip-card-image";
import { CTA_PILL } from "@/lib/card-styles";
import { FORM_FIELD_BORDER } from "@/lib/boundary-styles";
import { TestimonialCard } from "@/components/reviews/testimonial-card";
import { TripCard } from "@/components/trips/trip-card";
import { GuideCard } from "@/components/guides/guide-card";

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

type GuideProfile = {
  username: string;
  name: string;
  location: string;
  photo: string;
  certifications: string[];
};

type Testimonial = {
  name: string;
  trip: string;
  slug?: string;
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
  guides = [],
  testimonials = [],
}: {
  trips: TripCardItem[];
  featuredTripSlugs?: readonly string[];
  guides?: GuideProfile[];
  testimonials?: Testimonial[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const rankedTrips = useMemo(() => prioritizeFeaturedTrips(trips, featuredTripSlugs), [trips, featuredTripSlugs]);

  const filteredTrips = useMemo(() => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return rankedTrips.slice(0, 4);
    }

    return rankedTrips.filter((trip) => matchesSearchQuery(trip, normalizedQuery)).slice(0, 4);
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
        <div className="mt-1 mx-auto flex w-full max-w-xl flex-col gap-2 p-1 sm:mt-2 sm:p-2">
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
              placeholder="Search trips, sports, or destinations…"
              aria-label="Search trips, sports, or destinations"
              autoComplete="off"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleSearchKeyDown}
              className="h-10 w-full min-w-0 border-0 bg-transparent px-0 text-sm text-foreground outline-none placeholder:text-muted-foreground sm:text-base"
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
              href={item.filter ? `/trips?sport=${item.filter}` : "/custom-trip"}
              className="relative flex h-[120px] min-w-0 items-end overflow-hidden rounded-[1.1rem] border border-border/70 bg-muted/60 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.3)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_30px_55px_-25px_rgba(0,0,0,0.35)] sm:h-[130px] lg:h-[140px]"
            >
              <Image
                src={item.image}
                alt={item.title}
                fill
                className="object-cover"
                style={{ objectPosition: item.position }}
                sizes="(max-width: 640px) calc(50vw - 12px), (max-width: 1024px) 50vw, 25vw"
                loading="lazy"
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
              Curated, small group, sustainable adventures with certified expert guides
             </h4>
           </div>
           <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-3">
             {visibleTrips.length === 0 ? (
               <p className="col-span-full rounded-[1rem] border border-dashed border-border/80 bg-background/70 px-4 py-10 text-center text-sm text-muted-foreground">
                 No trips match your search yet. Try a broader destination or trip name.
               </p>
             ) : null}
              {visibleTrips.map((trip) => (
                <TripCard key={trip.id} size="compact" trip={trip} />
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
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                More than a booking platform — a home for guides
              </p>
              <h4 className="mt-1 font-heading text-2xl font-semibold tracking-wide text-foreground sm:text-3xl">
                Tours crafted by certified professional guides, with a commitment to sustainable travel
              </h4>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 xl:grid-cols-5 lg:grid-cols-5">
              {guides.map((guide) => (
                <GuideCard key={guide.username} guide={guide} />
              ))}
            </div>

            <div className="mt-6 flex justify-center">
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
