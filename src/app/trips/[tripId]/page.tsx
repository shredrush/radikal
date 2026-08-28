import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TripGallery } from "@/components/trips/trip-gallery";
import { BookingBar } from "@/components/trips/booking-bar";
import { prisma } from "@/lib/prisma";
import { formatTripDateRange } from "@/lib/trip-dates";
import { normalizeTripImagePath } from "@/lib/trip-card-image";
import { FaqSection } from "@/components/trips/faq-section";
import { getGuideImage } from "@/lib/guide-images";

// Trip pages were hitting Postgres (with several joined tables) on every
// request. Admin edits already call updateTag("trips")/revalidatePath for
// this route, so caching here is safe and removes the DB round-trip from
// the common case.
const getTripDetail = unstable_cache(
  async (slug: string) => {
    return prisma.trip.findUnique({
      where: { slug },
      include: {
        guide: {
          include: {
            certifications: true,
            user: {
              select: {
                image: true,
              },
            },
          },
        },
        slots: {
          where: {
            date: {
              gte: new Date(),
            },
          },
          orderBy: {
            date: "asc",
          },
        },
        reviews: {
          include: { user: { select: { name: true, image: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        tripLocation: true,
        inclusions: { orderBy: { order: "asc" } },
        highlights: { orderBy: { order: "asc" } },
      },
    });
  },
  ["trip-detail"],
  { tags: ["trips"], revalidate: 300 },
);

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

function getSlotOccupancyPercent(slot: { capacity: number; booked: number; reserved: number }) {
  if (slot.capacity <= 0) {
    return 100;
  }

  return Math.min(100, Math.max(0, ((slot.booked + slot.reserved) / slot.capacity) * 100));
}

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  const trip = await getTripDetail(tripId);

  if (!trip) {
    notFound();
  }

  const guide = trip.guide;
  const guideProfileImage = guide ? getGuideImage(guide) : "/avatars/fox.svg";

  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-16 lg:px-10">
        <div className="overflow-hidden rounded-[2rem] border border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
          <div className="grid items-stretch gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="relative overflow-hidden bg-muted/60">
              <TripGallery
                images={trip.images.map((image) => normalizeTripImagePath(image, trip.slug)).filter(Boolean)}
                fallbackImage={`/activities/${trip.slug}/cover.png`}
                alt={trip.title}
                compact
              />
            </div>
            <div className="flex flex-col justify-between gap-6 px-8 py-8 sm:px-10 sm:py-10 lg:px-0 lg:pt-4 lg:pb-8 lg:pr-10">
              <div className="space-y-4">
                <h1 className="font-heading text-3xl font-semibold tracking-wide sm:text-4xl">
                  {trip.title}
                </h1>
                <p className="line-clamp-6 text-base leading-8 text-muted-foreground">
                  {trip.description}
                </p>
                <div className="flex flex-wrap items-start gap-2">
                  {trip.categories.map((category) => (
                    <span key={category} className="rounded-full border border-border/80 bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                      {CATEGORY_LABELS[category] ?? category}
                    </span>
                  ))}
                </div>
              </div>
              <BookingBar
                tripId={trip.id}
                pricePerPerson={trip.priceInRupees}
                durationDays={trip.durationDays}
                maxGroupSize={trip.maxGroupSize}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
            <CardHeader>
              <CardTitle className="text-2xl">Trip details</CardTitle>
              <CardDescription>Everything you need to know before you go.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
              <p className="text-foreground">{trip.description}</p>
              <div className="grid gap-3 grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-muted/50 p-3">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Pickup</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{trip.tripLocation?.pickup ?? trip.location}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/50 p-3">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Drop</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{trip.tripLocation?.drop ?? trip.location}</p>
                </div>
              </div>
              <div className="grid gap-3 grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-muted/50 p-3">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Duration</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{trip.durationDays} {trip.durationDays === 1 ? "day" : "days"}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/50 p-3">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Group size</p>
                  <p className="mt-1 text-sm font-medium text-foreground">Up to {trip.maxGroupSize} travellers</p>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Why travellers love this trip</h2>
                {trip.highlights.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {trip.highlights.map((h) => (
                      <li key={h.id} className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-black" />
                        <span>{h.text}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2">{trip.description}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
              <CardHeader>
                <CardTitle className="text-xl">Available dates</CardTitle>
              </CardHeader>
              <CardContent>
                {trip.slots.length > 0 ? (
                  <ul className="space-y-2">
                    {trip.slots.map((slot) => (
                      <li key={slot.id}>
                        <Link
                          href={`/booking/${trip.id}/checkout?slot=${slot.id}`}
                          className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-emerald-600/40 bg-background/70 px-3 py-2 text-sm transition-colors hover:border-emerald-600 hover:bg-emerald-600/10 focus-visible:border-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/20 active:border-emerald-700 active:bg-emerald-600/20"
                        >
                          <span
                            className="absolute inset-y-0 left-0 bg-emerald-100/90 transition-[width] duration-300"
                            style={{ width: `${getSlotOccupancyPercent(slot)}%` }}
                            aria-hidden="true"
                          />
                          <span className="relative z-10 font-medium transition-colors">
                            {formatTripDateRange(slot.date, trip.durationDays)}
                          </span>
                          <span className="relative z-10 opacity-90 transition-colors">
                            {getSlotOccupancyPercent(slot) >= 100 ? "Sold out" : `${Math.max(slot.capacity - slot.booked - slot.reserved, 0)} spots left`}
                          </span>
                          {getSlotOccupancyPercent(slot) >= 100 ? (
                            <span className="absolute inset-x-0 top-1/2 z-20 h-px bg-emerald-800/70" aria-hidden="true" />
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No upcoming dates are available yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
              <CardHeader>
                <CardTitle className="text-xl">What&apos;s included</CardTitle>
                <CardDescription>Covered in the price, and what to arrange yourself.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">Included</p>
                    {trip.inclusions.filter(i => i.included).map((i) => (
                      <div key={i.id} className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                            <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-sm leading-6 text-foreground">{i.item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border/60 pt-4 space-y-2.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-500 dark:text-rose-400">Not included</p>
                    {trip.inclusions.filter(i => !i.included).map((i) => (
                      <div key={i.id} className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-500 dark:bg-rose-950/50 dark:text-rose-400">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                            <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                          </svg>
                        </span>
                        <span className="text-sm leading-6 text-muted-foreground">{i.item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
          <CardHeader>
            <CardTitle className="text-2xl">Your guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-7 text-muted-foreground">
            {guide ? (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,1.1fr)]">
                <div className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-muted/60">
                  <div className="relative aspect-[4/5] w-full overflow-hidden">
                    <Image
                      src={guideProfileImage}
                      alt={guide.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 24vw"
                    />
                  </div>
                </div>

                <div className="flex flex-col justify-center">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                        {guide.name}
                      </h3>
                      <p className="mt-2 text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                        {guide.location}
                      </p>
                    </div>

                    <p className="text-base leading-7 text-muted-foreground">
                      {guide.experienceYears}+ years experience
                    </p>
                    <p className="text-sm leading-6 text-muted-foreground">{guide.bio}</p>
                  </div>

                  <div className="mt-6 space-y-5">
                    {guide.certifications.length > 0 ? (
                      <div>
                        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                          Certifications
                        </p>
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
                    ) : null}

                    {guide.languages.length > 0 ? (
                      <div>
                        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                          Languages
                        </p>
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
                    ) : null}
                  </div>
                </div>

                <div className="lg:border-l lg:border-border/60 lg:pl-6">
                  <p className="text-sm font-semibold text-foreground">
                    Traveller reviews
                    {trip.reviews.length > 0 && (
                      <span className="ml-2 font-normal text-muted-foreground">({trip.reviews.length})</span>
                    )}
                  </p>
                  {trip.reviews.length > 0 ? (
                    <ul className="mt-3 space-y-4">
                      {trip.reviews.map((review) => (
                        <li key={review.id} className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-foreground">{review.user.name}</span>
                            <span className="flex items-center gap-0.5 text-white">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={`h-3.5 w-3.5 ${i < review.rating ? "text-white" : "text-muted-foreground/30"}`}>
                                  <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
                                </svg>
                              ))}
                            </span>
                          </div>
                          <p className="mt-2 text-muted-foreground">{review.comment}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-muted-foreground">No reviews yet — be the first to share your experience.</p>
                  )}
                </div>
              </div>
            ) : (
              <p>No guide details are available for this trip yet.</p>
            )}
          </CardContent>
        </Card>

        <FaqSection />
      </section>
    </div>
  );
}
