"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";

import { createTripAction, updateTripAction } from "@/lib/actions/admin";
import { createTripPreviewAction } from "@/lib/actions/trip-previews";
import { FORM_FIELD_BORDER } from "@/lib/boundary-styles";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye } from "lucide-react";
import { DeleteTripButton } from "@/components/admin/delete-trip-button";
import { SlotsManager, type SlotItem } from "@/components/admin/admin-trip-slots";
import { ACTIVITY_TYPE_OPTIONS, TRIP_CATEGORIES, TRIP_CATEGORY_LABELS } from "@/lib/trip-metadata";
import { pluralize } from "@/lib/format";

const inputClassName =
  `flex h-10 w-full rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`;

export function AdminTripForm({
  trip,
  guides,
  supplemental,
  slots = [],
}: {
  trip?: {
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
  supplemental?: {
    pickup: string;
    drop: string;
    inclusions: string[];
    exclusions: string[];
    highlights: string[];
  };
  slots?: SlotItem[];
}) {
  const isEditing = Boolean(trip);
  const key = trip?.id ?? "new";
  const [isPending, startTransition] = useTransition();
  const [isPreviewing, startPreviewing] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // Materialise every field so create mode (no `trip`) renders blank/empty
  // controls instead of undefined defaults.
  const title = trip?.title ?? "";
  const slug = trip?.slug ?? "";
  const type = trip?.type ?? "TREK";
  const location = trip?.location ?? "";
  const description = trip?.description ?? "";
  const priceInRupees = trip?.priceInRupees ?? 0;
  const durationDays = trip?.durationDays ?? 1;
  const maxGroupSize = trip?.maxGroupSize ?? 8;
  const categories = trip?.categories ?? [];
  const images = trip?.images ?? [];
  const guideId = trip?.guideId ?? "";

  const pickup = supplemental?.pickup ?? "";
  const drop = supplemental?.drop ?? "";
  const inclusions = supplemental?.inclusions ?? [];
  const exclusions = supplemental?.exclusions ?? [];
  const highlights = supplemental?.highlights ?? [];

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        if (isEditing) {
          await updateTripAction(formData);
          toast.success(`${title} updated.`);
        } else {
          await createTripAction(formData);
          toast.success("Trip created.");
          form.reset();
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not save trip changes.";
        toast.error(message);
      }
    });
  }

  function handlePreview() {
    const form = formRef.current;
    if (!form) return;
    const formData = new FormData(form);

    startPreviewing(async () => {
      try {
        const { url } = await createTripPreviewAction(formData);
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not generate preview.";
        toast.error(message);
      }
    });
  }

  return (
    <>
    <form id={`trip-form-${key}`} ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {isEditing ? <input type="hidden" name="tripId" value={trip?.id} /> : null}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4 rounded-[1.25rem] border border-border/70 bg-muted/20 p-4">
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
            <div className="space-y-2">
              <Label htmlFor={`guide-${key}`}>Guide</Label>
              <select id={`guide-${key}`} name="guideId" defaultValue={guideId} className={inputClassName}>
                <option value="">No guide</option>
                {guides.map((guide) => (
                  <option key={guide.id} value={guide.id}>
                    {guide.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`slug-${key}`}>Slug</Label>
              <input id={`slug-${key}`} name="slug" defaultValue={slug} required className={inputClassName} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor={`description-${key}`}>Description</Label>
              <textarea id={`description-${key}`} name="description" defaultValue={description} rows={5} required className={`min-h-32 w-full rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`} />
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
              <textarea id={`highlights-${key}`} name="highlights" defaultValue={highlights.join("\n")} rows={4} className={`min-h-24 w-full rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`} />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor={`inclusions-${key}`}>What&apos;s included (one per line)</Label>
              <textarea id={`inclusions-${key}`} name="inclusions" defaultValue={inclusions.join("\n")} rows={5} className={`min-h-28 w-full rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`} />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor={`exclusions-${key}`}>Not included (one per line)</Label>
              <textarea id={`exclusions-${key}`} name="exclusions" defaultValue={exclusions.join("\n")} rows={5} className={`min-h-28 w-full rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`} />
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-[1.25rem] border border-border/70 bg-background/90 p-4 shadow-sm">
          <div className="space-y-2">
            <Label>Trip categories</Label>
            <div className="grid gap-2">
              {TRIP_CATEGORIES.map((category) => {
                const isChecked = categories.includes(category);
                return (
                  <label key={category} className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-foreground">
                    <input type="checkbox" name="categories" value={category} defaultChecked={isChecked} className="h-4 w-4 rounded border-input" />
                    {TRIP_CATEGORY_LABELS[category] ?? category}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`images-${key}`}>Images</Label>
            <textarea id={`images-${key}`} name="images" defaultValue={images.join("\n")} rows={5} className={`min-h-32 w-full rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`} />
            <p className="text-xs text-muted-foreground">Enter one image path or URL per line, exactly as it should be stored (for example: /activities/your-trip-slug/cover.jpg).</p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            <span>{pluralize(images.length, "image")}</span>
            <span>{pluralize(categories.length, "category tag")}</span>
          </div>
        </div>
      </div>

    </form>

    {isEditing ? (
      <div className="mt-6 border-t border-border/70 pt-6">
        <SlotsManager tripId={trip?.id ?? ""} slots={slots} />
      </div>
    ) : null}

    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
      <p className="text-sm text-muted-foreground">
        {isEditing
          ? "Changes publish instantly on the public site after saving."
          : "The new trip goes live immediately after creating. Add booking dates from its card below."}
      </p>
      <div className="flex items-center gap-3">
        {!isEditing ? (
          <Button
            type="button"
            variant="default"
            size="sm"
            className="rounded-full bg-orange-500 text-white hover:bg-orange-600"
            disabled={isPreviewing}
            onClick={handlePreview}
          >
            <Eye className="h-3.5 w-3.5" />
            {isPreviewing ? "Preparing…" : "Preview"}
          </Button>
        ) : null}
        {isEditing ? (
          <DeleteTripButton tripId={trip?.id ?? ""} tripTitle={title} />
        ) : null}
        <Button type="submit" form={`trip-form-${key}`} className="rounded-full" disabled={isPending}>
          {isPending ? (isEditing ? "Saving…" : "Creating…") : isEditing ? "Save changes" : "Create trip"}
        </Button>
      </div>
    </div>
    </>
  );
}
