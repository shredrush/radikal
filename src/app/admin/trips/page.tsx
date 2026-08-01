import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { updateActivityAction } from "@/lib/actions/admin";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const activityTypes = ["SKI", "SNOWBOARD", "BIKE", "TREK"] as const;
const difficulties = ["EASY", "MODERATE", "CHALLENGING", "EXTREME"] as const;

export default async function AdminTripsPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login?callbackUrl=/admin/trips");
  }

  const activities = await prisma.activity.findMany({
    orderBy: { createdAt: "desc" },
  });

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
          <Card key={activity.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>{activity.title}</CardTitle>
                  <CardDescription>
                    {activity.location} · {activity.type.toLowerCase()} · {activity.isCustom ? "custom" : "standard"}
                  </CardDescription>
                </div>
                <span className="rounded-full border border-border/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  {activity.isCustom ? "Custom trip" : "Regular trip"}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <form action={updateActivityAction} className="grid gap-4 md:grid-cols-2">
                <input type="hidden" name="activityId" value={activity.id} />

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`title-${activity.id}`}>Trip title</Label>
                  <Input id={`title-${activity.id}`} name="title" defaultValue={activity.title} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`location-${activity.id}`}>Location</Label>
                  <Input id={`location-${activity.id}`} name="location" defaultValue={activity.location} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`price-${activity.id}`}>Price (₹)</Label>
                  <Input
                    id={`price-${activity.id}`}
                    name="priceInRupees"
                    type="number"
                    min="0"
                    defaultValue={activity.priceInRupees}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`type-${activity.id}`}>Activity type</Label>
                  <select
                    id={`type-${activity.id}`}
                    name="type"
                    defaultValue={activity.type}
                    className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    {activityTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`difficulty-${activity.id}`}>Difficulty</Label>
                  <select
                    id={`difficulty-${activity.id}`}
                    name="difficulty"
                    defaultValue={activity.difficulty}
                    className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    {difficulties.map((difficulty) => (
                      <option key={difficulty} value={difficulty}>
                        {difficulty}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`duration-${activity.id}`}>Duration (days)</Label>
                  <Input
                    id={`duration-${activity.id}`}
                    name="durationDays"
                    type="number"
                    min="1"
                    defaultValue={activity.durationDays}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`group-size-${activity.id}`}>Max group size</Label>
                  <Input
                    id={`group-size-${activity.id}`}
                    name="maxGroupSize"
                    type="number"
                    min="1"
                    defaultValue={activity.maxGroupSize}
                    required
                  />
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

                <div className="flex items-center gap-2 md:col-span-2">
                  <input
                    id={`custom-${activity.id}`}
                    name="isCustom"
                    type="checkbox"
                    defaultChecked={activity.isCustom}
                    className="h-4 w-4 rounded border border-border bg-background"
                  />
                  <Label htmlFor={`custom-${activity.id}`}>Custom trip</Label>
                </div>

                <div className="md:col-span-2">
                  <Button type="submit" className="rounded-full">
                    Save changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
