"use server";

import { revalidatePath, updateTag } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { isValidSlug, isSafeImageSource, sanitizeText } from "@/lib/sanitize";
import { notifyTripReviewStaff, notifyUser } from "@/lib/notifications";
import { type TripProposal } from "@/lib/trip-changes";
import { slugify } from "@/lib/format";
import { parseSlotInteger } from "@/lib/validations/slots";
import {
  sendEmailAfter,
  tripChangeDecisionEmail,
  tripChangeSubmittedAdminEmail,
} from "@/lib/email";

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

const MAX_SLOT_CAPACITY = 100;

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

type TripFields = {
  title: string;
  type: string;
  location: string;
  description: string;
  priceInRupees: number;
  durationDays: number;
  maxGroupSize: number;
  categories: (typeof validCategories)[number][];
  images: string[];
  pickup: string;
  drop: string;
  inclusions: string[];
  exclusions: string[];
  highlights: string[];
};

function readTripFields(formData: FormData): TripFields {
  return {
    title: sanitizeText(asString(formData.get("title")), { maxLength: 200 }),
    location: sanitizeText(asString(formData.get("location")), { maxLength: 200 }),
    description: sanitizeText(asString(formData.get("description")), {
      maxLength: 5000,
      allowNewlines: true,
    }),
    type: asString(formData.get("type")),
    priceInRupees: Number.parseInt(asString(formData.get("priceInRupees")), 10),
    durationDays: Number.parseInt(asString(formData.get("durationDays")), 10),
    maxGroupSize: Number.parseInt(asString(formData.get("maxGroupSize")), 10),
    images: parseImages(asString(formData.get("images"))),
    categories: parseCategories(formData.getAll("categories")),
    pickup: sanitizeText(asString(formData.get("pickup")), { maxLength: 200 }),
    drop: sanitizeText(asString(formData.get("drop")), { maxLength: 200 }),
    inclusions: parseList(asString(formData.get("inclusions"))),
    exclusions: parseList(asString(formData.get("exclusions"))),
    highlights: parseList(asString(formData.get("highlights"))),
  };
}

function validateTripFields(fields: TripFields): TripFields {
  if (!fields.title || !fields.location || !fields.description) {
    throw new Error("Title, location, and description are required.");
  }

  if (!validTypes.includes(fields.type as (typeof validTypes)[number])) {
    throw new Error("Invalid sport type.");
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

/** Resolve the signed-in user's linked guide record, or throw. */
async function requireGuide() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in to manage trips.");
  }
  if (session.user.role !== "GUIDE") {
    throw new Error("Only guides can manage trips.");
  }

  const guide = await prisma.guide.findUnique({
    where: { userId: session.user.id },
    select: { id: true, name: true },
  });

  if (!guide) {
    throw new Error("No guide profile is linked to this account.");
  }

  return { guide, userId: session.user.id };
}

/** Produce a unique, valid slug from a trip title. */
async function uniqueTripSlug(title: string): Promise<string> {
  const base = slugify(title, 60) || "trip";
  let slug = isValidSlug(base) ? base : "trip";
  let attempts = 0;

  while (attempts < 25) {
    const taken = await prisma.trip.findUnique({ where: { slug }, select: { id: true } });
    if (!taken) return slug;
    slug = `${base.slice(0, 50)}-${Math.random().toString(36).slice(2, 6)}`;
    attempts += 1;
  }

  return `${base.slice(0, 40)}-${Date.now().toString(36)}`;
}

/** Notify trip-review staff (in-app + email) and write an audit entry. */
async function notifySubmitted(guideName: string, proposal: TripProposal) {
  const staff = await notifyTripReviewStaff({
    type: "TRIP_CHANGE_SUBMITTED",
    title: "Trip change needs review",
    body: `${guideName} submitted a change for “${proposal.title}” that needs your review.`,
    href: "/admin/trip-changes",
  });

  for (const user of staff) {
    sendEmailAfter(
      tripChangeSubmittedAdminEmail({
        to: user.email,
        name: user.name ?? "",
        guideName,
        tripTitle: proposal.title,
      }),
    );
  }
}

