import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import {
  ArrowRight,
  Compass,
  Footprints,
  GraduationCap,
  HandCoins,
  HeartHandshake,
  Home,
  Leaf,
  Lightbulb,
  Mountain,
  Sparkles,
  Sprout,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { prisma, safeDb } from "@/lib/prisma";
import { orderGuidesByFeaturedUsernames } from "@/lib/guides";
import { ACCENT_PILL, ACCENT_PILL_EMERALD } from "@/lib/card-styles";
import { GuideCard } from "@/components/guides/guide-card";
import { CommunityGuideMedia } from "@/components/guides/community-guide-media";
import { AuthenticatedLink } from "@/components/authenticated-link";

export const metadata: Metadata = {
  title: "Community | Radikal",
  description: "Radikal is a travel platform that connects outdoor enthusiasts with certified expert guides for small-group, sustainable adventures. Discover unique experiences, learn the skills, share your stories, and explore the world responsibly.",
};

// Guide roster changes rarely; avoid a DB round-trip on every request.
const getCommunityGuides = unstable_cache(
  async () => {
    const guides = await prisma.guide.findMany({
      where: { deletedAt: null, user: { deletedAt: null } },
      orderBy: { name: "asc" },
      include: {
        certifications: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
        user: { select: { username: true } },
        _count: {
          select: { trips: true },
        },
        trips: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { images: true },
        },
      },
    });

    return orderGuidesByFeaturedUsernames(guides);
  },
  ["community-guides"],
  { tags: ["guides"], revalidate: 3600 },
);

type PillarTone = "orange" | "blue" | "green";

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
    title: "Learning based approach",
    tagline: "Learn by doing",
    description:
      "Every journey is a chance to pick up real outdoor skills from certified experts — hands-on practice, personal coaching and knowledge you'll carry far beyond the trail.",
    icon: GraduationCap,
    tone: "blue",
    points: [
      { icon: GraduationCap, text: "Qualified instructors on every course" },
      { icon: Compass, text: "Hands-on practice in the field" },
      { icon: Footprints, text: "Progress at your own pace" },
      { icon: Lightbulb, text: "Skills that last beyond the trip" },
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
      { icon: HandCoins, text: "Certified local guides" },
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
    card: "bg-gradient-to-br from-orange-50/80 via-white to-white shadow-[0_1px_2px_rgba(0,0,0,0.05),0_12px_32px_-18px_rgba(0,0,0,0.35)] dark:from-orange-500/10 dark:via-card dark:to-card dark:shadow-[0_1px_2px_rgba(0,0,0,0.5),0_12px_32px_-18px_rgba(0,0,0,0.75)]",
    iconBadge: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
    tagline: "text-orange-700 dark:text-orange-300",
    pointIcon: "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
    divider: "border-orange-100 dark:border-orange-500/15",
    topBar: "bg-orange-500",
  },
  blue: {
    card: "bg-gradient-to-br from-blue-50/80 via-white to-white shadow-[0_1px_2px_rgba(0,0,0,0.05),0_12px_32px_-18px_rgba(0,0,0,0.35)] dark:from-blue-500/10 dark:via-card dark:to-card dark:shadow-[0_1px_2px_rgba(0,0,0,0.5),0_12px_32px_-18px_rgba(0,0,0,0.75)]",
    iconBadge: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    tagline: "text-blue-700 dark:text-blue-300",
    pointIcon: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
    divider: "border-blue-100 dark:border-blue-500/15",
    topBar: "bg-blue-500",
  },
  green: {
    card: "bg-gradient-to-br from-emerald-50/80 via-white to-white shadow-[0_1px_2px_rgba(0,0,0,0.05),0_12px_32px_-18px_rgba(0,0,0,0.35)] dark:from-emerald-500/10 dark:via-card dark:to-card dark:shadow-[0_1px_2px_rgba(0,0,0,0.5),0_12px_32px_-18px_rgba(0,0,0,0.75)]",
    iconBadge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    tagline: "text-emerald-700 dark:text-emerald-300",
    pointIcon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    divider: "border-emerald-100 dark:border-emerald-500/15",
    topBar: "bg-emerald-500",
  },
};

export default async function CommunityPage() {
  const guides = await safeDb("community.guides", () => getCommunityGuides(), []);
  const guideMedia = guides.flatMap((guide) =>
    (guide.photos ?? []).filter(Boolean).map((src, index) => ({
      src,
      alt: `${guide.name} photo ${index + 1}`,
      username: guide.user?.username ?? "",
    })).filter((guide) => guide.username),
  );

  return (
    <div className="flex-1">
      <div className="mx-auto flex w-full max-w-8xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <section className="overflow-hidden rounded-[2rem] border border-border/70 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)]">
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="flex w-full flex-col items-center gap-4 text-center">
              <div className={`inline-flex items-center gap-2 rounded-full border ${ACCENT_PILL} px-3 py-1.5 text-sm font-medium`}>
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
                <AuthenticatedLink
                  authenticatedHref="/trips"
                  unauthenticatedHref="/login"
                  className="rounded-full border border-emerald-300 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-500/40 dark:bg-transparent dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                >
                  Join the community
                </AuthenticatedLink>
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

            <div className="mt-7 grid w-full gap-3 md:grid-cols-3 lg:mt-8">
              {pillars.map((pillar) => {
                const Icon = pillar.icon;
                const tone = pillarToneStyles[pillar.tone];

                return (
                  <div
                    key={pillar.title}
                    className={`relative flex flex-col overflow-hidden rounded-[1.75rem] p-6 transition-transform duration-200 hover:-translate-y-1 sm:p-6 ${tone.card}`}
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
            <div className={`inline-flex w-fit items-center gap-2 rounded-full border ${ACCENT_PILL_EMERALD} px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.25em]`}>
              <Leaf className="h-3.5 w-3.5" />
              Meet the guides
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Experienced leaders behind every journey
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                Our guides bring deep regional knowledge, safety expertise and a personal connection to the places you travel.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
            {guides.length === 0 ? (
              <p className="col-span-full rounded-[1.5rem] border border-dashed border-border/80 bg-background/70 px-4 py-10 text-center text-sm text-muted-foreground">
                Our guide roster is taking a short break — check back in a few minutes.
              </p>
            ) : (
              guides.map((guide) => (
                <GuideCard
                  key={guide.id}
                  variant="community"
                  guide={{
                    username: guide.user?.username ?? "",
                    name: guide.name,
                    location: guide.location,
                    photo: guide.photo,
                    photos: guide.photos,
                    tripImage: guide.trips[0]?.images[0],
                    bio: guide.bio,
                    experienceYears: guide.experienceYears,
                    certifications: guide.certifications.map((certification) => certification.title),
                    languages: guide.languages,
                  }}
                />
              ))
            )}
          </div>

          <div className="mt-8 flex justify-center">
            <Link
              href="/become-a-guide"
              className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              Become a Guide
              <ArrowRight size={16} />
            </Link>
          </div>
          </div>
        </section>

        <CommunityGuideMedia items={guideMedia} />
      </div>
    </div>
  );
}
