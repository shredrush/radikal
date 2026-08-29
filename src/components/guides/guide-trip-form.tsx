"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import {
  submitTripCreateChangeAction,
  submitTripUpdateChangeAction,
} from "@/lib/actions/trip-changes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ACTIVITY_TYPE_OPTIONS, TRIP_CATEGORIES, TRIP_CATEGORY_LABELS } from "@/lib/trip-metadata";

const inputClassName =
  "flex h-10 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-black focus-visible:ring-2 focus-visible:ring-black/10";

export type GuideTripData = {
  id: string;
  title: string;
  type: string;
  location: string;
  description: string;
  priceInRupees: number;
  durationDays: number;
  maxGroupSize: number;
  categories: string[];
  images: string[];
  pickup: string;
  drop: string;
  inclusions: string[];
  exclusions: string[];
  highlights: string[];
};

export function GuideTripForm({
  guideId,
  trip,
}: {
  guideId: string;
  trip?: GuideTripData | null;
}) {
  const router = useRouter();
  const isEditing = Boolean(trip);
  const key = trip?.id ?? "new";
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const title = trip?.title ?? "";
  const type = trip?.type ?? "TREK";
  const location = trip?.location ?? "";
  const description = trip?.description ?? "";
  const priceInRupees = trip?.priceInRupees ?? 0;
  const durationDays = trip?.durationDays ?? 1;
  const maxGroupSize = trip?.maxGroupSize ?? 8;
  const categories = trip?.categories ?? [];
  const images = trip?.images ?? [];
  const pickup = trip?.pickup ?? "";
  const drop = trip?.drop ?? "";
  const inclusions = trip?.inclusions ?? [];
  const exclusions = trip?.exclusions ?? [];
  const highlights = trip?.highlights ?? [];

  if (!open) {
    return (
      <Button
        type="button"
        variant={isEditing ? "outline" : "default"}
        size="sm"
        className="rounded-full"
        onClick={() => setOpen(true)}
      >
        {isEditing ? (
          <>
            <Plus className="h-3.5 w-3.5" />
            Edit trip
          </>
        ) : (
          <>
            <Plus className="h-3.5 w-3.5" />
            Add a trip
          </>
        )}
      </Button>
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    // The guide always edits their own trips — the guide id comes from props.
    formData.set("guideId", guideId);

    startTransition(async () => {
      try {
        if (isEditing) {
          await submitTripUpdateChangeAction(formData);
          toast.success("Your changes were submitted for review.");
        } else {
          await submitTripCreateChangeAction(formData);
          toast.success("Your new trip was submitted for review.");
        }
        setOpen(false);
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not submit trip change.";
        toast.error(message);
      }
    });
  }

  return (
    <div className="w-full space-y-4 rounded-[1.25rem] border border-border/70 bg-muted/20 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">
          {isEditing ? `Edit “${title}”` : "New trip"}
        </p>
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => setOpen(false)}>
          <X className="h-3.5 w-3.5" />
          Close
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isEditing ? <input type="hidden" name="tripId" value={trip?.id} /> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`title-${key}`}>Trip title</Label>
            <input id={`title-${key}`} name="title" defaultValue={title} required className={inputClassName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`type-${key}`}>Sport type</Label>
            <select id={`type-${key}`} name="type" defaultValue={type} className={inputClassName}>
              {ACTIVITY_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`location-${key}`}>Location</Label>
            <input id={`location-${key}`} name="location" defaultValue={location} required className={inputClassName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`price-${key}`}>Price (₹)</Label>
            <input id={`price-${key}`} name="priceInRupees" type="number" min="0" defaultValue={priceInRupees} required className={inputClassName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`duration-${key}`}>Duration (days)</Label>
            <input id={`duration-${key}`} name="durationDays" type="number" min="1" defaultValue={durationDays} required className={inputClassName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`group-size-${key}`}>Max group size</Label>
            <input id={`group-size-${key}`} name="maxGroupSize" type="number" min="1" defaultValue={maxGroupSize} required className={inputClassName} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`description-${key}`}>Description</Label>
            <textarea id={`description-${key}`} name="description" defaultValue={description} rows={5} required className="min-h-32 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-black focus-visible:ring-2 focus-visible:ring-black/10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`pickup-${key}`}>Pickup point</Label>
            <input id={`pickup-${key}`} name="pickup" defaultValue={pickup} className={inputClassName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`drop-${key}`}>Drop point</Label>
            <input id={`drop-${key}`} name="drop" defaultValue={drop} className={inputClassName} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`highlights-${key}`}>Why travellers love this (one per line)</Label>
            <textarea id={`highlights-${key}`} name="highlights" defaultValue={highlights.join("\n")} rows={4} className="min-h-24 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-black focus-visible:ring-2 focus-visible:ring-black/10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`inclusions-${key}`}>What&apos;s included (one per line)</Label>
            <textarea id={`inclusions-${key}`} name="inclusions" defaultValue={inclusions.join("\n")} rows={5} className="min-h-28 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-black focus-visible:ring-2 focus-visible:ring-black/10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`exclusions-${key}`}>Not included (one per line)</Label>
            <textarea id={`exclusions-${key}`} name="exclusions" defaultValue={exclusions.join("\n")} rows={5} className="min-h-28 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-black focus-visible:ring-2 focus-visible:ring-black/10" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Trip categories</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {TRIP_CATEGORIES.map((category) => {
              const isChecked = categories.includes(category);
              return (
                <label key={category} className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground">
                  <input type="checkbox" name="categories" value={category} defaultChecked={isChecked} className="h-4 w-4 rounded border-border" />
                  {TRIP_CATEGORY_LABELS[category] ?? category}
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`images-${key}`}>Images</Label>
          <textarea id={`images-${key}`} name="images" defaultValue={images.join("\n")} rows={4} className="min-h-28 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-black focus-visible:ring-2 focus-visible:ring-black/10" />
          <p className="text-xs text-muted-foreground">Enter one image path or URL per line (for example: /activities/your-trip-slug/cover.jpg).</p>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border/70 pt-4">
          <p className="mr-auto text-xs text-muted-foreground">
            Changes are reviewed by our team before going live.
          </p>
          <Button type="submit" className="rounded-full" disabled={isPending}>
            {isPending ? "Submitting…" : "Submit for review"}
          </Button>
        </div>
      </form>
    </div>
  );
}
