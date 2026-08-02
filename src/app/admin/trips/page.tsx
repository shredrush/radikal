import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { AdminTripForm } from "@/components/admin/admin-trip-form";
import { DeleteTripButton } from "@/components/admin/delete-trip-button";

const sportOptions = [
  { value: "skiing", label: "Skiing", type: "SKI" },
  { value: "snowboarding", label: "Snowboarding", type: "SNOWBOARD" },
  { value: "cycling", label: "Cycling", type: "BIKE" },
  { value: "hiking-trekking", label: "Hiking and Trekking", type: "TREK" },
  { value: "expedition", label: "Expedition", type: "TREK" },
  { value: "rock-climbing", label: "Rock Climbing", type: "TREK" },
  { value: "yoga-meditation", label: "Yoga and Meditation", type: "TREK" },
] as const;
const tripCategories = [
  "ADVENTURE_ENTHUSIAST",
  "WOMEN_ONLY",
  "CORPORATE",
  "LUXURY",
  "FOR_FAMILY",
  "COURSES",
  "SELF_GUIDED",
  "BEGINNER_FRIENDLY",
] as const;

const inputClassName =
  "flex h-10 w-full min-w-0 rounded-none border border-transparent border-b-input bg-transparent px-0 py-1 text-base outline-none transition-[color,border-color] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-b-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-b-destructive md:text-sm dark:aria-invalid:border-b-destructive/50";

function getSportValue(activity: { type: string; title: string; description: string; slug: string }) {
  const haystack = [activity.title, activity.description, activity.slug]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (activity.type === "SKI") return "skiing";
  if (activity.type === "SNOWBOARD") return "snowboarding";
  if (activity.type === "BIKE") return "cycling";

  if (haystack.includes("yoga")) return "yoga-meditation";
  if (haystack.includes("rock") && haystack.includes("climb")) return "rock-climbing";
  if (haystack.includes("climb") || haystack.includes("summit")) return "expedition";

  return "hiking-trekking";
}

function getSportLabel(value: string) {
  return sportOptions.find((option) => option.value === value)?.label ?? "Custom";
}

export default async function AdminTripsPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login?callbackUrl=/admin/trips");
  }

  const [activities, guides] = await Promise.all([
    prisma.activity.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.guide.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
          Admin board
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-wide text-foreground">
              Edit trips
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Update trip details instantly for the Radikal experience. Changes appear on the public pages after refresh.
            </p>
          </div>
          <Button variant="outline" size="sm" className="rounded-full" nativeButton={false} render={<Link href="/dashboard" />}>
            Back to dashboard
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {activities.map((activity) => (
          <Card key={activity.id} className="overflow-hidden border-border/70 bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
            <CardHeader className="border-b border-border/70 bg-muted/30">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full border border-[#1d4ed8]/15 bg-[#1d4ed8]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#1d4ed8]">
                      {getSportLabel(getSportValue(activity))}
                    </Badge>
                    <Badge variant="outline" className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                      {activity.location}
                    </Badge>
                  </div>
                  <div>
                    <CardTitle className="text-xl">{activity.title}</CardTitle>
                    <CardDescription className="mt-1 max-w-2xl text-sm leading-6">
                      Update the trip details below to keep the public listing aligned with the current Radikal experience.
                    </CardDescription>
                  </div>
                </div>
                <DeleteTripButton activityId={activity.id} activityTitle={activity.title} />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <AdminTripForm activityId={activity.id}>
                <input type="hidden" name="type" value={activity.type} />
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`title-${activity.id}`}>Trip title</Label>
                  <input id={`title-${activity.id}`} name="title" defaultValue={activity.title} required className={inputClassName} />
                </div>
 
                <div className="space-y-2">
                  <Label htmlFor={`sport-${activity.id}`}>Sport</Label>
                  <select
                    id={`sport-${activity.id}`}
                    name="sport"
                    defaultValue={getSportValue(activity)}
                    className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    {sportOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">Choose one of the seven Radikal sports.</p>
                </div>
 
                <div className="space-y-2">
                  <Label htmlFor={`location-${activity.id}`}>Location</Label>
                  <input id={`location-${activity.id}`} name="location" defaultValue={activity.location} required className={inputClassName} />
                </div>
 
                <div className="space-y-2">
                  <Label htmlFor={`price-${activity.id}`}>Price (₹)</Label>
                  <input
                    id={`price-${activity.id}`}
                    name="priceInRupees"
                    type="number"
                    min="0"
                    defaultValue={activity.priceInRupees}
                    required
                    className={inputClassName}
                  />
                </div>
 
                <div className="space-y-2">
                  <Label htmlFor={`duration-${activity.id}`}>Duration (days)</Label>
                  <input
                    id={`duration-${activity.id}`}
                    name="durationDays"
                    type="number"
                    min="1"
                    defaultValue={activity.durationDays}
                    required
                    className={inputClassName}
                  />
                </div>
 
                <div className="space-y-2">
                  <Label htmlFor={`group-size-${activity.id}`}>Max group size</Label>
                  <input
                    id={`group-size-${activity.id}`}
                    name="maxGroupSize"
                    type="number"
                    min="1"
                    defaultValue={activity.maxGroupSize}
                    required
                    className={inputClassName}
                  />
                </div>
 
                <div className="space-y-2">
                  <Label htmlFor={`guide-${activity.id}`}>Guide</Label>
                  <select
                    id={`guide-${activity.id}`}
                    name="guideId"
                    defaultValue={activity.guideId ?? ""}
                    className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    <option value="">No guide</option>
                    {guides.map((guide) => (
                      <option key={guide.id} value={guide.id}>
                        {guide.name}
                      </option>
                    ))}
                  </select>
                </div>
 
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`slug-${activity.id}`}>Slug</Label>
                  <input id={`slug-${activity.id}`} name="slug" defaultValue={activity.slug} required className={inputClassName} />
                </div>
 
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`description-${activity.id}`}>Description</Label>
                  <textarea
                    id={`description-${activity.id}`}
                    name="description"
                    defaultValue={activity.description}
                    rows={4}
                    className="flex min-h-24 w-full rounded-none border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                    required
                  />
                </div>
 
                <div className="space-y-2 md:col-span-2">
                  <Label>Trip categories</Label>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {tripCategories.map((category) => {
                      const isChecked = activity.categories.includes(category);
 
                      return (
                        <label key={category} className="flex items-center gap-2 rounded-none border border-input bg-background px-3 py-2 text-sm text-foreground">
                          <input
                            type="checkbox"
                            name="categories"
                            value={category}
                            defaultChecked={isChecked}
                            className="h-4 w-4 rounded border border-border bg-background"
                          />
                          {category.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())}
                        </label>
                      );
                    })}
                  </div>
                </div>
 
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`images-${activity.id}`}>Images (one per line or comma)</Label>
                  <textarea
                    id={`images-${activity.id}`}
                    name="images"
                    defaultValue={activity.images.join("\n")}
                    rows={3}
                    className="flex min-h-24 w-full rounded-none border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                  />
                </div>
 
              </AdminTripForm>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
