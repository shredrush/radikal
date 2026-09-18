"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Calendar,
  Compass,
  Footprints,
  GraduationCap,
  HeartHandshake,
  Package,
  Search,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { useEllipsisPlaceholder } from "@/hooks/use-ellipsis-placeholder";
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
  location: string;
  priceInRupees: number;
  durationDays: number;
  categories?: string[];
  travelStyleLinks?: Array<{ travelStyle: { name: string; slug: string } }>;
  images?: string[];
  type?: string;
};

type Testimonial = {
  name: string;
  trip: string;
  quote: string;
  date?: string;
};

type TravelStyleTile = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  tripCount: number;
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
  travelStyles = [],
}: {
  trips: TripCardItem[];
  featuredTripSlugs?: readonly string[];
  guideMedia?: CommunityGuideMediaItem[];
  testimonials?: Testimonial[];
  travelStyles?: TravelStyleTile[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchResult, setSearchResult] = useState<{
    query: string;
    trips: TripCardItem[];
  } | null>(null);
  const searchCache = useMemo(() => new Map<string, TripCardItem[]>(), []);

  const placeholder = useEllipsisPlaceholder(
    "Search trips, sports, or destinations",
    query.length === 0
  );

  const rankedTrips = useMemo(() => prioritizeFeaturedTrips(trips, featuredTripSlugs), [trips, featuredTripSlugs]);

  const normalizedQuery = query.trim().slice(0, 200);

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      return;
    }

    if (searchCache.has(normalizedQuery)) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      void fetch(`/api/trips/search?q=${encodeURIComponent(normalizedQuery)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("Trip search failed");
          const data = (await response.json()) as { trips: TripCardItem[] };
          if (!controller.signal.aborted) {
            searchCache.set(normalizedQuery, data.trips);
            setSearchResult({ query: normalizedQuery, trips: data.trips });
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSearchResult({ query: normalizedQuery, trips: [] });
          }
        });
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [normalizedQuery, searchCache]);

  const cachedTrips = searchCache.get(normalizedQuery);
  const currentSearchTrips =
    searchResult?.query === normalizedQuery ? searchResult.trips : (cachedTrips ?? null);
  const canTypeahead = normalizedQuery.length >= 2;
  const suggestions = canTypeahead ? (currentSearchTrips ?? []) : [];
  const visibleTrips = canTypeahead ? (currentSearchTrips ?? rankedTrips).slice(0, 5) : rankedTrips.slice(0, 5);

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
        <h3 className="text-center font-heading text-2xl font-semibold tracking-wide text-foreground sm:text-3xl">
          Learn. Explore. Belong.
        </h3>
        <p className="text-center text-lg text-muted-foreground">
          Discover outdoor experts and book adventures designed and led by them
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
                setSearchResult(null);
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
                  setSearchResult(null);
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
              <span className="hidden sm:inline">Search</span>
            </button>
            {isFocused && canTypeahead ? (
              <div className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-[1rem] border border-border bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)] backdrop-blur">
                {currentSearchTrips === null ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">Searching trips...</p>
                ) : suggestions.length > 0 ? (
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

        <div className="mt-3 grid w-[94%] max-w-[57rem] grid-cols-6 gap-1 p-0.5 sm:gap-2 sm:p-1">
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
              <Link key={item.title} href={`/trips?sport=${item.filter}`} className="group flex min-w-0 flex-col items-center gap-1 rounded-xl px-0.5 py-1.5 text-center transition hover:-translate-y-1 hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:gap-2 sm:px-2 sm:py-3">
                <span className="flex size-10 items-center justify-center rounded-full border border-border/70 bg-transparent text-foreground shadow-[0_8px_26px_-18px_rgba(0,0,0,0.55)] transition duration-300 group-hover:border-black/60 group-hover:text-black group-hover:shadow-[0_18px_30px_-20px_rgba(0,0,0,0.7)] dark:group-hover:border-white/60 dark:group-hover:text-white sm:size-14">
                  <SportIcon sport={item.sport} className="size-5 sm:size-6" />
                </span>
                <span className="font-heading text-[0.66rem] leading-tight font-bold tracking-normal text-foreground sm:text-[0.825rem] sm:tracking-wide">
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
                Find your way outside
              </p>
            </div>
            <Link
              href="/trips"
              className="flex shrink-0 items-center gap-1 text-sm font-semibold text-foreground underline-offset-4 transition hover:text-orange-700 hover:underline"
            >
              Browse all trips
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 sm:gap-4">
            {travelStyles.map((style) => {
              const isComingSoon = style.tripCount === 0;

              return (
                <Link
                  key={style.id}
                  href={`/trips?travelStyle=${encodeURIComponent(style.slug)}`}
                  className="group relative aspect-[4/3] min-w-0 overflow-hidden rounded-[1rem] bg-muted shadow-[0_8px_26px_-18px_rgba(0,0,0,0.55)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_38px_-20px_rgba(0,0,0,0.7)]"
                >
                  {style.image ? <Image src={style.image} alt="" fill className="object-cover transition duration-500 group-hover:scale-105" sizes="(max-width: 1023px) calc(33vw - 16px), 16vw" loading="lazy" /> : null}
                  <div className={`absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent ${isComingSoon ? "bg-slate-950/25" : ""}`} />
                  <div className="relative z-10 flex h-full flex-col items-start justify-end px-3 pb-1 pt-3 sm:px-4 sm:pb-2 sm:pt-4">
                    {isComingSoon ? (
                      <p className="text-[0.55rem] font-bold uppercase tracking-[0.18em] text-white/80 sm:text-[0.65rem]">
                        Coming soon
                      </p>
                    ) : null}
                    <p className="font-heading text-[0.85rem] font-semibold tracking-wide text-white sm:text-[1.15rem]">
                      {style.name}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-b border-border/60 px-3 pt-4 pb-4 sm:px-6 sm:pt-5 sm:pb-6 lg:px-8">
           <div className="mx-auto max-w-8xl">
             <div className="mb-3 flex flex-col gap-1 px-1 sm:mb-4 sm:px-2">
               <p className="text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                Experiences created by outdoor experts
               </p>
               <h4 className="font-heading text-2xl font-semibold tracking-wide text-foreground sm:text-3xl">
                Small-group trips, courses and expeditions designed and led by people who know their craft
               </h4>
           </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5">
             {visibleTrips.length === 0 ? (
               <p className="col-span-full rounded-[1rem] border border-dashed border-border/80 bg-background/70 px-4 py-10 text-center text-sm text-muted-foreground">
                 No trips match your search yet. Try a broader destination or trip name.
               </p>
             ) : null}
                 {visibleTrips.map((trip, index) => (
                    <div key={trip.id} className={index > 3 ? "hidden w-full min-w-0 xl:flex" : "flex w-full min-w-0"}>
                        <TripCard imageOnly showPrice={false} slideshow reducedMobileHeight trip={trip} />
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
                <span>Browse All Trips</span>
                <ArrowRight className="h-4 w-4" />
              </span>
            </Button>
          </div>
        </div>

        <div className="border-b border-border/60 bg-background/95 px-3 pt-4 pb-4 sm:px-6 sm:pt-8 sm:pb-5 lg:px-8">
          <div className="mx-auto w-full max-w-8xl">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Meet the people behind the adventure
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

        <section
          aria-labelledby="why-choose-radikal"
          className="border-b border-border/60 bg-background px-3 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-5 lg:px-8"
        >
          <div className="mx-auto w-full max-w-8xl">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                The Radikal difference
              </p>
              <h4
                id="why-choose-radikal"
                className="mt-2 font-heading text-2xl font-semibold tracking-wide text-foreground sm:text-3xl"
              >
                Why choose Radikal?
              </h4>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                More support around every adventure, whether you are building confidence outside or building a life as a guide.
              </p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <article className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-background px-5 pt-4 pb-5 shadow-[0_16px_32px_-24px_rgba(0,0,0,0.55)] dark:bg-card sm:px-6 sm:pt-5 sm:pb-6">
                <div className="absolute inset-x-0 top-0 h-1 bg-foreground" />
                <div className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground">
                    <Footprints className="size-5" />
                  </span>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    For travellers
                  </p>
                </div>
                <h5 className="mt-0 font-heading text-2xl font-semibold text-foreground">
                  Go further, with confidence
                </h5>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Learn alongside trusted experts and keep the support you need close at hand.
                </p>
                <ul className="mt-4 grid gap-3 pt-2 sm:grid-cols-2">
                  <li className="flex gap-3">
                    <GraduationCap className="mt-0.5 size-4 shrink-0 text-foreground" />
                    <span className="text-sm leading-5 text-foreground/80">
                      <strong className="font-semibold text-foreground">Personal coaching</strong>
                      <br />Learn hands-on at your own pace
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <HeartHandshake className="mt-0.5 size-4 shrink-0 text-foreground" />
                    <span className="text-sm leading-5 text-foreground/80">
                      <strong className="font-semibold text-foreground">Insurance coverage</strong>
                      <br />More peace of mind for every trip
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0 text-foreground" />
                    <span className="text-sm leading-5 text-foreground/80">
                      <strong className="font-semibold text-foreground">Emergency SOS services</strong>
                      <br />Support when the unexpected happens
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <Footprints className="mt-0.5 size-4 shrink-0 text-foreground" />
                    <span className="text-sm leading-5 text-foreground/80">
                      <strong className="font-semibold text-foreground">Progression record</strong>
                      <br />Track the skills and days you have earned
                    </span>
                  </li>
                </ul>
              </article>

              <article className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-background px-5 pt-4 pb-5 shadow-[0_16px_32px_-24px_rgba(0,0,0,0.55)] dark:bg-card sm:px-6 sm:pt-5 sm:pb-6">
                <div className="absolute inset-x-0 top-0 h-1 bg-foreground" />
                <div className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground">
                    <Compass className="size-5" />
                  </span>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    For guides
                  </p>
                </div>
                <h5 className="mt-0 font-heading text-2xl font-semibold text-foreground">
                  Spend more time in the field
                </h5>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Bring your expertise and local knowledge. Radikal supports the work around every great trip.
                </p>
                <ul className="mt-4 grid gap-3 pt-2 sm:grid-cols-2">
                  <li className="flex gap-3">
                    <Compass className="mt-0.5 size-4 shrink-0 text-foreground" />
                    <span className="text-sm leading-5 text-foreground/80">
                      <strong className="font-semibold text-foreground">Get discovered</strong>
                      <br />Help the right travellers find your work
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <Calendar className="mt-0.5 size-4 shrink-0 text-foreground" />
                    <span className="text-sm leading-5 text-foreground/80">
                      <strong className="font-semibold text-foreground">Bookings and payments</strong>
                      <br />Keep departures and admin organised
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <Package className="mt-0.5 size-4 shrink-0 text-foreground" />
                    <span className="text-sm leading-5 text-foreground/80">
                      <strong className="font-semibold text-foreground">Equipment sourcing</strong>
                      <br />Coordinate what every group needs
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <UserRound className="mt-0.5 size-4 shrink-0 text-foreground" />
                    <span className="text-sm leading-5 text-foreground/80">
                      <strong className="font-semibold text-foreground">A profile that builds trust</strong>
                      <br />Show your skills beyond the trail
                    </span>
                  </li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <div className="-mt-8 bg-background/95 px-3 pt-4 pb-6 sm:px-6 sm:pt-6 sm:pb-8 lg:px-8">
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
