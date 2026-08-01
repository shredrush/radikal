"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";

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
import { Input } from "@/components/ui/input";

const CATEGORY_LABELS: Record<string, string> = {
  ADVENTURE_ENTHUSIAST: "Adventure Enthusiast",
  WOMEN_ONLY: "Women Only",
  CORPORATE: "Corporate",
  LUXURY: "Luxury",
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
  guide: { name: string } | null;
};

export function SearchableTrips({ activities }: { activities: ActivityCardItem[] }) {
  const [query, setQuery] = useState("");

  const filteredActivities = useMemo(() => {
    const searchTerm = query.trim().toLowerCase();

    if (!searchTerm) {
      return activities.slice(0, 3);
    }

    return activities.filter((activity) => {
      const haystack = [
        activity.title,
        activity.description,
        activity.location,
        activity.guide?.name,
        ...activity.categories,
        activity.categories.map((category) => CATEGORY_LABELS[category] ?? category).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(searchTerm);
    });
  }, [activities, query]);

  const hasSearchQuery = query.trim().length > 0;
  const visibleActivities = filteredActivities;
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
  ];

  const testimonials = [
    {
      name: "Riya S.",
      trip: "Snowboard Escape in Gulmarg",
      quote:
        "Every detail felt effortless. The guide was calm, knowledgeable, and made our first snowboarding experience unforgettable.",
      image:
        "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Arjun M.",
      trip: "Ladakh Bike Adventure",
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
  ];

  return (
    <section
      id="upcoming-trips"
      className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 sm:py-16"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-2">
        <h3 className="font-heading text-2xl font-semibold tracking-wide text-foreground sm:text-3xl">
          Find your Himalayan adventure
        </h3>
        <p className="text-lg text-muted-foreground">
          Small groups with certified local guides
        </p>
        <div className="relative w-full">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by destination, activity or guide"
            className="h-12 w-full rounded-full border-border/80 bg-background px-4 text-base shadow-sm"
          />
          {hasSearchQuery ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute inset-y-0 right-3 flex items-center text-sm font-medium text-[#1d4ed8] transition hover:text-[#1e40af]"
            >
              Clear
            </button>
          ) : null}
        </div>

        <div className="mt-6 grid w-full grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            {
              title: "Trek",
              image:
                "https://images.unsplash.com/photo-1607836046730-3317bd58a31b??auto=format&fit=crop&w=900&q=80",
            },
            {
              title: "Snowboard",
              image:
                "https://plus.unsplash.com/premium_photo-1708612612949-b2eaa75af46d?auto=format&fit=crop&w=900&q=80",
            },
            {
              title: "Bike",
              image:
                "https://images.unsplash.com/photo-1575548393466-0df1618ba410?auto=format&fit=crop&w=900&q=80",
            },
            {
              title: "Climb",
              image:
                "https://images.unsplash.com/photo-1643903096045-07741be1f245?auto=format&fit=crop&w=900&q=80",
            },
            {
              title: "Ski",
              image:
                "https://images.unsplash.com/photo-1586356415056-bd7a5c2bbef7?auto=format&fit=crop&w=900&q=80",
            },
            {
              title: "Mix it up!",
              image:
                "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80",
            },
          ].map((item) => (
            <Link
              key={item.title}
              href="/trips"
              className="relative flex h-[234px] w-full items-end overflow-hidden rounded-[1.25rem] border border-border/70 bg-muted/60 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.3)] sm:h-[195px]"
              style={{ backgroundImage: `url(${item.image})`, backgroundSize: "cover", backgroundPosition: "center" }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="relative z-10 p-3">
                <p className="text-lg font-semibold text-white">{item.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div
        className="flex flex-col gap-8 rounded-[2rem] border border-white/10 bg-cover bg-center p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)] sm:p-8"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(15,23,42,0.82) 0%, rgba(30,64,175,0.55) 45%, rgba(14,165,233,0.35) 100%), url('https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1800&q=80')",
        }}
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/90">
            Travel styles
          </p>
          <p className="text-base text-white/80">
            Find the suitable style according to your needs
          </p>
        </div>
        <div className="flex w-full flex-wrap items-stretch gap-3">
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
              title: "Family",
              image:
                "https://images.unsplash.com/photo-1503431153573-96e959f4d9b7?auto=format&fit=crop&w=900&q=80",
            },
            {
              title: "Education",
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
              className="relative flex min-h-[160px] flex-1 basis-[calc(20%-0.75rem)] items-end overflow-hidden rounded-[1.25rem] border border-border/70 bg-muted/60 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.3)] sm:min-h-[190px]"
              style={{ backgroundImage: `url(${item.image})`, backgroundSize: "cover", backgroundPosition: "center" }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="relative z-10 p-3">
                <p className="text-lg font-semibold text-white">{item.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div
        className="rounded-[2rem] border border-white/10 bg-cover bg-center p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)] sm:p-8"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(15,23,42,0.78) 0%, rgba(29,78,216,0.54) 45%, rgba(14,165,233,0.3) 100%), url('https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1800&q=80')",
        }}
      >
        {hasSearchQuery && visibleActivities.length === 0 ? (
          <div className="rounded-[1.25rem] border border-white/20 bg-white/10 p-6 text-center text-white/90 backdrop-blur-sm">
            <p className="text-lg font-semibold">No adventures match your search yet.</p>
            <p className="mt-2 text-sm text-white/70">Try searching for a region, activity, or guide name.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {visibleActivities.map((activity) => (
              <Card
                key={activity.id}
                className="w-[320px] shrink-0 overflow-hidden rounded-[1.5rem] border border-border/70 bg-card/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.35)]"
              >
                <div className="h-1.5 bg-[#1d4ed8]" />
                <CardHeader className="gap-4">
                  <div className="flex flex-wrap gap-1.5">
                    {activity.categories.map((category) => (
                      <Badge key={category} variant="secondary" className="rounded-full border border-border/70 bg-background/80 text-foreground/80">
                        {CATEGORY_LABELS[category] ?? category}
                      </Badge>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-xl text-foreground">{activity.title}</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
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
                    <span className="rounded-full border border-border px-3 py-1 bg-background/80">
                      {activity.durationDays} {activity.durationDays === 1 ? "day" : "days"}
                    </span>
                    <span className="rounded-full border border-border px-3 py-1 bg-background/80 capitalize">
                      {activity.difficulty.toLowerCase()}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-[#1d4ed8]/30 bg-white/80 text-[#1d4ed8] hover:bg-[#1d4ed8]/5"
                    nativeButton={false}
                    render={<Link href={`/trips/${activity.slug}`} />}
                  >
                    View details
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-full"
                    nativeButton={false}
                    render={<Link href={`/booking/${activity.id}/checkout`} />}
                  >
                    Book now
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
         )}
         <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-[#1d4ed8]/30 bg-white/80 text-[#1d4ed8] hover:bg-[#1d4ed8]/5"
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
 
        <div
          className="rounded-[2rem] border border-white/10 bg-cover bg-center p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)] sm:p-8"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(15,23,42,0.78) 0%, rgba(29,78,216,0.54) 45%, rgba(14,165,233,0.3) 100%), url('https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1800&q=80')",
          }}
        >
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/90">
              Certified local guides
            </p>
            <h4 className="mt-2 font-heading text-3xl font-semibold tracking-wide text-white sm:text-4xl">
              Trusted guides for every ridge and valley
            </h4>
            <p className="mt-3 text-base text-white/80">
              We partner with trusted local guides who are well versed with terrain.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {guideProfiles.map((guide) => (
              <Card key={guide.name} className="rounded-[1.5rem] border border-border/70 bg-card/95 p-4 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.18)] sm:p-6">
                <CardHeader className="gap-4 p-0">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <img
                      src={guide.image}
                      alt={guide.name}
                      className="h-80 w-full rounded-[1.25rem] object-cover shadow-md sm:h-96"
                    />
                    <div>
                      <CardTitle className="text-lg text-foreground">{guide.name}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">{guide.region}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="mt-4 space-y-3 p-0">
                  <div className="flex flex-wrap gap-2">
                    {guide.certifications.map((certification) => (
                      <Badge key={certification} className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-sm font-medium text-foreground/90">
                        {certification}
                      </Badge>
                    ))}
                  </div>
                  <div className="rounded-full border border-border px-3 py-2 text-sm text-muted-foreground">
                    {guide.adventuresLed} adventures led
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div
          className="rounded-[2rem] border border-white/10 bg-cover bg-center p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)] sm:p-8"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(15,23,42,0.78) 0%, rgba(29,78,216,0.54) 45%, rgba(14,165,233,0.3) 100%), url('https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?auto=format&fit=crop&w=1800&q=80')",
          }}
        >
          <div className="max-w-3xl">
            <h4 className="mt-2 font-heading text-3xl font-semibold tracking-wide text-white sm:text-4xl">
              Travelers love the Radikal experience
            </h4>
            <p className="mt-3 text-base text-white/80">
              Real stories from people who chose small-group adventures in the Himalayas.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name} className="rounded-[1.75rem] border border-border/70 bg-card/95 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.18)] sm:p-8">
                <CardContent className="space-y-4 p-0">
                  <p className="text-lg font-semibold leading-8 text-foreground">“{testimonial.quote}”</p>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.trip}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

      {filteredActivities.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No trips match your search yet. Try a broader destination or activity name.
        </p>
      ) : null}

      <footer className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#0f172a] via-[#1d4ed8] to-[#0ea5e9] p-8 text-white shadow-[0_20px_60px_-35px_rgba(0,0,0,0.35)] sm:p-10">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl flex-1">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
              Radikal
            </p>
            <h4 className="mt-3 font-heading text-3xl font-semibold tracking-wide sm:text-4xl">
              Plan your next Himalayan escape with confidence
            </h4>
            <p className="mt-3 text-base leading-7 text-white/80">
              Discover curated, small-group adventures with certified local guides, flexible custom itineraries, and meaningful travel designed around the Indian Himalayas.
            </p>
          </div>

          <div className="ml-auto flex w-full max-w-[420px] justify-start pl-8 text-sm lg:justify-start lg:pl-32">
            <div className="space-y-3">
              <p className="font-semibold uppercase tracking-[0.2em] text-white/70">Explore</p>
              <div className="flex flex-col gap-2 text-white/80">
                <Link href="/" className="transition hover:text-white">
                  Home
                </Link>
                <Link href="/trips" className="transition hover:text-white">
                  Trips
                </Link>
                <Link href="#upcoming-trips" className="transition hover:text-white">
                  Featured journeys
                </Link>
                <Link href="/login" className="transition hover:text-white">
                  Login
                </Link>
                <Link href="/signup" className="transition hover:text-white">
                  Create account
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/15 pt-6 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Radikal. Crafted for unforgettable Himalayan journeys.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/trips" className="transition hover:text-white">
              Adventures
            </Link>
            <Link href="/login" className="transition hover:text-white">
              Support
            </Link>
            <Link href="/signup" className="transition hover:text-white">
              Join the community
            </Link>
          </div>
        </div>
      </footer>
    </section>
  );
}