function isUniqueConstraint(error: unknown) {
  return error instanceof Error && error.message.includes("Unique constraint failed");
}

export async function submitTripCreateChangeAction(formData: FormData): Promise<void> {
  const { guide, userId } = await requireGuide();
  const fields = validateTripFields(readTripFields(formData));
  const slug = await uniqueTripSlug(fields.title);

  const proposal: TripProposal = { slug, ...fields };

  await prisma.tripChangeRequest.create({
    data: {
      type: "CREATE",
      guideId: guide.id,
      proposed: proposal as unknown as Prisma.InputJsonValue,
      submittedById: userId,
    },
  });

  await notifySubmitted(guide.name, proposal);

  revalidatePath("/profile");
  revalidatePath("/admin/trip-changes");
}

export async function submitTripUpdateChangeAction(formData: FormData): Promise<void> {
  const { guide, userId } = await requireGuide();
  const tripId = asString(formData.get("tripId"));

  if (!tripId) {
    throw new Error("Missing trip id.");
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      tripLocation: true,
      inclusions: { orderBy: { order: "asc" } },
      highlights: { orderBy: { order: "asc" } },
    },
  });

  if (!trip) {
    throw new Error("Trip not found.");
  }

  if (trip.guideId !== guide.id) {
    throw new Error("You can only edit your own trips.");
  }

  const fields = validateTripFields(readTripFields(formData));

  const original: TripProposal = {
    slug: trip.slug,
    title: trip.title,
    type: trip.type,
    location: trip.location,
    description: trip.description,
    priceInRupees: trip.priceInRupees,
    durationDays: trip.durationDays,
    maxGroupSize: trip.maxGroupSize,
    categories: trip.categories,
    images: trip.images,
    pickup: trip.tripLocation?.pickup ?? "",
    drop: trip.tripLocation?.drop ?? "",
    inclusions: trip.inclusions.filter((i) => i.included).map((i) => i.item),
    exclusions: trip.inclusions.filter((i) => !i.included).map((i) => i.item),
    highlights: trip.highlights.map((h) => h.text),
  };

  const proposal: TripProposal = { ...fields, slug: trip.slug };

  await prisma.tripChangeRequest.create({
    data: {
      type: "UPDATE",
      guideId: guide.id,
      tripId,
      proposed: proposal as unknown as Prisma.InputJsonValue,
      original: original as unknown as Prisma.InputJsonValue,
      submittedById: userId,
    },
  });

  await notifySubmitted(guide.name, proposal);

  revalidatePath("/profile");
  revalidatePath("/admin/trip-changes");
}

async function requireGuideTrip(tripId: string) {
  const { guide } = await requireGuide();
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true, slug: true, guideId: true },
  });

  if (!trip || trip.guideId !== guide.id) {
    throw new Error("You can only manage dates for your own trips.");
  }

  return trip;
}

function revalidateGuideSlotPages(slug: string) {
  revalidatePath("/profile");
  revalidatePath("/trips");
  revalidatePath(`/trips/${slug}`);
  updateTag("trips");
}

export async function createGuideSlotAction(formData: FormData): Promise<void> {
  const tripId = asString(formData.get("tripId"));
  const dateValue = asString(formData.get("date"));
  const capacity = parseSlotInteger(asString(formData.get("capacity")));
  const reserved = parseSlotInteger(asString(formData.get("reserved")), 0);

  if (!tripId) throw new Error("Missing trip id.");
  if (!dateValue) throw new Error("Please choose a date.");
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
  if (!date) throw new Error("Please enter a valid date.");

  const trip = await requireGuideTrip(tripId);
  await prisma.slot.create({ data: { tripId: trip.id, date, capacity, reserved } });
  revalidateGuideSlotPages(trip.slug);
}

