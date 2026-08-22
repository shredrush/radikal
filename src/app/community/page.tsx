import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import {
  ArrowRight,
  Compass,
  Footprints,
  HandCoins,
  HeartHandshake,
  Home,
  Leaf,
  MapPin,
  Mountain,
  ShieldCheck,
  Sparkles,
  Sprout,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Community | Radikal",
  description: "Radikal connects vetted local guides with travellers seeking small-group, sustainable adventures in nature.",
};

// Guide roster changes rarely; avoid a DB round-trip on every request.
const getCommunityGuides = unstable_cache(
  async () => {
    return prisma.guide.findMany({
      orderBy: { name: "asc" },
      include: {
        certifications: {
          orderBy: { yearIssued: "desc" },
          take: 3,
        },
        _count: {
          select: { activities: true },
        },
      },
    });
  },
  ["community-guides"],
  { tags: ["guides"], revalidate: 3600 },
);

const guideImageMap: Record<string, string> = {
  tenzin: "https://images.unsplash.com/photo-1601224748193-d24f166b5c77?auto=format&fit=crop&w=900&q=80",
  tashi: "https://images.unsplash.com/photo-1599405653894-8a595f692abf?auto=format&fit=crop&w=900&q=80",
  meera: "https://images.unsplash.com/photo-1661892526325-813afd121a4e?auto=format&fit=crop&w=900&q=80",
  nawang: "https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?auto=format&fit=crop&w=900&q=80",
  pema: "https://images.unsplash.com/photo-1548789997-82da68437ad8?auto=format&fit=crop&w=900&q=80",
};

type PillarTone = "orange" | "green";

const pillars: {
  title: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  tone: PillarTone;
  points: { icon: LucideIcon; text: string }[];
}[] = [
  {
    title: "Small-group travel",
    tagline: "Fewer people, more meaning",
    description:
      "We keep groups intentionally small so every journey feels personal — more freedom, more connection, and far less crowding on the trails.",
    icon: Users,
    tone: "orange",
    points: [
      { icon: Users, text: "Groups capped at around 8 travellers" },
      { icon: Footprints, text: "Flexible, unhurried itineraries" },
      { icon: HeartHandshake, text: "Genuine connection with guides and locals" },
      { icon: Compass, text: "Quieter trails and hidden spots" },
    ],
  },
  {
    title: "Sustainable exploration",
    tagline: "Travel that gives back",
    description:
      "Every trip is designed to protect the places we love and support the people who call them home — travelling lightly and leaving things better than we found them.",
    icon: Leaf,
    tone: "green",
    points: [
      { icon: HandCoins, text: "Local guides and fair wages" },
      { icon: Home, text: "Homestays and local businesses" },
      { icon: Sprout, text: "Leave-no-trace principles" },
      { icon: Mountain, text: "Protecting fragile landscapes" },
    ],
  },
];

const pillarToneStyles: Record<
  PillarTone,
  {
    card: string;
    iconBadge: string;
    tagline: string;
    pointIcon: string;
    divider: string;
    topBar: string;
  }
> = {
  orange: {
    card: "border-orange-200/70 bg-gradient-to-br from-orange-50/80 via-white to-white dark:border-orange-500/20 dark:from-orange-500/10 dark:via-card dark:to-card",
    iconBadge: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
    tagline: "text-orange-700 dark:text-orange-300",
    pointIcon: "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
    divider: "border-orange-100 dark:border-orange-500/15",
    topBar: "bg-orange-500",
  },
  green: {
    card: "border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 via-white to-white dark:border-emerald-500/20 dark:from-emerald-500/10 dark:via-card dark:to-card",
    iconBadge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    tagline: "text-emerald-700 dark:text-emerald-300",
    pointIcon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    divider: "border-emerald-100 dark:border-emerald-500/15",
    topBar: "bg-emerald-500",
  },
};

