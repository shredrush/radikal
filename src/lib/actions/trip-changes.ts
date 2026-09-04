"use server";

import { revalidatePath, updateTag } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/authz";
import { requireGuideAction } from "@/lib/guide-board";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { isValidSlug, sanitizeText } from "@/lib/sanitize";
import { notifyBookingStaff } from "@/lib/notifications";
import { MEDIA_LIMITS } from "@/lib/media-constants";
import { assertValidStoredMedia } from "@/lib/media";
import {
  asString,
  parseCategories,
  parseList,
  parseMediaList,
  validCategories,
  validTypes,
} from "@/lib/trip-fields";
import { type TripProposal } from "@/lib/trip-changes";
import { normalizeMediaOrder } from "@/lib/media-order";
import { slugify } from "@/lib/format";
import { parseSlotInteger } from "@/lib/validations/slots";
import {
  bookingCancelledEmail,
  guideCancelledBookingAdminEmail,
  sendEmailAfter,
} from "@/lib/email";
import { cancelActiveBookingsForSlot, type CancellationEmail } from "@/lib/actions/payment";
import { startOfTodayIST } from "@/lib/dates";

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
  videos: string[];
  mediaOrder: string[];
  guidePhoto: string;
  pickup: string;
  drop: string;
  inclusions: string[];
  exclusions: string[];
  highlights: string[];
};

