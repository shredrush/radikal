"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { updateActivityAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DeleteTripButton } from "@/components/admin/delete-trip-button";

const ACTIVITY_TYPE_OPTIONS = [
  { value: "TREK", label: "Hiking & Trekking" },
  { value: "BIKE", label: "Cycling" },
  { value: "SNOWBOARD", label: "Snowboarding" },
  { value: "SKI", label: "Skiing" },
  { value: "ROCKCLIMB", label: "Rock Climbing" },
  { value: "EXPEDITION", label: "Summit Expedition" },
  { value: "YOGA", label: "Yoga & Meditation" },
] as const;

const TRIP_CATEGORY_OPTIONS = [
  "ADVENTURE_ENTHUSIAST",
  "WOMEN_ONLY",
  "CORPORATE",
  "LUXURY",
  "FAMILY",
  "COURSE",
  "SELF_GUIDED",
  "BEGINNER_FRIENDLY",
] as const;

const TRIP_CATEGORY_LABELS: Record<string, string> = {
  ADVENTURE_ENTHUSIAST: "Adventure Enthusiast",
  WOMEN_ONLY: "Women Only",
  CORPORATE: "Corporate",
  LUXURY: "Luxury",
  FAMILY: "For Family",
  COURSE: "Courses",
  SELF_GUIDED: "Self Guided",
  BEGINNER_FRIENDLY: "Beginner Friendly",
};

const inputClassName =
  "flex h-10 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-black focus-visible:ring-2 focus-visible:ring-black/10";

function getActivityTypeLabel(value: string) {
  return ACTIVITY_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function AdminTripForm({
  activity,
  guides,
  supplemental,
}: {
  activity: {
    id: string;
    title: string;
    slug: string;
    type: string;
    location: string;
    description: string;
    priceInRupees: number;
    durationDays: number;
    maxGroupSize: number;
    categories: string[];
    images: string[];
    guideId: string | null;
  };
  guides: Array<{ id: string; name: string }>;
  supplemental: {
    pickup: string;
    drop: string;
    inclusions: string[];
    exclusions: string[];
    highlights: string[];
  };
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await updateActivityAction(formData);
        toast.success(`${activity.title} updated.`);
      } catch {
        toast.error("Could not save trip changes.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="activityId" value={activity.id} />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4 rounded-[1.25rem] border border-border/70 bg-muted/20 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor={`title-${activity.id}`}>Trip title</Label>
              <input id={`title-${activity.id}`} name="title" defaultValue={activity.title} required className={inputClassName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`type-${activity.id}`}>Sport type</Label>
              <select id={`type-${activity.id}`} name="type" defaultValue={activity.type} className={inputClassName}>
                {ACTIVITY_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`location-${activity.id}`}>Location</Label>
              <input id={`location-${activity.id}`} name="location" defaultValue={activity.location} required className={inputClassName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`price-${activity.id}`}>Price (₹)</Label>
              <input id={`price-${activity.id}`} name="priceInRupees" type="number" min="0" defaultValue={activity.priceInRupees} required className={inputClassName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`duration-${activity.id}`}>Duration (days)</Label>
              <input id={`duration-${activity.id}`} name="durationDays" type="number" min="1" defaultValue={activity.durationDays} required className={inputClassName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`group-size-${activity.id}`}>Max group size</Label>
              <input id={`group-size-${activity.id}`} name="maxGroupSize" type="number" min="1" defaultValue={activity.maxGroupSize} required className={inputClassName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`guide-${activity.id}`}>Guide</Label>
              <select id={`guide-${activity.id}`} name="guideId" defaultValue={activity.guideId ?? ""} className={inputClassName}>
                <option value="">No guide</option>
                {guides.map((guide) => (
                  <option key={guide.id} value={guide.id}>
                    {guide.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`slug-${activity.id}`}>Slug</Label>
              <input id={`slug-${activity.id}`} name="slug" defaultValue={activity.slug} required className={inputClassName} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor={`description-${activity.id}`}>Description</Label>
              <textarea id={`description-${activity.id}`} name="description" defaultValue={activity.description} rows={5} required className="min-h-32 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-black focus-visible:ring-2 focus-visible:ring-black/10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`pickup-${activity.id}`}>Pickup point</Label>
              <input id={`pickup-${activity.id}`} name="pickup" defaultValue={supplemental.pickup} className={inputClassName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`drop-${activity.id}`}>Drop point</Label>
              <input id={`drop-${activity.id}`} name="drop" defaultValue={supplemental.drop} className={inputClassName} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor={`highlights-${activity.id}`}>Why travellers love this (one per line)</Label>
              <textarea id={`highlights-${activity.id}`} name="highlights" defaultValue={supplemental.highlights.join("\n")} rows={4} className="min-h-24 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-black focus-visible:ring-2 focus-visible:ring-black/10" />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor={`inclusions-${activity.id}`}>What&apos;s included (one per line)</Label>
              <textarea id={`inclusions-${activity.id}`} name="inclusions" defaultValue={supplemental.inclusions.join("\n")} rows={5} className="min-h-28 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-black focus-visible:ring-2 focus-visible:ring-black/10" />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor={`exclusions-${activity.id}`}>Not included (one per line)</Label>
              <textarea id={`exclusions-${activity.id}`} name="exclusions" defaultValue={supplemental.exclusions.join("\n")} rows={5} className="min-h-28 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-black focus-visible:ring-2 focus-visible:ring-black/10" />
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-[1.25rem] border border-border/70 bg-background/90 p-4 shadow-sm">
          <div className="space-y-2">
            <Label>Trip categories</Label>
            <div className="grid gap-2">
              {TRIP_CATEGORY_OPTIONS.map((category) => {
                const isChecked = activity.categories.includes(category);
                return (
                  <label key={category} className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-foreground">
                    <input type="checkbox" name="categories" value={category} defaultChecked={isChecked} className="h-4 w-4 rounded border-border" />
                    {TRIP_CATEGORY_LABELS[category] ?? category}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`images-${activity.id}`}>Images</Label>
            <textarea id={`images-${activity.id}`} name="images" defaultValue={activity.images.join("\n")} rows={5} className="min-h-32 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-black focus-visible:ring-2 focus-visible:ring-black/10" />
            <p className="text-xs text-muted-foreground">Enter one image path or URL per line, exactly as it should be stored (for example: /activities/your-trip-slug/cover.jpg).</p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            <span>{activity.images.length} image{activity.images.length === 1 ? "" : "s"}</span>
            <span>{activity.categories.length} category tag{activity.categories.length === 1 ? "" : "s"}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
        <p className="text-sm text-muted-foreground">Changes publish instantly on the public site after saving.</p>
        <div className="flex items-center gap-3">
          <DeleteTripButton activityId={activity.id} activityTitle={activity.title} />
          <Button type="submit" className="rounded-full" disabled={isPending}>
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}
