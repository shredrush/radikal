"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, X } from "lucide-react";
import { toast } from "sonner";

import {
  submitTripCreateChangeAction,
  submitTripUpdateChangeAction,
} from "@/lib/actions/trip-changes";
import {
  deleteTripDraftAction,
  saveTripDraftAction,
} from "@/lib/actions/trip-drafts";
import { FORM_FIELD_BORDER } from "@/lib/boundary-styles";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MediaUploader } from "@/components/media/media-uploader";
import { ACTIVITY_TYPE_OPTIONS, TRIP_CATEGORIES, TRIP_CATEGORY_LABELS } from "@/lib/trip-metadata";

const inputClassName =
  `flex h-10 w-full rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`;

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
  videos: string[];
  pickup: string;
  drop: string;
  inclusions: string[];
  exclusions: string[];
  highlights: string[];
};

export type GuideTripFields = Omit<GuideTripData, "id">;

export type GuideDraftData = { draftId: string } & GuideTripFields;

function countFilledFromValues(values: GuideTripFields | null | undefined) {
  let count = 0;
  if (values?.title?.trim()) count += 1;
  if (values?.location?.trim()) count += 1;
  if (values?.description?.trim()) count += 1;
  if (values?.pickup?.trim()) count += 1;
  if (values?.drop?.trim()) count += 1;
  if (values?.categories?.length) count += 1;
  if (values?.images?.length) count += 1;
  if (values?.videos?.length) count += 1;
  if (values?.inclusions?.length) count += 1;
  if (values?.exclusions?.length) count += 1;
  if (values?.highlights?.length) count += 1;
  return count;
}

function countFilledFromForm(form: HTMLFormElement) {
  const formData = new FormData(form);
  const has = (name: string) =>
    (formData.get(name)?.toString().trim().length ?? 0) > 0;

  let count = 0;
  if (has("title")) count += 1;
  if (has("location")) count += 1;
  if (has("description")) count += 1;
  if (has("pickup")) count += 1;
  if (has("drop")) count += 1;
  if (formData.getAll("categories").length > 0) count += 1;
  if (has("images")) count += 1;
  if (has("videos")) count += 1;
  if (has("inclusions")) count += 1;
  if (has("exclusions")) count += 1;
  if (has("highlights")) count += 1;
  return count;
}

export function GuideTripForm({
  guideId,
  trip,
  draft,
}: {
  guideId: string;
  trip?: GuideTripData | null;
  draft?: GuideDraftData | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const isEditing = Boolean(trip);
  const isDraft = Boolean(draft);
  const key = trip?.id ?? draft?.draftId ?? "new";
  const fields: GuideTripFields | null = draft ?? trip ?? null;
  const [open, setOpen] = useState(Boolean(draft));
  const [filledCount, setFilledCount] = useState(() => countFilledFromValues(fields));
  const [draftId, setDraftId] = useState<string | null>(draft?.draftId ?? null);
  const [isPending, startTransition] = useTransition();
  const [isSavingDraft, startSavingDraft] = useTransition();

  const title = fields?.title ?? "";
  const type = fields?.type ?? "TREK";
  const location = fields?.location ?? "";
  const description = fields?.description ?? "";
  const priceInRupees = fields?.priceInRupees ?? 0;
  const durationDays = fields?.durationDays ?? 1;
  const maxGroupSize = fields?.maxGroupSize ?? 8;
  const categories = fields?.categories ?? [];
  const images = fields?.images ?? [];
  const videos = fields?.videos ?? [];
  const pickup = fields?.pickup ?? "";
  const drop = fields?.drop ?? "";
  const inclusions = fields?.inclusions ?? [];
  const exclusions = fields?.exclusions ?? [];
  const highlights = fields?.highlights ?? [];

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

  function handleFormChange(event: React.FormEvent<HTMLFormElement>) {
    setFilledCount(countFilledFromForm(event.currentTarget));
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
        if (isDraft && draft?.draftId) {
          await deleteTripDraftAction(draft.draftId);
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

  function handleSaveDraft() {
    const form = formRef.current;
    if (!form) return;
    const formData = new FormData(form);
    formData.set("guideId", guideId);
    if (draftId) {
      formData.set("draftId", draftId);
    }

    startSavingDraft(async () => {
      try {
        const result = await saveTripDraftAction(formData);
        setDraftId(result.id);
        toast.success("Draft saved.");
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not save draft.";
        toast.error(message);
      }
    });
  }

  return (
    <div className="w-full space-y-4 rounded-[1.25rem] border border-border/70 bg-muted/20 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">
          {isEditing
            ? `Edit “${title}”`
            : isDraft
              ? `Draft — ${title || "untitled"}`
              : "New trip"}
        </p>
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => setOpen(false)}>
          <X className="h-3.5 w-3.5" />
          Close
        </Button>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} onChange={handleFormChange} className="space-y-4">
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
          <div className="space-y-2">
            <Label htmlFor={`inclusions-${key}`}>What&apos;s included (one per line)</Label>
            <textarea id={`inclusions-${key}`} name="inclusions" defaultValue={inclusions.join("\n")} rows={5} className={`min-h-28 w-full rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`exclusions-${key}`}>Not included (one per line)</Label>
            <textarea id={`exclusions-${key}`} name="exclusions" defaultValue={exclusions.join("\n")} rows={5} className={`min-h-28 w-full rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Trip categories</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {TRIP_CATEGORIES.map((category) => {
              const isChecked = categories.includes(category);
              return (
                <label key={category} className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground">
                  <input type="checkbox" name="categories" value={category} defaultChecked={isChecked} className="h-4 w-4 rounded border-input" />
                  {TRIP_CATEGORY_LABELS[category] ?? category}
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <MediaUploader
            entity="trip"
            folderKey={trip?.id ?? guideId}
            initialImages={images}
            initialVideos={videos}
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border/70 pt-4">
          <p className="mr-auto text-xs text-muted-foreground">
            Changes are reviewed by our team before going live.
          </p>
          {!isEditing ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-500/10"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || filledCount < 3}
              title={
                filledCount < 3
                  ? "Fill at least 3 fields to save a draft"
                  : "Save for later"
              }
            >
              <Save className="h-3.5 w-3.5" />
              {isSavingDraft ? "Saving…" : "Save to draft"}
            </Button>
          ) : null}
          <Button type="submit" className="rounded-full" disabled={isPending}>
            {isPending ? "Submitting…" : "Submit for review"}
          </Button>
        </div>
      </form>
    </div>
  );
}
