import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { ArrowLeft, MapPin, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getTripCardImage, getTripCardImagePosition } from "@/lib/trip-card-image";

// Guide profile + their trips rarely change; skip the DB round-trip on
// every request (trips are also tagged "trips" so edits still invalidate).
const getGuideDetail = unstable_cache(
  async (slug: string) => {
    return prisma.guide.findFirst({
      where: { slug },
      include: {
        certifications: {
          orderBy: { yearIssued: "desc" },
        },
        activities: {
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: { activities: true },
        },
      },
    });
  },
  ["guide-detail"],
  { tags: ["guides", "trips"], revalidate: 3600 },
);

const guideImageMap: Record<string, string> = {
  tenzin: "https://images.unsplash.com/photo-1601224748193-d24f166b5c77?auto=format&fit=crop&w=1200&q=80",
  tashi: "https://images.unsplash.com/photo-1599405653894-8a595f692abf?auto=format&fit=crop&w=1200&q=80",
  ritu: "https://images.unsplash.com/photo-1548789997-82da68437ad8?auto=format&fit=crop&w=1200&q=80",
  meera: "https://images.unsplash.com/photo-1661892526325-813afd121a4e?auto=format&fit=crop&w=1200&q=80",
  nawang: "https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?auto=format&fit=crop&w=1200&q=80",
  "tenzin-dorjee": "https://images.unsplash.com/photo-1601224748193-d24f166b5c77?auto=format&fit=crop&w=1200&q=80",
  pema: "https://images.unsplash.com/photo-1548789997-82da68437ad8?auto=format&fit=crop&w=1200&q=80",
};

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

function formatRupees(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function generateMetadata({ params }: { params: Promise<{ guideId: string }> }): Promise<Metadata> {
  const { guideId } = await params;
  const guide = await getGuideDetail(guideId);

  if (!guide) {
    return {
      title: "Guide not found | Radikal",
    };
  }

  return {
    title: `${guide.name} | Radikal Guide`,
    description: `${guide.name} is a vetted local guide based in ${guide.location}.`,
  };
}

export default async function GuideDetailPage({ params }: { params: Promise<{ guideId: string }> }) {
  const { guideId } = await params;

  const guide = await getGuideDetail(guideId);

  if (!guide) {
    notFound();
  }

  return (
    <div className="flex-1 bg-[radial-gradient(circle_at_top_left,_rgba(17,17,17,0.08),_transparent_35%)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <Link
          href="/community"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/70 bg-white px-3 py-2 text-sm font-medium text-foreground transition hover:border-black/20 hover:bg-background"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to community
        </Link>

        <article className="overflow-hidden rounded-[2rem] border border-border/70 bg-white shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)]">
          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative min-h-[320px] lg:min-h-full">
              <Image
                src={guide.photo ?? guideImageMap[guide.id] ?? "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=80"}
                alt={guide.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
            </div>

            <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
              <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Vetted guide
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">{guide.location}</p>
                  <h1 className="mt-2 font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                    {guide.name}
                  </h1>
                </div>

                <p className="text-lg leading-8 text-muted-foreground">
                  {guide.experienceYears}+ years guiding in the Himalayas
                </p>
                <p className="text-base leading-8 text-muted-foreground">{guide.bio}</p>
              </div>

              <div className="mt-8 space-y-6">
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Certifications</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {guide.certifications.map((certification) => (
                      <span
                        key={certification.id}
                        className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-sm font-medium text-foreground/80"
                      >
                        {certification.title}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Signature focus</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {guide.languages.map((language) => (
                      <span
                        key={`${guide.id}-${language}`}
                        className="rounded-full bg-black/5 px-3 py-1.5 text-sm font-medium text-foreground"
                      >
                        {language}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-border/70 bg-background/80 p-4">
                  <div className="flex items-center gap-2 text-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm font-medium">Based in {guide.location}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>

        <section className="mt-10 rounded-[2rem] border border-border/70 bg-white p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)] sm:p-8 lg:p-10">
          <div className="mb-6 flex flex-col gap-2">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Trips by this guide
            </p>
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Adventures organised by {guide.name}
            </h2>
          </div>

          {guide.activities.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-border/80 bg-background/80 p-6 text-sm text-muted-foreground">
              No trips have been organised by {guide.name} yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {guide.activities.map((activity) => (
                <Link key={activity.id} href={`/trips/${activity.slug}`} className="block">
                  <Card className="flex h-full min-h-[360px] flex-col gap-0 overflow-hidden rounded-[1.1rem] border-0 bg-background/95 py-0 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.3)] transition-transform duration-200 hover:-translate-y-1 sm:min-h-[420px]">
                    <div className="relative -m-[1px] flex-[0_0_48%] min-h-[180px] overflow-hidden bg-muted/60 sm:flex-[0_0_52%] sm:min-h-[220px]">
                      <Image
                        src={getTripCardImage(activity)}
                        alt={activity.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) calc(50vw - 12px), (max-width: 1024px) calc(50vw - 12px), 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/12 via-black/24 to-black/24" />
                    </div>

                    <div className="flex flex-1 flex-col justify-between gap-2 p-4">
                      <div className="space-y-1.5">
                        <h3 className="text-base font-semibold tracking-tight text-foreground">{activity.title}</h3>
                        <p className="truncate text-[0.7rem] leading-4 text-muted-foreground sm:text-sm sm:leading-5">{activity.location}</p>
                      </div>

                      <div className="mt-1 flex min-h-[1.35rem] flex-wrap content-start gap-1">
                        {activity.categories.map((category) => (
                          <Badge key={category} variant="secondary" className="rounded-full border border-border/70 bg-background/80 px-1 py-0.15 text-[0.42rem] font-medium leading-3 text-foreground/80 sm:text-[0.5rem]">
                            {CATEGORY_LABELS[category] ?? category}
                          </Badge>
                        ))}
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-1 border-t border-border/70 pt-2">
                        <span className="shrink-0 rounded-full border border-border/70 bg-background/80 px-1.5 py-0.5 text-[0.6rem] font-medium leading-none text-foreground/80 sm:text-sm">
                          {activity.durationDays} {activity.durationDays === 1 ? "day" : "days"}
                        </span>
                        <span className="ml-auto shrink-0 font-heading text-sm font-semibold leading-none text-foreground sm:text-base">
                          {formatRupees(activity.priceInRupees)}
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