export async function updateGuideSlotAction(formData: FormData): Promise<void> {
  const slotId = asString(formData.get("slotId"));
  const dateValue = asString(formData.get("date"));
  const capacity = parseSlotInteger(asString(formData.get("capacity")));
  const reserved = parseSlotInteger(asString(formData.get("reserved")), 0);

  if (!slotId) throw new Error("Missing slot id.");
  if (!dateValue) throw new Error("Please choose a date.");
  if (capacity === null || capacity < 1 || capacity > MAX_SLOT_CAPACITY) {
    throw new Error(`Capacity must be between 1 and ${MAX_SLOT_CAPACITY}.`);
  }
  if (reserved === null) {
    throw new Error("Reserve must be a whole number of 0 or more.");
  }

  const date = parseSlotDate(dateValue);
  if (!date) throw new Error("Please enter a valid date.");

  const { guide } = await requireGuide();
  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: { trip: { select: { guideId: true, slug: true } } },
  });

  if (!slot || slot.trip.guideId !== guide.id) {
    throw new Error("You can only manage dates for your own trips.");
  }
  if (reserved > capacity - slot.booked) {
    throw new Error(`Reserve cannot exceed the ${capacity - slot.booked} places remaining after booked spots.`);
  }

  await prisma.slot.update({ where: { id: slotId }, data: { date, capacity, reserved } });
  revalidateGuideSlotPages(slot.trip.slug);
}

export async function deleteGuideSlotAction(slotId: string): Promise<void> {
  if (!slotId) throw new Error("Missing slot id.");

  const { guide } = await requireGuide();
  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: { trip: { select: { guideId: true, slug: true } }, _count: { select: { bookings: true } } },
  });

  if (!slot || slot.trip.guideId !== guide.id) {
    throw new Error("You can only manage dates for your own trips.");
  }
  if (slot._count.bookings > 0) {
    throw new Error("Dates with bookings cannot be deleted. Ask support to cancel them first.");
  }

  await prisma.slot.delete({ where: { id: slotId } });
  revalidateGuideSlotPages(slot.trip.slug);
}

/** Apply the supplemental (location/inclusions/highlights) side tables. */
async function applySupplemental(
  tx: Prisma.TransactionClient,
  tripId: string,
  proposal: TripProposal,
) {
  if (proposal.pickup || proposal.drop) {
    await tx.tripLocation.upsert({
      where: { tripId },
      update: { pickup: proposal.pickup, drop: proposal.drop },
      create: { tripId, pickup: proposal.pickup, drop: proposal.drop },
    });
  } else {
    await tx.tripLocation.deleteMany({ where: { tripId } });
  }

  await tx.tripInclusion.deleteMany({ where: { tripId } });
  if (proposal.inclusions.length > 0 || proposal.exclusions.length > 0) {
    await tx.tripInclusion.createMany({
      data: [
        ...proposal.inclusions.map((item, order) => ({ tripId, item, included: true, order })),
        ...proposal.exclusions.map((item, order) => ({ tripId, item, included: false, order })),
      ],
    });
  }

  await tx.tripHighlight.deleteMany({ where: { tripId } });
  if (proposal.highlights.length > 0) {
    await tx.tripHighlight.createMany({
      data: proposal.highlights.map((text, order) => ({ tripId, text, order })),
    });
  }
}