function readTripFields(formData: FormData): TripFields {
  const images = parseMediaList(formData.getAll("images"));
  const videos = parseMediaList(formData.getAll("videos"));

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
    images,
    videos,
    mediaOrder: normalizeMediaOrder(images, videos, parseMediaList(formData.getAll("mediaOrder"))),
    guidePhoto: parseMediaList(formData.getAll("guidePhoto"))[0] ?? "",
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

/** Authoritative, parallel size/type validation of submitted media. */
async function assertValidTripMedia(fields: TripFields) {
  await Promise.all([
    assertValidStoredMedia("images", fields.images),
    assertValidStoredMedia("videos", fields.videos),
  ]);
}

async function assertGuidePhotoBelongsToGuide(guideId: string, guidePhoto: string) {
  if (!guidePhoto) return;
  const guide = await prisma.guide.findFirst({
    where: { id: guideId, deletedAt: null },
    select: { photo: true, photos: true, videos: true },
  });
  if (!guide || ![guide.photo, ...guide.photos, ...guide.videos].includes(guidePhoto)) {
    throw new Error("Choose a photo from your public profile.");
  }
}

/** Resolve the signed-in user's linked guide record, or throw. Role is
 * re-read from the database so a demotion is enforced immediately. */
async function requireGuide() {
  return requireGuideAction();
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

export async function submitTripCreateChangeAction(formData: FormData): Promise<void> {
  const { guide, userId } = await requireGuide();
  const fields = validateTripFields(readTripFields(formData));
  await assertValidTripMedia(fields);
  await assertGuidePhotoBelongsToGuide(guide.id, fields.guidePhoto);
  const slug = await uniqueTripSlug(fields.title);

  const proposal: TripProposal = { slug, ...fields };

  let change;
  try {
    change = await prisma.$transaction(async (tx) => {
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
          videos: proposal.videos,
          mediaOrder: normalizeMediaOrder(proposal.images, proposal.videos, proposal.mediaOrder),
          guidePhoto: proposal.guidePhoto || null,
          guideId: guide.id,
        },
      });
      await applySupplemental(tx, trip.id, proposal);
      return tx.tripChangeRequest.create({
        data: {
          type: "CREATE",
          guideId: guide.id,
          tripId: trip.id,
          proposed: proposal as unknown as Prisma.InputJsonValue,
          status: "APPROVED",
          submittedById: userId,
          reviewedAt: new Date(),
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint failed")) {
      throw new Error("A trip with this title already exists. Try a different title.");
    }
    throw error;
  }

  await logActivity({
    userId,
    action: "TRIP_CHANGE_SUBMITTED",
    label: "Published a new trip",
    metadata: { changeId: change.id, title: proposal.title },
  });

  revalidatePath("/profile");
  revalidatePath("/guide-board/trips");
  revalidatePath("/admin/trip-changes");
  revalidatePath("/admin/trips");
  revalidatePath("/trips");
  revalidatePath("/");
  revalidatePath(`/trips/${proposal.slug}`);
  updateTag("trips");
  updateTag("guides");
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

  if (trip.deletedAt) {
    throw new Error("Deleted trips cannot be published.");
  }

  if (trip.guideId !== guide.id) {
    throw new Error("You can only edit your own trips.");
  }

  const fields = validateTripFields(readTripFields(formData));
  await assertValidTripMedia(fields);
  await assertGuidePhotoBelongsToGuide(guide.id, fields.guidePhoto);

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
    videos: trip.videos,
    mediaOrder: trip.mediaOrder,
    guidePhoto: trip.guidePhoto ?? "",
    pickup: trip.tripLocation?.pickup ?? "",
    drop: trip.tripLocation?.drop ?? "",
    inclusions: trip.inclusions.filter((i) => i.included).map((i) => i.item),
    exclusions: trip.inclusions.filter((i) => !i.included).map((i) => i.item),
    highlights: trip.highlights.map((h) => h.text),
  };

  const proposal: TripProposal = { ...fields, slug: trip.slug };

  const change = await prisma.$transaction(async (tx) => {
    const updated = await tx.trip.updateMany({
      where: { id: tripId, deletedAt: null, guideId: guide.id },
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
        videos: proposal.videos,
        mediaOrder: normalizeMediaOrder(proposal.images, proposal.videos, proposal.mediaOrder),
        guidePhoto: proposal.guidePhoto || null,
      },
    });
    if (updated.count === 0) throw new Error("This trip is no longer available to edit.");
    await applySupplemental(tx, tripId, proposal);
    return tx.tripChangeRequest.create({
      data: {
        type: "UPDATE",
        guideId: guide.id,
        tripId,
        proposed: proposal as unknown as Prisma.InputJsonValue,
        original: original as unknown as Prisma.InputJsonValue,
        status: "APPROVED",
        submittedById: userId,
        reviewedAt: new Date(),
      },
    });
  });

  await logActivity({
    userId,
    action: "TRIP_CHANGE_SUBMITTED",
    label: "Published trip changes",
    metadata: { changeId: change.id, title: proposal.title },
  });

  revalidatePath("/profile");
  revalidatePath("/guide-board/trips");
  revalidatePath("/admin/trip-changes");
  revalidatePath("/admin/trips");
  revalidatePath("/trips");
  revalidatePath("/");
  revalidatePath(`/trips/${proposal.slug}`);
  updateTag("trips");
  updateTag("guides");
}

async function requireGuideTrip(tripId: string) {
  const { guide } = await requireGuide();
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true, slug: true, title: true, guideId: true, deletedAt: true },
  });

  if (!trip || trip.guideId !== guide.id) {
    throw new Error("You can only manage dates for your own trips.");
  }

  if (trip.deletedAt) {
    throw new Error("Deleted trips cannot be changed.");
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
    throw new Error("Reserved must be a whole number of 0 or more.");
  }
  if (reserved > capacity) {
    throw new Error("Reserved cannot be greater than the slot capacity.");
  }

  const date = parseSlotDate(dateValue);
  if (!date) throw new Error("Please enter a valid date.");

  const { userId } = await requireGuide();
  const trip = await requireGuideTrip(tripId);
  await prisma.slot.create({ data: { tripId: trip.id, date, capacity, reserved } });
  await logActivity({
    userId,
    action: "SLOT_ADDED",
    label: "Added a trip date",
    metadata: { tripId: trip.id, date: date.toISOString(), capacity, reserved },
  });
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
    throw new Error("Reserved must be a whole number of 0 or more.");
  }

  const date = parseSlotDate(dateValue);
  if (!date) throw new Error("Please enter a valid date.");

  const { guide, userId } = await requireGuide();
  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: { trip: { select: { guideId: true, slug: true, deletedAt: true } } },
  });

  if (!slot || slot.trip.guideId !== guide.id) {
    throw new Error("You can only manage dates for your own trips.");
  }
  if (slot.trip.deletedAt || slot.deletedAt) {
    throw new Error("Deleted trips cannot be changed.");
  }
  if (reserved > capacity - slot.booked) {
    throw new Error(`Reserved cannot exceed the ${capacity - slot.booked} places remaining after booked spots.`);
  }

  await prisma.slot.update({ where: { id: slotId }, data: { date, capacity, reserved } });
  await logActivity({
    userId,
    action: "SLOT_EDITED",
    label: "Updated a trip date",
    metadata: { slotId, tripId: slot.tripId, date: date.toISOString(), capacity, reserved, booked: slot.booked },
  });
  revalidateGuideSlotPages(slot.trip.slug);
}

