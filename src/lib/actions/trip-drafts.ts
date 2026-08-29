"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireGuideAction } from "@/lib/guide-board";
import { isSafeImageSource, sanitizeText } from "@/lib/sanitize";

const validTypes = [
  "TREK",
  "BIKE",
  "SNOWBOARD",
  "SKI",
  "ROCKCLIMB",
  "EXPEDITION",
  "YOGA",
] as const;

const validCategories = [
  "ADVENTURE_ENTHUSIAST",
  "WOMEN_ONLY",
  "CORPORATE",
  "LUXURY",
  "FAMILY",
  "COURSE",
  "SELF_GUIDED",
  "BEGINNER_FRIENDLY",
] as const;

function asString(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

function optionalText(value: string, maxLength: number, allowNewlines = false) {
  const cleaned = sanitizeText(value, { maxLength, allowNewlines });
  return cleaned || null;
}

function parseIntValue(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseList(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((entry) => sanitizeText(entry, { maxLength: 500 }))
        .filter(Boolean),
    ),
  );
}

function parseImages(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((entry) => sanitizeText(entry, { maxLength: 2048 }))
        .filter((entry) => isSafeImageSource(entry)),
    ),
  );
}

function parseCategories(values: FormDataEntryValue[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.toString())
        .filter((value): value is (typeof validCategories)[number] =>
          validCategories.includes(value as (typeof validCategories)[number]),
        ),
    ),
  );
}

type DraftFields = {
  title: string | null;
  type: (typeof validTypes)[number];
  location: string | null;
  description: string | null;
  priceInRupees: number;
  durationDays: number;
  maxGroupSize: number;
  categories: (typeof validCategories)[number][];
  images: string[];
  pickup: string | null;
  drop: string | null;
  inclusions: string[];
  exclusions: string[];
  highlights: string[];
};

function readDraftFields(formData: FormData): DraftFields {
  const type = asString(formData.get("type"));
  return {
    title: optionalText(asString(formData.get("title")), 200),
    type: validTypes.includes(type as (typeof validTypes)[number])
      ? (type as (typeof validTypes)[number])
      : "TREK",
    location: optionalText(asString(formData.get("location")), 200),
    description: optionalText(asString(formData.get("description")), 5000, true),
    priceInRupees: parseIntValue(asString(formData.get("priceInRupees")), 0),
    durationDays: parseIntValue(asString(formData.get("durationDays")), 1),
    maxGroupSize: parseIntValue(asString(formData.get("maxGroupSize")), 8),
    categories: parseCategories(formData.getAll("categories")),
    images: parseImages(asString(formData.get("images"))),
    pickup: optionalText(asString(formData.get("pickup")), 200),
    drop: optionalText(asString(formData.get("drop")), 200),
    inclusions: parseList(asString(formData.get("inclusions"))),
    exclusions: parseList(asString(formData.get("exclusions"))),
    highlights: parseList(asString(formData.get("highlights"))),
  };
}

function countDraftFilledFields(fields: DraftFields) {
  let count = 0;
  if (fields.title) count += 1;
  if (fields.location) count += 1;
  if (fields.description) count += 1;
  if (fields.pickup) count += 1;
  if (fields.drop) count += 1;
  if (fields.categories.length > 0) count += 1;
  if (fields.images.length > 0) count += 1;
  if (fields.inclusions.length > 0) count += 1;
  if (fields.exclusions.length > 0) count += 1;
  if (fields.highlights.length > 0) count += 1;
  return count;
}

async function requireGuide() {
  const { guide } = await requireGuideAction();
  return guide;
}

export async function saveTripDraftAction(
  formData: FormData,
): Promise<{ id: string }> {
  const guide = await requireGuide();
  const fields = readDraftFields(formData);

  if (countDraftFilledFields(fields) < 3) {
    throw new Error("Fill at least 3 fields before saving a draft.");
  }

  const draftId = asString(formData.get("draftId"));

  if (draftId) {
    const existing = await prisma.tripDraft.findUnique({
      where: { id: draftId },
      select: { guideId: true },
    });
    if (!existing || existing.guideId !== guide.id) {
      throw new Error("Draft not found.");
    }
    await prisma.tripDraft.update({ where: { id: draftId }, data: fields });
    revalidatePath("/guide-board/trips");
    revalidatePath("/admin/trips");
    return { id: draftId };
  }

  const draft = await prisma.tripDraft.create({
    data: { ...fields, guideId: guide.id },
  });
  revalidatePath("/guide-board/trips");
  revalidatePath("/admin/trips");
  return { id: draft.id };
}

export async function deleteTripDraftAction(draftId: string): Promise<void> {
  const guide = await requireGuide();

  if (!draftId) {
    throw new Error("Missing draft id.");
  }

  const existing = await prisma.tripDraft.findUnique({
    where: { id: draftId },
    select: { guideId: true },
  });
  if (!existing || existing.guideId !== guide.id) {
    throw new Error("Draft not found.");
  }

  await prisma.tripDraft.delete({ where: { id: draftId } });
  revalidatePath("/guide-board/trips");
  revalidatePath("/admin/trips");
}
