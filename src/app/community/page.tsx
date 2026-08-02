import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, Leaf, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Community | Radikal",
  description: "Radikal connects vetted local guides with travellers seeking small-group, sustainable adventures in nature.",
};

const pillars = [
  {
    title: "Vetted local guides",
    description:
      "We connect curious travellers with trusted local guides who know the terrain, the culture and the stories that make each journey unforgettable.",
    icon: Users,
  },
  {
    title: "Small-group travel",
    description:
      "We keep groups intentionally small so you can travel with more freedom, more connection and less crowding.",
    icon: Compass,
  },
  {
    title: "Sustainable exploration",
    description:
      "Every trip is designed to support local communities, protect fragile landscapes and help you slow down in nature.",
    icon: Leaf,
  },
];

export default function CommunityPage() {
  return (
    <div className="flex-1 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_35%)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <section className="overflow-hidden rounded-[2rem] border border-[#1d4ed8]/15 bg-white/80 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="grid gap-8 px-6 py-10 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:py-16">
            <div className="flex flex-col justify-center gap-6">
              <div className="inline-flex w-fit items-center rounded-full border border-[#1d4ed8]/15 bg-[#1d4ed8]/10 px-3 py-1.5 text-sm font-medium text-[#1d4ed8]">
                The Radikal community
              </div>
              <div className="space-y-4">
                <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  A community for travellers who want meaningful adventures in nature.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                  We bring together adventure seekers and local experts to create journeys that are personal, responsible and deeply rooted in place.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/trips"
                  className="inline-flex items-center gap-2 rounded-full bg-[#1d4ed8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af]"
                >
                  Explore trips
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/login"
                  className="rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition hover:border-[#1d4ed8]/30 hover:text-[#1d4ed8]"
                >
                  Join the community
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="w-full max-w-md rounded-[1.75rem] border border-[#1d4ed8]/15 bg-gradient-to-br from-[#eef4ff] via-white to-[#dbeafe] p-6 shadow-inner">
                <div className="rounded-[1.5rem] border border-white/60 bg-white/80 p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#1d4ed8]">What you can expect</p>
                  <ul className="mt-5 space-y-3 text-sm leading-7 text-muted-foreground">
                    <li className="flex gap-3">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#1d4ed8]" />
                      Carefully matched guides who are vetted for safety, experience and local knowledge.
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#1d4ed8]" />
                      Small-group travel that feels personal rather than packed.
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#1d4ed8]" />
                      Trips shaped around nature, slower pacing and responsible tourism.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;

            return (
              <article key={pillar.title} className="rounded-[1.5rem] border border-border/70 bg-background/80 p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]">
                <div className="mb-4 inline-flex rounded-full bg-[#1d4ed8]/10 p-3 text-[#1d4ed8]">
                  <Icon size={20} />
                </div>
                <h2 className="font-heading text-2xl font-semibold text-foreground">{pillar.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{pillar.description}</p>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