export async function cancelGuideSlotAction(slotId: string, reason?: string): Promise<void> {
  if (!slotId) throw new Error("Missing slot id.");

  const { guide, userId } = await requireGuide();
  const cleanReason = sanitizeText(reason ?? "", { maxLength: 500 });
  const now = new Date();
  let emails: CancellationEmail[] = [];
  let tripSlug = "";
  let guideName = "";
  let tripTitle = "";
  let slotDate = "";
  let slotCapacity = 0;
  let slotReserved = 0;

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM slots WHERE id = ${slotId} FOR UPDATE`;
    const slot = await tx.slot.findUnique({
      where: { id: slotId },
      include: {
        trip: {
          select: {
            guideId: true,
            slug: true,
            title: true,
            deletedAt: true,
            guide: { select: { name: true } },
          },
        },
        bookings: {
          where: { status: { in: ["PENDING", "CONFIRMED"] } },
          include: { user: { select: { email: true, name: true } } },
        },
      },
    });

    if (!slot || slot.trip.guideId !== guide.id) {
      throw new Error("You can only manage dates for your own trips.");
    }
    if (slot.trip.deletedAt) {
      throw new Error("Deleted trips cannot be changed.");
    }
    if (slot.deletedAt) {
      throw new Error("This date is already cancelled.");
    }
    if (slot.date < startOfTodayIST()) {
      throw new Error("Only today or future dates can be cancelled.");
    }
    if (slot.bookings.length > 0 && !cleanReason) {
      throw new Error("This date has bookings. Add a reason so travellers know why it was cancelled.");
    }

    tripSlug = slot.trip.slug;
    guideName = slot.trip.guide?.name ?? "The guide";
    tripTitle = slot.trip.title;
    slotDate = slot.date.toISOString();
    slotCapacity = slot.capacity;
    slotReserved = slot.reserved;
    emails = await cancelActiveBookingsForSlot(
      tx,
      slot,
      { id: userId, role: guide.user.role },
      cleanReason || "Slot cancelled",
    );

    await tx.slot.update({
      where: { id: slotId },
      data: { deletedAt: now, deletedWithTrip: false },
    });
  });

  for (const email of emails) {
    sendEmailAfter(bookingCancelledEmail(email));
  }

  if (emails.length > 0) {
    try {
      const staff = await notifyBookingStaff({
        type: "BOOKING_CANCELLED_BY_GUIDE",
        title: "Trip date cancelled by guide",
        body: `${guideName} cancelled the date for “${tripTitle}” — ${emails.length} ${emails.length === 1 ? "booking" : "bookings"} cancelled.`,
        href: "/admin/bookings",
      });
      for (const user of staff) {
        sendEmailAfter(
          guideCancelledBookingAdminEmail({
            to: user.email,
            name: user.name ?? "",
            guideName,
            tripTitle,
            participantCount: emails.length,
          }),
        );
      }
    } catch (error) {
      console.error("[payment] failed to notify staff of guide slot cancellation", error);
    }

    await logActivity({
      userId,
      action: "BOOKING_CANCELLED",
      label: "Cancelled a trip date and its bookings",
      metadata: {
        slotId,
        date: slotDate,
        capacity: slotCapacity,
        reserved: slotReserved,
        booked: emails.length,
        reason: cleanReason,
      },
    });
  } else {
    await logActivity({
      userId,
      action: "SLOT_CANCELLED",
      label: "Cancelled an empty trip date",
      metadata: {
        slotId,
        date: slotDate,
        capacity: slotCapacity,
        reserved: slotReserved,
        booked: 0,
      },
    });
  }

  revalidateGuideSlotPages(tripSlug);
  revalidatePath("/admin/bookings");
  revalidatePath("/guide-board/bookings");
  revalidatePath("/support");
  revalidatePath("/profile");
}

export async function deleteGuideTripAction(tripId: string, reason?: string): Promise<void> {
  if (!tripId) throw new Error("Missing trip id.");

  const cleanReason = sanitizeText(reason ?? "", { maxLength: 500 });
  if (!cleanReason) throw new Error("Please provide a reason for deleting this trip.");

  const { guide, userId } = await requireGuide();
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true, slug: true, title: true, guideId: true, deletedAt: true },
  });

  if (!trip || trip.guideId !== guide.id) {
    throw new Error("You can only delete your own trips.");
  }

  if (trip.deletedAt) {
    throw new Error("Trip is already deleted.");
  }

  const deletedAt = new Date();
  await prisma.$transaction(async (tx) => {
    const [lockedTrip] = await tx.$queryRaw<Array<{ id: string; deletedAt: Date | null }>>`
      SELECT id, "deletedAt" FROM trips WHERE id = ${tripId} FOR UPDATE
    `;
    if (!lockedTrip) throw new Error("Trip not found.");
    if (lockedTrip.deletedAt) throw new Error("Trip is already deleted.");

    await Promise.all([
      tx.trip.update({ where: { id: tripId }, data: { deletedAt, deletedById: userId } }),
      tx.slot.updateMany({ where: { tripId, deletedAt: null }, data: { deletedAt, deletedWithTrip: true } }),
      tx.booking.updateMany({
        where: { tripId, deletedAt: null },
        data: { deletedAt, deletedWithTrip: true, deletedById: userId, deletedByRole: "GUIDE" },
      }),
      tx.wishlistItem.updateMany({ where: { tripId, deletedAt: null }, data: { deletedAt, deletedWithTrip: true } }),
      // Reviews are linked to the guide, not the trip: they stay live for as
      // long as the guide is on the platform, so a deleted trip never hides them.
      tx.tripChangeRequest.updateMany({
        where: { tripId, type: "UPDATE", status: "PENDING" },
        data: { status: "REJECTED", reviewedAt: deletedAt, reviewedById: userId },
      }),
    ]);
  });

  await logActivity({
    userId,
    action: "TRIP_DELETED",
    label: "Guide deleted a trip",
    metadata: { tripId, title: trip.title, reason: cleanReason },
  });

  revalidatePath("/profile");
  revalidatePath("/guide-board/trips");
  revalidatePath("/admin/trip-changes");
  revalidatePath("/admin/trips");
  revalidatePath("/trips");
  revalidatePath("/");
  revalidatePath(`/trips/${trip.slug}`);
  updateTag("trips");
  updateTag("reviews");
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

/**
 * Fetch the full proposed/original snapshot for one trip change. Callers wrap
 * this with their own authorization check.
 */
async function fetchChangeSnapshots(changeId: string) {
  if (!changeId) {
    throw new Error("Missing change id.");
  }

  const change = await prisma.tripChangeRequest.findUnique({
    where: { id: changeId },
    select: {
      type: true,
      guideId: true,
      proposed: true,
      original: true,
    },
  });

  if (!change) {
    throw new Error("Change request not found.");
  }

  return {
    type: change.type,
    guideId: change.guideId,
    proposed: change.proposed as unknown as TripProposal,
    original: change.original as unknown as TripProposal | null,
  };
}

/**
 * Fetch the full proposed/original snapshot for one trip change. Used by the
 * admin trip-changes history to load the diff lazily only when a card is
 * expanded.
 */
export async function getAdminTripChangeDetailsAction(changeId: string): Promise<{
  type: "CREATE" | "UPDATE";
  proposed: TripProposal;
  original: TripProposal | null;
}> {
  await requirePermission("trips.manage", "/login?callbackUrl=/admin/trip-changes");
  const change = await fetchChangeSnapshots(changeId);

  return {
    type: change.type,
    proposed: change.proposed,
    original: change.original,
  };
}

export type GuideActivityEntry = {
  id: string;
  action: string;
  label: string;
  createdAt: string;
  tripTitle: string | null;
  tripSlug: string | null;
  slotDate: string | null;
  reserved: number | null;
  booked: number | null;
  capacity: number | null;
};

/** Actions relevant to the guide-facing activity log panel. */
const GUIDE_ACTIVITY_ACTIONS = [
  "TRIP_CHANGE_SUBMITTED",
  "TRIP_DELETED",
  "SLOT_ADDED",
  "SLOT_EDITED",
  "SLOT_CANCELLED",
  "BOOKING_CANCELLED",
] as const;

function readActivityMetadata(metadata: Prisma.JsonValue | null): {
  tripId: string | null;
  slotId: string | null;
  title: string | null;
  date: string | null;
  reserved: number | null;
  booked: number | null;
  capacity: number | null;
} {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { tripId: null, slotId: null, title: null, date: null, reserved: null, booked: null, capacity: null };
  }
  const record = metadata as Record<string, unknown>;
  return {
    tripId: typeof record.tripId === "string" ? record.tripId : null,
    slotId: typeof record.slotId === "string" ? record.slotId : null,
    title: typeof record.title === "string" ? record.title : null,
    date: typeof record.date === "string" ? record.date : null,
    reserved: typeof record.reserved === "number" ? record.reserved : null,
    booked:
      typeof record.booked === "number"
        ? record.booked
        : typeof record.bookingCount === "number"
          ? record.bookingCount
          : null,
    capacity: typeof record.capacity === "number" ? record.capacity : null,
  };
}

/**
 * Loads the current guide's recent activity (trip edits, slot add/edit/cancel,
 * cancellations) newest first. Each entry is enriched with the related trip
 * title/slug and slot date when the logged metadata references them. Fetched
 * lazily by the guide board activity log panel only when the panel is expanded.
 */
export async function getGuideActivityLogAction(): Promise<GuideActivityEntry[]> {
  const { guide } = await requireGuide();

  const rows = await prisma.activityLog.findMany({
    where: {
      userId: guide.userId,
      action: { in: [...GUIDE_ACTIVITY_ACTIONS] },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const metas = rows.map((row) => readActivityMetadata(row.metadata));

  const slotIds = new Set<string>();
  const tripIds = new Set<string>();
  for (const meta of metas) {
    if (meta.slotId) slotIds.add(meta.slotId);
    if (meta.tripId) tripIds.add(meta.tripId);
  }

  const [slots, trips] = await Promise.all([
    slotIds.size > 0
      ? prisma.slot.findMany({
          where: { id: { in: [...slotIds] } },
          select: { id: true, date: true, tripId: true },
        })
      : Promise.resolve([]),
    tripIds.size > 0
      ? prisma.trip.findMany({
          where: { id: { in: [...tripIds] } },
          select: { id: true, title: true, slug: true, deletedAt: true },
        })
      : Promise.resolve([]),
  ]);

  const slotByMeta = new Map<string, { date: Date; tripId: string }>();
  for (const slot of slots) slotByMeta.set(slot.id, { date: slot.date, tripId: slot.tripId });

  const tripById = new Map(trips.map((trip) => [trip.id, trip]));

  return rows.map((row, index) => {
    const meta = metas[index];
    const slot = meta.slotId ? slotByMeta.get(meta.slotId) : undefined;
    const tripId = meta.tripId ?? slot?.tripId ?? null;
    const trip = tripId ? tripById.get(tripId) : undefined;
    const tripTitle = meta.title ?? trip?.title ?? null;

    return {
      id: row.id,
      action: row.action,
      label: row.label,
      createdAt: row.createdAt.toISOString(),
      tripTitle,
      tripSlug: trip && !trip.deletedAt ? trip.slug : null,
      slotDate: slot ? slot.date.toISOString() : meta.date ?? null,
      reserved: meta.reserved,
      booked: meta.booked,
      capacity: meta.capacity,
    };
  });
}
