"use server";

import { revalidatePath, updateTag } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { isValidSlug, isSafeImageSource, sanitizeText } from "@/lib/sanitize";
import { parseSlotInteger } from "@/lib/validations/slots";

const validTypes = ["TREK", "BIKE", "SNOWBOARD", "SKI", "ROCKCLIMB", "EXPEDITION", "YOGA"] as const;
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

function parseImages(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((item) => sanitizeText(item, { maxLength: 2048 }))
        .filter((item) => isSafeImageSource(item)),
    ),
  );
}

function parseCategories(values: FormDataEntryValue[]) {
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

type ActivityFields = {
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
  categories: (typeof validCategories)[number][];
  pickup: string;
  drop: string;
  inclusions: string[];
  exclusions: string[];
  highlights: string[];
};

function readActivityFields(formData: FormData): ActivityFields {
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
    images: parseImages(asString(formData.get("images"))),
    categories: parseCategories(formData.getAll("categories")),
    pickup: sanitizeText(asString(formData.get("pickup")), { maxLength: 200 }),
    drop: sanitizeText(asString(formData.get("drop")), { maxLength: 200 }),
    inclusions: parseList(asString(formData.get("inclusions"))),
    exclusions: parseList(asString(formData.get("exclusions"))),
    highlights: parseList(asString(formData.get("highlights"))),
  };
}

function validateActivityFields(fields: ActivityFields): ActivityFields {
  if (!fields.title || !fields.slug || !fields.location || !fields.description) {
    throw new Error("Title, slug, location, and description are required.");
  }

  if (!isValidSlug(fields.slug)) {
    throw new Error("Slug must be lowercase letters, numbers, and hyphens only.");
  }

  if (!validTypes.includes(fields.type as (typeof validTypes)[number])) {
    throw new Error("Invalid activity type.");
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

  return fields;
}

function revalidateActivityPages(slug: string) {
  revalidatePath("/admin/trips");
  revalidatePath("/trips");
  revalidatePath("/");
  updateTag("trips");
  revalidatePath(`/trips/${slug}`);
}

function isUniqueConstraint(error: unknown) {
  return error instanceof Error && error.message.includes("Unique constraint failed");
}

export async function createActivityAction(formData: FormData) {
  await requirePermission("trips.manage", "/login?callbackUrl=/admin/trips");

  const fields = validateActivityFields(readActivityFields(formData));
  const {
    title,
    slug,
    location,
    description,
    type,
    priceInRupees,
    durationDays,
    maxGroupSize,
    guideId,
    images,
    categories,
    pickup,
    drop,
    inclusions,
    exclusions,
    highlights,
  } = fields;

  try {
    await prisma.$transaction(async (tx) => {
      const activity = await tx.activity.create({
        data: {
          title,
          slug,
          location,
          description,
          type: type as (typeof validTypes)[number],
          priceInRupees,
          durationDays,
          maxGroupSize,
          categories,
          images,
          guideId: guideId || null,
        },
      });

      if (pickup || drop) {
        await tx.tripLocation.create({
          data: { activityId: activity.id, pickup, drop },
        });
      }

      if (inclusions.length > 0 || exclusions.length > 0) {
        await tx.tripInclusion.createMany({
          data: [
            ...inclusions.map((item, order) => ({ activityId: activity.id, item, included: true, order })),
            ...exclusions.map((item, order) => ({ activityId: activity.id, item, included: false, order })),
          ],
        });
      }

      if (highlights.length > 0) {
        await tx.tripHighlight.createMany({
          data: highlights.map((text, order) => ({ activityId: activity.id, text, order })),
        });
      }
    });
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw new Error("Slug already exists. Please choose a different slug.");
    }

    throw error;
  }

  revalidateActivityPages(slug);
}

export async function updateActivityAction(formData: FormData) {
  await requirePermission("trips.manage", "/login?callbackUrl=/admin/trips");

  const activityId = asString(formData.get("activityId"));
  const fields = validateActivityFields(readActivityFields(formData));
  const {
    title,
    slug,
    location,
    description,
    type,
    priceInRupees,
    durationDays,
    maxGroupSize,
    guideId,
    images,
    categories,
    pickup,
    drop,
    inclusions,
    exclusions,
    highlights,
  } = fields;

  if (!activityId) {
    throw new Error("Missing activity id.");
  }

  let previousSlug = "";

  try {
    await prisma.$transaction(async (tx) => {
      const currentActivity = await tx.activity.findUnique({
        where: { id: activityId },
        select: { slug: true },
      });

      if (!currentActivity) {
        throw new Error("Activity not found.");
      }

      previousSlug = currentActivity.slug;

      await tx.activity.update({
        where: { id: activityId },
        data: {
          title,
          slug,
          location,
          description,
          type: type as (typeof validTypes)[number],
          priceInRupees,
          durationDays,
          maxGroupSize,
          categories,
          images,
          guideId: guideId || null,
        },
      });

      // If both are blank, remove any existing location row to avoid stale values.
      if (pickup || drop) {
        await tx.tripLocation.upsert({
          where: { activityId },
          update: { pickup, drop },
          create: { activityId, pickup, drop },
        });
      } else {
        await tx.tripLocation.deleteMany({ where: { activityId } });
      }

      await tx.tripInclusion.deleteMany({ where: { activityId } });
      if (inclusions.length > 0 || exclusions.length > 0) {
        await tx.tripInclusion.createMany({
          data: [
            ...inclusions.map((item, order) => ({ activityId, item, included: true, order })),
            ...exclusions.map((item, order) => ({ activityId, item, included: false, order })),
          ],
        });
      }

      await tx.tripHighlight.deleteMany({ where: { activityId } });
      if (highlights.length > 0) {
        await tx.tripHighlight.createMany({
          data: highlights.map((text, order) => ({ activityId, text, order })),
        });
      }
    });
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw new Error("Slug already exists. Please choose a different slug.");
    }

    throw error;
  }

  revalidateActivityPages(previousSlug);

  if (slug !== previousSlug) {
    revalidatePath(`/trips/${slug}`);
  }
}

