import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Compass, Leaf, MapPin, ShieldCheck, Users } from "lucide-react";

import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Community | Radikal",
  description: "Radikal connects vetted local guides with travellers seeking small-group, sustainable adventures in nature.",
};

const guideImageMap: Record<string, string> = {
  tenzin: "https://images.unsplash.com/photo-1601224748193-d24f166b5c77?auto=format&fit=crop&w=900&q=80",
  tashi: "https://images.unsplash.com/photo-1599405653894-8a595f692abf?auto=format&fit=crop&w=900&q=80",
  ritu: "https://images.unsplash.com/photo-1548789997-82da68437ad8?auto=format&fit=crop&w=900&q=80",
  meera: "https://images.unsplash.com/photo-1661892526325-813afd121a4e?auto=format&fit=crop&w=900&q=80",
  nawang: "https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?auto=format&fit=crop&w=900&q=80",
  "tenzin-dorjee": "https://images.unsplash.com/photo-1601224748193-d24f166b5c77?auto=format&fit=crop&w=900&q=80",
  pema: "https://images.unsplash.com/photo-1548789997-82da68437ad8?auto=format&fit=crop&w=900&q=80",
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

export default async function CommunityPage() {
  const guides = await prisma.guide.findMany({
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
  return (
    <div className="flex-1 bg-[radial-gradient(circle_at_top_left,_rgba(17,17,17,0.08),_transparent_35%)]">
      <div className="mx-auto flex w-full max-w-8xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
        <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-white shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="grid gap-8 px-6 py-10 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:py-16">
            <div className="flex flex-col justify-center gap-6">
              <div className="inline-flex w-fit items-center rounded-full border border-black/10 bg-black/5 px-3 py-1.5 text-sm font-medium text-foreground">
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
                  className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                >
                  Explore trips
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/login"
                  className="rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition hover:border-black/20 hover:text-black"
                >
                  Join the community
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="w-full max-w-md rounded-[1.75rem] border border-black/10 bg-white p-6 shadow-inner">
                <div className="rounded-[1.5rem] border border-white/60 bg-white/80 p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-foreground">What you can expect</p>
                  <ul className="mt-5 space-y-3 text-sm leading-7 text-muted-foreground">
                    <li className="flex gap-3">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-black" />
                      Carefully matched guides who are vetted for safety, experience and local knowledge.
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-black" />
                      Small-group travel that feels personal rather than packed.
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-black" />
                      Trips shaped around nature, slower pacing and responsible tourism.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-border/70 bg-white p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)] sm:p-8 lg:p-10">
          <div className="flex flex-col gap-4 pb-6 sm:pb-8">
            <div className="inline-flex w-fit items-center rounded-full border border-black/10 bg-black/5 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-foreground">
              Meet the guides
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Experienced local leaders behind every journey
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                Our guides bring deep regional knowledge, safety expertise and a personal connection to the places you travel.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
            {guides.map((guide) => (
              <Link key={guide.id} href={`/${guide.id}`} className="group block">
                <article className="h-full overflow-hidden rounded-[1.25rem] border border-border/70 bg-card/95 shadow-[0_16px_45px_-28px_rgba(0,0,0,0.2)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_30px_55px_-25px_rgba(15,23,42,0.25)]">
                  <div className="relative h-56 overflow-hidden sm:h-60 xl:h-64">
                    <Image
                      src={guide.photo ?? guideImageMap[guide.id] ?? "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=900&q=80"}
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
                        <div className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[0.6rem] font-medium text-emerald-700">
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
                          className="rounded-full border border-border/70 bg-background px-2 py-1 text-[0.65rem] font-medium text-foreground/80"
                        >
                          {certification.title}
                        </span>
                      ))}
                    </div>

                    <div className="border-t border-border/70 pt-3">
                      <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Languages
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {guide.languages.map((language) => (
                          <span
                            key={`${guide.id}-${language}`}
                            className="rounded-full bg-black/5 px-2 py-1 text-[0.68rem] font-medium text-foreground"
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
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;

            return (
              <article key={pillar.title} className="rounded-[1.5rem] border border-border/70 bg-white p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]">
                <div className="mb-4 inline-flex rounded-full bg-black/5 p-3 text-foreground">
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
