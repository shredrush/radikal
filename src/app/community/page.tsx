import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import {
  ArrowRight,
  Compass,
  Footprints,
  GraduationCap,
  Book,
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
import { ACCENT_PILL } from "@/lib/card-styles";
import { CommunityGuideMedia } from "@/components/guides/community-guide-media";

export const metadata: Metadata = {
  title: "Community | Radikal",
  description:
    "Radikal is a travel platform that connects outdoor enthusiasts with certified expert guides for small-group, sustainable adventures. Discover unique experiences, learn the skills, share your stories, and explore the world responsibly.",
};

// Guide media changes rarely; avoid a DB round-trip on every request.
const getCommunityGuideMedia = unstable_cache(
  async () =>
    prisma.guide.findMany({
      where: { deletedAt: null, user: { deletedAt: null } },
      orderBy: { name: "asc" },
      select: { name: true, photos: true },
    }),
  ["community-guide-media"],
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
    title: "Radikal Safety Standards",
    tagline: "Safety, built in to every adventure",
    description:
      "Trips are designed and led with safety built into every step of the journey. We prioritize your well-being so you can focus on the experience",
    icon: Users,
    tone: "orange",
    points: [
      { icon: GraduationCap, text: "Verified experienced experts" },
      { icon: Compass, text: "Equipment standards" },
      { icon: Book, text: "Comprehensive safety protocols" },
      { icon: HeartHandshake, text: "Insurance coverage" },
    ],
  },
  {
    title: "Learn by doing",
    tagline: "Leave with a skill, not just a photo",
    description:
      "Every journey is a chance to pick up real outdoor skills from certified experts — hands-on practice, personal coaching and knowledge you'll carry far beyond the trail",
    icon: GraduationCap,
    tone: "blue",
    points: [
      { icon: GraduationCap, text: "Learning driven approach" },
      { icon: Compass, text: "Hands-on practice in the field" },
      { icon: Footprints, text: "Progress at your own pace" },
      { icon: Lightbulb, text: "Skills that last beyond the trip" },
    ],
  },
  {
    title: "Sustainable exploration",
    tagline: "Fewer people, more meaning",
    description:
      "We keep groups intentionally small so every journey feels personal. Every trip is designed to protect the places we love and support the people who call them home",
    icon: Leaf,
    tone: "green",
    points: [
      { icon: Users, text: "Small groups" },
      { icon: Home, text: "Homestays and local businesses" },
      { icon: Compass, text: "Quieter trails and hidden spots" },
      { icon: Sprout, text: "Leave-no-trace principles" },
    ],
  },
];