export default async function CommunityPage() {
  const guides = await getCommunityGuides();
  return (
    <div className="flex-1">
      <div className="mx-auto flex w-full max-w-8xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <section className="overflow-hidden rounded-[2rem] border border-border/70 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)]">
          <div className="px-6 py-7 sm:px-8 lg:px-10 lg:py-8">
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
                <Sparkles className="h-3.5 w-3.5" />
                The Radikal Community
              </div>

              <div className="space-y-3">
                <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Meaningful adventures, made responsibly
                </h1>
                <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground">
                  We bring together adventure seekers and local experts to create journeys that are personal, responsible and deeply rooted in place. Small groups, sustainable choices, and a community that cares.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/trips"
                  className="inline-flex items-center gap-2 rounded-full bg-orange-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-800"
                >
                  Explore trips
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/login"
                  className="rounded-full border border-emerald-300 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-500/40 dark:bg-transparent dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                >
                  Join the community
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  Vetted  guides
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Small group sizes
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  Leave-no-trace travel
                </span>
              </div>
            </div>

            <div className="mx-auto mt-7 grid w-full max-w-3xl gap-3 md:grid-cols-2 lg:mt-8">
              {pillars.map((pillar) => {
                const Icon = pillar.icon;
                const tone = pillarToneStyles[pillar.tone];

                return (
                  <div
                    key={pillar.title}
                    className={`relative flex flex-col overflow-hidden rounded-[1.75rem] border p-6 shadow-sm sm:p-6 ${tone.card}`}
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 ${tone.topBar}`} />

                    <div className="flex items-center gap-4">
                      <div className={`rounded-2xl p-3 ${tone.iconBadge}`}>
                        <Icon size={22} />
                      </div>
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${tone.tagline}`}>
                          {pillar.tagline}
                        </p>
                        <h3 className="font-heading text-2xl font-semibold text-foreground">
                          {pillar.title}
                        </h3>
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-muted-foreground">
                      {pillar.description}
                    </p>

                    <ul className={`mt-6 flex flex-col gap-3 border-t pt-6 ${tone.divider}`}>
                      {pillar.points.map((point) => {
                        const PointIcon = point.icon;
                        return (
                          <li key={point.text} className="flex items-start gap-3">
                            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${tone.pointIcon}`}>
                              <PointIcon size={13} />
                            </span>
                            <span className="text-sm leading-6 text-foreground/80">{point.text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-border/70 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)]">
          <div className="h-1 bg-gradient-to-r from-orange-500 via-emerald-500 to-orange-400" />
          <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-4 pb-6 sm:pb-8">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              <Leaf className="h-3.5 w-3.5" />
              Meet the guides
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Experienced local leaders behind every journey
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                Our guides bring deep regional knowledge, safety expertise and a personal connection to the places you travel.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
            {guides.map((guide) => (
              <Link key={guide.id} href={`/${guide.slug}`} className="group block">
                <article className="h-full overflow-hidden rounded-[1.25rem] border border-orange-100 bg-card/95 shadow-[0_16px_45px_-28px_rgba(249,115,22,0.25)] transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_30px_55px_-25px_rgba(16,185,129,0.3)] dark:border-orange-500/15 dark:hover:border-emerald-500/30">
                  <div className="relative h-56 overflow-hidden sm:h-60 xl:h-64">
                    <Image
                      src={guide.photo ?? guideImageMap[guide.slug] ?? "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=900&q=80"}
                      alt={guide.name}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 20vw"
                    />
                  </div>

                  <div className="space-y-4 p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-heading text-xl font-semibold text-foreground">{guide.name}</h3>
                        <div className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[0.6rem] font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                          <ShieldCheck className="h-3 w-3" />
                          Vetted
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{guide.location}</span>
                      </div>
                    </div>

                    <p className="text-sm leading-6 text-muted-foreground">
                      {guide.bio.length > 120 ? `${guide.bio.slice(0, 120)}...` : guide.bio}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {guide.certifications.slice(0, 2).map((certification) => (
                        <span
                          key={certification.id}
                          className="rounded-full border border-orange-200 bg-orange-50 px-2 py-1 text-[0.65rem] font-medium text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300"
                        >
                          {certification.title}
                        </span>
                      ))}
                    </div>

                    <div className="border-t border-emerald-100 pt-3 dark:border-emerald-500/15">
                      <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                        Languages
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {guide.languages.map((language) => (
                          <span
                            key={`${guide.id}-${language}`}
                            className="rounded-full bg-emerald-50 px-2 py-1 text-[0.68rem] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                          >
                            {language}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
          </div>
        </section>
      </div>
    </div>
  );
}