export async function deleteActivityAction(activityId: string) {
  await requirePermission("trips.manage", "/login?callbackUrl=/admin/trips");

  if (!activityId) {
    throw new Error("Missing activity id.");
  }

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { slug: true },
  });

  if (!activity) {
    throw new Error("Activity not found.");
  }

  await prisma.activity.delete({ where: { id: activityId } });

  revalidatePath("/admin/trips");
  revalidatePath("/trips");
  revalidatePath("/");
  updateTag("trips");
  revalidatePath(`/trips/${activity.slug}`);
}

// ---------------------------------------------------------------------------
// Slot management
// ---------------------------------------------------------------------------

// Upper bound so a typo can't open thousands of spots on a single date.
const MAX_SLOT_CAPACITY = 100;

/**
 * Parse a `<input type="date">` value (YYYY-MM-DD) into a Date stored at UTC
 * noon. Noon keeps the calendar date stable across server timezones (the rest
 * of the app formats slot dates in the server's local timezone), and rejects
 * impossible dates like 2026-02-31.
 */
function parseSlotDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

/** Revalidate every page that renders a trip's available dates. */
function revalidateSlotPages(slug: string) {
  revalidatePath("/admin/trips");
  revalidatePath("/trips");
  revalidatePath("/");
  updateTag("trips");
  if (slug) {
    revalidatePath(`/trips/${slug}`);
  }
}

export async function createSlotAction(formData: FormData) {
  await requirePermission("trips.manage", "/login?callbackUrl=/admin/trips");

  const activityId = asString(formData.get("activityId"));
  const dateValue = asString(formData.get("date"));
  const capacity = parseSlotInteger(asString(formData.get("capacity")));
  const reserved = parseSlotInteger(asString(formData.get("reserved")), 0);

  if (!activityId) {
    throw new Error("Missing activity id.");
  }

  if (!dateValue) {
    throw new Error("Please choose a date.");
  }

  if (capacity === null || capacity < 1 || capacity > MAX_SLOT_CAPACITY) {
    throw new Error(`Capacity must be between 1 and ${MAX_SLOT_CAPACITY}.`);
  }
  if (reserved === null) {
    throw new Error("Reserve must be a whole number of 0 or more.");
  }
  if (reserved > capacity) {
    throw new Error("Reserve cannot be greater than the slot capacity.");
  }

  const date = parseSlotDate(dateValue);
  if (!date) {
    throw new Error("Please enter a valid date.");
  }

  let slug = "";
  await prisma.$transaction(async (tx) => {
    const activity = await tx.activity.findUnique({
      where: { id: activityId },
      select: { slug: true },
    });

    if (!activity) {
      throw new Error("Activity not found.");
    }

    slug = activity.slug;

    await tx.slot.create({
      data: { activityId, date, capacity, reserved },
    });
  });

  revalidateSlotPages(slug);
}

export async function updateSlotAction(formData: FormData) {
  await requirePermission("trips.manage", "/login?callbackUrl=/admin/trips");

  const slotId = asString(formData.get("slotId"));
  const dateValue = asString(formData.get("date"));
  const capacity = parseSlotInteger(asString(formData.get("capacity")));
  const reserved = parseSlotInteger(asString(formData.get("reserved")), 0);

  if (!slotId) {
    throw new Error("Missing slot id.");
  }

  if (!dateValue) {
    throw new Error("Please choose a date.");
  }

  if (capacity === null || capacity < 1 || capacity > MAX_SLOT_CAPACITY) {
    throw new Error(`Capacity must be between 1 and ${MAX_SLOT_CAPACITY}.`);
  }
  if (reserved === null) {
    throw new Error("Reserve must be a whole number of 0 or more.");
  }

  const date = parseSlotDate(dateValue);
  if (!date) {
    throw new Error("Please enter a valid date.");
  }

  let slug = "";
  await prisma.$transaction(async (tx) => {
    const slot = await tx.slot.findUnique({
      where: { id: slotId },
      include: { activity: { select: { slug: true } } },
    });

    if (!slot) {
      throw new Error("Slot not found.");
    }

    slug = slot.activity.slug;

    // Never shrink capacity below the number of already-booked spots.
    if (reserved > capacity - slot.booked) {
      throw new Error(
        `Reserve cannot exceed the ${capacity - slot.booked} places remaining after booked spots.`
      );
    }

    await tx.slot.update({
      where: { id: slotId },
      data: { date, capacity, reserved },
    });
  });

  revalidateSlotPages(slug);
}

export async function deleteSlotAction(slotId: string) {
  await requirePermission("trips.manage", "/login?callbackUrl=/admin/trips");

  if (!slotId) {
    throw new Error("Missing slot id.");
  }

  let slug = "";
  await prisma.$transaction(async (tx) => {
    const slot = await tx.slot.findUnique({
      where: { id: slotId },
      include: {
        activity: { select: { slug: true } },
        _count: { select: { bookings: true } },
      },
    });

    if (!slot) {
      throw new Error("Slot not found.");
    }

    slug = slot.activity.slug;

    // `Booking.slot` has no cascade, so deleting a slot with bookings would
    // violate the foreign key. Cancel the bookings first instead.
    if (slot._count.bookings > 0) {
      throw new Error(
        "This date has bookings and cannot be deleted. Cancel the bookings first."
      );
    }

    await tx.slot.delete({ where: { id: slotId } });
  });

  revalidateSlotPages(slug);
}