const pillarToneStyles: Record<
  PillarTone,
  { card: string; iconBadge: string; tagline: string; pointIcon: string; divider: string; topBar: string }
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
  const mediaGuides = await safeDb("community.guide-media", () => getCommunityGuideMedia(), []);
  const guideMedia = mediaGuides.flatMap((guide) =>
    (guide.photos ?? [])
      .filter(Boolean)
      .map((src, index) => ({
        src,
        alt: `${guide.name} photo ${index + 1}`,
      })),
  );
  return (
    <div className="flex-1">
      <div className="mx-auto flex w-full max-w-8xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-br from-orange-50/70 via-background to-emerald-50/70 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)] dark:from-orange-500/10 dark:via-card dark:to-emerald-500/10">
          <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[minmax(0,1.1fr)_minmax(19rem,0.9fr)] md:items-start md:gap-12 md:p-10">
            <div className="flex max-w-3xl flex-col items-start text-left">
              <div className={`inline-flex items-center gap-2 rounded-full border ${ACCENT_PILL} px-3 py-1.5 text-sm font-medium`}>
                <Sparkles className="h-3.5 w-3.5" />
                More than a trip. A community
              </div>

              <h1 className="mt-5 max-w-3xl font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Learn the skills
                <br />
                Live the adventure
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                Radikal brings curious travellers and experienced guides together through small-group adventures designed around learning, connection and respect for the places we explore
              </p>

              <div className="mt-7 flex w-full flex-nowrap items-center justify-between gap-x-1.5 whitespace-nowrap text-[10px] text-muted-foreground sm:w-auto sm:flex-wrap sm:justify-start sm:gap-x-6 sm:gap-y-2 sm:text-sm">
                <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-orange-500" />Verified experts</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />Small groups</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />Learn by doing</span>
              </div>
            </div>

            <aside className="rounded-[1.5rem] border border-border/70 bg-background/75 p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] backdrop-blur-sm dark:bg-card/70 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <p className="pt-2 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-orange-700 dark:text-orange-300">
                  Built by guides, for guides
                </p>
                <Link
                  href="/become-a-guide"
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-orange-700 px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-orange-800"
                >
                  Become a Guide
                  <ArrowRight size={14} />
                </Link>
              </div>
              <h2 className="mt-3 font-heading text-2xl font-semibold tracking-tight text-foreground">
                The operating system for guides
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                A guide based platform that gives outdoor experts the tools, audience and support to build meaningful work outside
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex gap-3 rounded-2xl bg-orange-50/80 p-3 dark:bg-orange-500/10">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                    <Compass className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Get discovered</h3>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">You bring the expertise. We help people discover it</p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-2xl bg-blue-50/80 p-3 dark:bg-blue-500/10">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                    <Lightbulb className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Infrastructure for guides</h3>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">Bookings, payments and scheduling handled, so you focus on trail</p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-2xl bg-emerald-50/80 p-3 dark:bg-emerald-500/10">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    <Users className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Earn what you're worth</h3>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">Pricing set by you and transparent payouts, no race-to-the-bottom bidding</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="rounded-[2rem] border border-border/70 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)] sm:p-8 lg:p-10">
          <div className="max-w-2xl">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Why we travel this way</p>
            <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">A community built for safer and better time outside</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              const tone = pillarToneStyles[pillar.tone];

              return (
                <article key={pillar.title} className={`relative flex min-w-0 flex-col overflow-hidden rounded-[1.75rem] p-5 sm:p-6 ${tone.card}`}>
                  <div className={`absolute inset-x-0 top-0 h-1 ${tone.topBar}`} />
                  <div className="flex items-center gap-4">
                    <div className={`rounded-2xl p-3 ${tone.iconBadge}`}><Icon className="size-5" /></div>
                    <div>
                      <p className={`text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${tone.tagline}`}>{pillar.tagline}</p>
                      <h3 className="mt-1 font-heading text-xl font-semibold text-foreground">{pillar.title}</h3>
                    </div>
                  </div>
                  <p className="mt-5 text-sm leading-6 text-muted-foreground">{pillar.description}</p>
                  <ul className={`mt-5 flex flex-col gap-3 border-t pt-5 ${tone.divider}`}>
                    {pillar.points.map((point) => {
                      const PointIcon = point.icon;
                      return <li key={point.text} className="flex items-start gap-3"><span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${tone.pointIcon}`}><PointIcon className="size-3" /></span><span className="text-sm leading-5 text-foreground/80">{point.text}</span></li>;
                    })}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>

        <section id="about-us" className="overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-br from-stone-50 via-background to-orange-50/70 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.28)] dark:from-stone-950 dark:via-card dark:to-orange-500/10 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-8">
            <div className="max-w-3xl">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                About us
              </p>
              <h2 className="mt-4 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Born in the Himalayas, built for the world
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                Radikal began in the Himalayas, inspired by the guides whose local knowledge, care and leadership make every journey meaningful. We’re building the tools and community that help guides grow their work—and help more people experience the outdoors with purpose.
              </p>
            </div>
            <p className="justify-self-end whitespace-nowrap border-l-2 border-orange-500 pl-5 text-right font-heading text-lg leading-7 text-foreground sm:text-2xl sm:leading-9 lg:text-3xl lg:leading-10">
              Built by guides, for guides
            </p>
          </div>
        </section>

        <div className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Out in the field</p>
              <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">The places and people behind the plans.</h2>
            </div>
          </div>
          <CommunityGuideMedia items={guideMedia} />
        </div>
      </div>
    </div>
  );
}
