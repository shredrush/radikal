import Link from "next/link";

import { prisma } from "@/lib/prisma";
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

const CATEGORY_LABELS: Record<string, string> = {
  ADVENTURE_ENTHUSIAST: "Adventure Enthusiast",
  WOMEN_ONLY: "Women Only",
  CORPORATE: "Corporate",
  LUXURY: "Luxury",
};

function formatRupees(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function ToursPage() {
  const activities = await prisma.activity.findMany({
    include: { guide: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.08),_transparent_35%)]">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 sm:py-16">
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            All tours
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-wide sm:text-4xl">
            Explore every Himalayan tour
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-muted-foreground">
            Browse all current adventures across ski, snowboard, bike and trek experiences.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {activities.map((activity) => (
            <Card
              key={activity.id}
              className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.35)]"
            >
              <div className="h-1.5 bg-gradient-to-r from-[#1d4ed8] via-[#f59e0b] to-[#38bdf8]" />
              <CardHeader className="gap-4">
                <div className="flex flex-wrap gap-1.5">
                  {activity.categories.map((category) => (
                    <Badge key={category} variant="secondary" className="rounded-full">
                      {CATEGORY_LABELS[category] ?? category}
                    </Badge>
                  ))}
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-xl">{activity.title}</CardTitle>
                  <CardDescription>
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
                  <span className="rounded-full border border-border px-3 py-1">
                    {activity.durationDays} {activity.durationDays === 1 ? "day" : "days"}
                  </span>
                  <span className="rounded-full border border-border px-3 py-1 capitalize">
                    {activity.difficulty.toLowerCase()}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-5">
                <span className="font-heading text-xl font-semibold">
                  {formatRupees(activity.priceInRupees)}
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/tours/${activity.slug}`} />}
                  >
                    View details
                  </Button>
                  <Button
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/booking/${activity.id}/checkout`} />}
                  >
                    Book now
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