export async function approveTripChangeAction(changeId: string) {
  const session = await requirePermission("trips.manage", "/login?callbackUrl=/admin/trip-changes");

  if (!changeId) {
    throw new Error("Missing change id.");
  }

  const change = await prisma.tripChangeRequest.findUnique({
    where: { id: changeId },
    include: {
      guide: {
        select: {
          id: true,
          name: true,
          slug: true,
          user: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });

  if (!change) {
    throw new Error("Change request not found.");
  }

  if (change.status !== "PENDING") {
    throw new Error("This change has already been reviewed.");
  }

  const proposal = change.proposed as unknown as TripProposal;

  try {
    await prisma.$transaction(async (tx) => {
      if (change.type === "CREATE") {
        const trip = await tx.trip.create({
          data: {
            slug: proposal.slug,
            title: proposal.title,
            type: proposal.type as (typeof validTypes)[number],
            location: proposal.location,
            description: proposal.description,
            priceInRupees: proposal.priceInRupees,
            durationDays: proposal.durationDays,
            maxGroupSize: proposal.maxGroupSize,
            categories: proposal.categories as (typeof validCategories)[number][],
            images: proposal.images,
            guideId: change.guideId,
          },
        });

        await applySupplemental(tx, trip.id, proposal);
      } else {
        if (!change.tripId) {
          throw new Error("Missing trip id for this change.");
        }

        const existing = await tx.trip.findUnique({
          where: { id: change.tripId },
          select: { id: true, guideId: true },
        });

        if (!existing) {
          throw new Error("The trip no longer exists.");
        }

        if (existing.guideId !== change.guideId) {
          throw new Error("This trip is no longer linked to this guide.");
        }

        await tx.trip.update({
          where: { id: change.tripId },
          data: {
            title: proposal.title,
            type: proposal.type as (typeof validTypes)[number],
            location: proposal.location,
            description: proposal.description,
            priceInRupees: proposal.priceInRupees,
            durationDays: proposal.durationDays,
            maxGroupSize: proposal.maxGroupSize,
            categories: proposal.categories as (typeof validCategories)[number][],
            images: proposal.images,
          },
        });

        await applySupplemental(tx, change.tripId, proposal);
      }

      await tx.tripChangeRequest.update({
        where: { id: changeId },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedById: session.user.id,
        },
      });
    });
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw new Error("Slug already exists. Reject this change and ask the guide to use a different title.");
    }
    throw error;
  }

  revalidatePath("/admin/trip-changes");
  revalidatePath("/admin/trips");
  revalidatePath("/trips");
  revalidatePath("/");
  updateTag("trips");
  updateTag("guides");

  if (change.type === "UPDATE" && change.tripId) {
    const trip = await prisma.trip.findUnique({
      where: { id: change.tripId },
      select: { slug: true },
    });
    if (trip) revalidatePath(`/trips/${trip.slug}`);
  } else {
    revalidatePath(`/trips/${proposal.slug}`);
  }

  if (change.guide?.slug) {
    revalidatePath(`/${change.guide.slug}`);
  }

  const guideUser = change.guide?.user;
  if (guideUser) {
    await notifyUser(guideUser.id, {
      type: "TRIP_CHANGE_APPROVED",
      title: "Trip change approved",
      body: `Your change for “${proposal.title}” was approved and is now live.`,
      href: "/guide-board/trips#review-history",
    });
    sendEmailAfter(
      tripChangeDecisionEmail({
        to: guideUser.email,
        name: guideUser.name ?? "",
        approved: true,
        tripTitle: proposal.title,
      }),
    );
  }

  await logActivity({
    userId: change.submittedById,
    action: "TRIP_CHANGE_APPROVED",
    label: "Guide trip change approved",
    metadata: { changeId, title: proposal.title },
  });
}

export async function rejectTripChangeAction(changeId: string) {
  const session = await requirePermission("trips.manage", "/login?callbackUrl=/admin/trip-changes");

  if (!changeId) {
    throw new Error("Missing change id.");
  }

  const change = await prisma.tripChangeRequest.findUnique({
    where: { id: changeId },
    include: {
      guide: {
        select: {
          user: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });

  if (!change) {
    throw new Error("Change request not found.");
  }

  if (change.status !== "PENDING") {
    throw new Error("This change has already been reviewed.");
  }

  const proposal = change.proposed as unknown as TripProposal;

  await prisma.tripChangeRequest.update({
    where: { id: changeId },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedById: session.user.id,
    },
  });

  revalidatePath("/admin/trip-changes");

  const guideUser = change.guide?.user;
  if (guideUser) {
    await notifyUser(guideUser.id, {
      type: "TRIP_CHANGE_REJECTED",
      title: "Trip change rejected",
      body: `Your change for “${proposal.title}” was rejected. You can revise and resubmit it.`,
      href: "/guide-board/trips#review-history",
    });
    sendEmailAfter(
      tripChangeDecisionEmail({
        to: guideUser.email,
        name: guideUser.name ?? "",
        approved: false,
        tripTitle: proposal.title,
      }),
    );
  }

  await logActivity({
    userId: change.submittedById,
    action: "TRIP_CHANGE_REJECTED",
    label: "Guide trip change rejected",
    metadata: { changeId, title: proposal.title },
  });
}
