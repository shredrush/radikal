// Shared parsing/validation pipeline for trip form fields. Used by both the
// admin save actions and the admin preview actions so a preview can never
// render content the real save flow would reject. Kept outside any "use
// server" file because it contains plain (non-action) functions that would
// otherwise be rejected by Next.js as non-async server actions.
import { isValidSlug, isSafeImageSource, sanitizeText } from "@/lib/sanitize";
import { MEDIA_LIMITS } from "@/lib/media-constants";

export const validTypes = [
  "TREK",
  "BIKE",
  "SNOWBOARD",
  "SKI",
  "ROCKCLIMB",
  "EXPEDITION",
  "YOGA",
] as const;
export const validCategories = [
  "ADVENTURE_ENTHUSIAST",
  "WOMEN_ONLY",
  "CORPORATE",
  "LUXURY",
  "FAMILY",
  "COURSE",
  "SELF_GUIDED",
  "BEGINNER_FRIENDLY",
] as const;

export function asString(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

/**
 * Parse a media list that may arrive as a legacy newline-separated textarea
 * value or as multiple hidden inputs from the MediaUploader. Entries are
 * sanitized and deduped but NOT capped here — over-limit submissions must be
 * rejected by `validateTripFields` so existing media is never silently
 * truncated on re-save.
 */
export function parseMediaList(values: FormDataEntryValue[]) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => value.toString().split(/\r?\n/))
        .map((item) => sanitizeText(item, { maxLength: 2048 }))
        .filter((item) => isSafeImageSource(item)),
    ),
  );
}

export function parseCategories(values: FormDataEntryValue[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.toString())
        .filter(
          (value): value is (typeof validCategories)[number] =>
            validCategories.includes(value as (typeof validCategories)[number]),
        ),
    ),
  );
}

export function parseList(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((entry) => sanitizeText(entry, { maxLength: 500 }))
        .filter(Boolean),
    ),
  );
}

export type TripFields = {
  title: string;
  slug: string;
  location: string;
  description: string;
  type: string;
  priceInRupees: number;
  durationDays: number;
  maxGroupSize: number;
  guideId: string;
  images: string[];
  videos: string[];
  categories: (typeof validCategories)[number][];
  pickup: string;
  drop: string;
  inclusions: string[];
  exclusions: string[];
  highlights: string[];
};

export function readTripFields(formData: FormData): TripFields {
  return {
    title: sanitizeText(asString(formData.get("title")), { maxLength: 200 }),
    slug: sanitizeText(asString(formData.get("slug")), { maxLength: 120 }).toLowerCase(),
    location: sanitizeText(asString(formData.get("location")), { maxLength: 200 }),
    description: sanitizeText(asString(formData.get("description")), {
      maxLength: 5000,
      allowNewlines: true,
    }),
    type: asString(formData.get("type")),
    priceInRupees: Number.parseInt(asString(formData.get("priceInRupees")), 10),
    durationDays: Number.parseInt(asString(formData.get("durationDays")), 10),
    maxGroupSize: Number.parseInt(asString(formData.get("maxGroupSize")), 10),
    guideId: asString(formData.get("guideId")),
    images: parseMediaList(formData.getAll("images")),
    videos: parseMediaList(formData.getAll("videos")),
    categories: parseCategories(formData.getAll("categories")),
    pickup: sanitizeText(asString(formData.get("pickup")), { maxLength: 200 }),
    drop: sanitizeText(asString(formData.get("drop")), { maxLength: 200 }),
    inclusions: parseList(asString(formData.get("inclusions"))),
    exclusions: parseList(asString(formData.get("exclusions"))),
    highlights: parseList(asString(formData.get("highlights"))),
  };
}

export function validateTripFields(fields: TripFields): TripFields {
  if (!fields.title || !fields.slug || !fields.location || !fields.description) {
    throw new Error("Title, slug, location, and description are required.");
  }

  if (!isValidSlug(fields.slug)) {
    throw new Error("Slug must be lowercase letters, numbers, and hyphens only.");
  }

  if (!validTypes.includes(fields.type as (typeof validTypes)[number])) {
    throw new Error("Invalid trip type.");
  }

  if (
    Number.isNaN(fields.priceInRupees) ||
    Number.isNaN(fields.durationDays) ||
    Number.isNaN(fields.maxGroupSize)
  ) {
    throw new Error("One or more numeric fields are invalid.");
  }

  if (fields.priceInRupees < 0 || fields.durationDays < 1 || fields.maxGroupSize < 1) {
    throw new Error("Price must be >= 0 and duration/group size must be at least 1.");
  }

  if (
    fields.images.length > MEDIA_LIMITS.trip.images ||
    fields.videos.length > MEDIA_LIMITS.trip.videos
  ) {
    throw new Error(
      `Trips can have at most ${MEDIA_LIMITS.trip.images} photos and ${MEDIA_LIMITS.trip.videos} videos.`,
    );
  }

  return fields;
}
