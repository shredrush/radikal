"use server";

import { revalidatePath, updateTag } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logActivity } from "@/lib/activity-log";
import { notifyUser } from "@/lib/notifications";
import { sendEmailAfter, tripChangeDecisionEmail, bookingCancelledEmail } from "@/lib/email";
import {
  validTypes,
  asString,
  readTripFields,
  validateTripFields,
} from "@/lib/trip-fields";
import { parseSlotInteger } from "@/lib/validations/slots";
import { assertValidStoredMedia } from "@/lib/media";
import { sanitizeText } from "@/lib/sanitize";
import { cancelActiveBookingsForSlot, type CancellationEmail } from "@/lib/actions/payment";
import { startOfTodayIST } from "@/lib/dates";

function revalidateTripPages(slug: string) {
  revalidatePath("/admin/trips");
  revalidatePath("/admin/trip-changes");
  revalidatePath("/trips");
  revalidatePath("/");
  updateTag("trips");
  revalidatePath(`/trips/${slug}`);
}

function isUniqueConstraint(error: unknown) {
  return error instanceof Error && error.message.includes("Unique constraint failed");
}

/** Authoritative, parallel size/type/duration validation of submitted media. */
async function assertValidTripMedia(images: string[], videos: string[]) {
  await Promise.all([
    assertValidStoredMedia("images", images),
    assertValidStoredMedia("videos", videos),
  ]);
}

export async function createTripAction(formData: FormData) {
  await requirePermission("trips.manage", "/login?callbackUrl=/admin/trips");

  const fields = validateTripFields(readTripFields(formData));
  await assertValidTripMedia(fields.images, fields.videos);
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
    videos,
    categories,
    pickup,
    drop,
    inclusions,
    exclusions,
    highlights,
  } = fields;

  try {
    await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.create({
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
          videos,
          guideId: guideId || null,
        },
      });

      if (pickup || drop) {
        await tx.tripLocation.create({
          data: { tripId: trip.id, pickup, drop },
        });
      }

      if (inclusions.length > 0 || exclusions.length > 0) {
        await tx.tripInclusion.createMany({
          data: [
            ...inclusions.map((item, order) => ({ tripId: trip.id, item, included: true, order })),
            ...exclusions.map((item, order) => ({ tripId: trip.id, item, included: false, order })),
          ],
        });
      }

      if (highlights.length > 0) {
        await tx.tripHighlight.createMany({
          data: highlights.map((text, order) => ({ tripId: trip.id, text, order })),
        });
      }
    });
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw new Error("Slug already exists. Please choose a different slug.");
    }

    throw error;
  }

  revalidateTripPages(slug);
}

export async function updateTripAction(formData: FormData) {
  await requirePermission("trips.manage", "/login?callbackUrl=/admin/trips");

  const tripId = asString(formData.get("tripId"));
  const fields = validateTripFields(readTripFields(formData));
  await assertValidTripMedia(fields.images, fields.videos);
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
    videos,
    categories,
    pickup,
    drop,
    inclusions,
    exclusions,
    highlights,
  } = fields;

  if (!tripId) {
    throw new Error("Missing trip id.");
  }

  let previousSlug = "";

  try {
    await prisma.$transaction(async (tx) => {
      const currentTrip = await tx.trip.findUnique({
        where: { id: tripId },
        select: { slug: true },
      });

      if (!currentTrip) {
        throw new Error("Trip not found.");
      }

      previousSlug = currentTrip.slug;

      await tx.trip.update({
        where: { id: tripId },
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
          videos,
          guideId: guideId || null,
        },
      });

      // If both are blank, remove any existing location row to avoid stale values.
      if (pickup || drop) {
        await tx.tripLocation.upsert({
          where: { tripId },
          update: { pickup, drop },
          create: { tripId, pickup, drop },
        });
      } else {
        await tx.tripLocation.deleteMany({ where: { tripId } });
      }

      await tx.tripInclusion.deleteMany({ where: { tripId } });
      if (inclusions.length > 0 || exclusions.length > 0) {
        await tx.tripInclusion.createMany({
          data: [
            ...inclusions.map((item, order) => ({ tripId, item, included: true, order })),
            ...exclusions.map((item, order) => ({ tripId, item, included: false, order })),
          ],
        });
      }

      await tx.tripHighlight.deleteMany({ where: { tripId } });
      if (highlights.length > 0) {
        await tx.tripHighlight.createMany({
          data: highlights.map((text, order) => ({ tripId, text, order })),
        });
      }
    });
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw new Error("Slug already exists. Please choose a different slug.");
    }

    throw error;
  }

  revalidateTripPages(previousSlug);

  if (slug !== previousSlug) {
    revalidatePath(`/trips/${slug}`);
  }
}

export async function deleteTripAction(tripId: string, reason?: string) {
  const session = await requirePermission("trips.manage", "/login?callbackUrl=/admin/trips");

  if (!tripId) {
    throw new Error("Missing trip id.");
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { slug: true, title: true, deletedAt: true },
  });

  if (!trip) {
    throw new Error("Trip not found.");
  }

  if (trip.deletedAt) {
    throw new Error("Trip is already deleted.");
  }

  let rejectedChanges: { id: string; submittedById: string }[] = [];
  const deletedAt = new Date();

  await prisma.$transaction(async (tx) => {
    // Lock the trip row so concurrent booking/restore/delete operations
    // serialize against this soft delete.
    const [lockedTrip] = await tx.$queryRaw<Array<{ id: string; deletedAt: Date | null }>>`
      SELECT id, "deletedAt" FROM trips WHERE id = ${tripId} FOR UPDATE
    `;
    if (!lockedTrip) {
      throw new Error("Trip not found.");
    }
    if (lockedTrip.deletedAt) {
      throw new Error("Trip is already deleted.");
    }

    // Resolve pending UPDATE changes through the normal review lifecycle
    // instead of deleting them: reject them, notify the submitting guide, and
    // keep an audit trail.
    rejectedChanges = await tx.tripChangeRequest.findMany({
      where: { tripId, type: "UPDATE", status: "PENDING" },
      select: { id: true, submittedById: true },
    });
    if (rejectedChanges.length > 0) {
      await tx.tripChangeRequest.updateMany({
        where: { id: { in: rejectedChanges.map((change) => change.id) } },
        data: {
          status: "REJECTED",
          reviewedById: session.user.id,
          reviewedAt: new Date(),
        },
      });
    }

    await Promise.all([
      tx.trip.update({ where: { id: tripId }, data: { deletedAt, deletedById: session.user.id } }),
      tx.slot.updateMany({ where: { tripId, deletedAt: null }, data: { deletedAt, deletedWithTrip: true } }),
      tx.booking.updateMany({
        where: { tripId, deletedAt: null },
        data: { deletedAt, deletedWithTrip: true, deletedById: session.user.id, deletedByRole: session.user.role },
      }),
      tx.wishlistItem.updateMany({ where: { tripId, deletedAt: null }, data: { deletedAt, deletedWithTrip: true } }),
      tx.review.updateMany({ where: { tripId, deletedAt: null }, data: { deletedAt, deletedWithTrip: true } }),
    ]);
  });

  if (rejectedChanges.length > 0) {
    const submitters = await prisma.user.findMany({
      where: {
        id: { in: [...new Set(rejectedChanges.map((change) => change.submittedById))] },
      },
      select: { id: true, email: true, name: true },
    });

    for (const user of submitters) {
      await notifyUser(user.id, {
        type: "TRIP_CHANGE_REJECTED",
        title: "Trip change rejected",
        body: `Your pending trip change for “${trip.title}” was rejected because the trip was deleted.`,
        href: "/guide-board/trips#activity-log",
      });
      sendEmailAfter(
        tripChangeDecisionEmail({
          to: user.email,
          name: user.name ?? "",
          approved: false,
          tripTitle: trip.title,
        }),
      );
    }

    await logActivity({
      userId: session.user.id,
      action: "TRIP_CHANGE_REJECTED",
      label: `Rejected ${rejectedChanges.length} pending trip change(s) for deleted trip “${trip.title}”`,
      metadata: { tripId, changeIds: rejectedChanges.map((change) => change.id) },
    });
  }

  await logActivity({
    userId: session.user.id,
    action: "TRIP_DELETED",
    label: "Deleted a trip",
    metadata: { tripId, title: trip.title, ...(reason ? { reason } : {}) },
  });

  revalidatePath("/admin/trips");
  revalidatePath("/admin/trip-changes");
  revalidatePath("/trips");
  revalidatePath("/");
  updateTag("trips");
  revalidatePath(`/trips/${trip.slug}`);
}

export async function restoreTripAction(tripId: string) {
  const session = await requirePermission("trips.manage", "/login?callbackUrl=/admin/trips");

  if (!tripId) {
    throw new Error("Missing trip id.");
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { slug: true, title: true, deletedAt: true },
  });

  if (!trip) {
    throw new Error("Trip not found.");
  }

  if (!trip.deletedAt) {
    throw new Error("Trip is not deleted.");
  }

  await prisma.$transaction(async (tx) => {
    await Promise.all([
      tx.trip.update({ where: { id: tripId }, data: { deletedAt: null, deletedById: null } }),
      tx.slot.updateMany({ where: { tripId, deletedWithTrip: true }, data: { deletedAt: null, deletedWithTrip: false } }),
      tx.booking.updateMany({
        where: { tripId, deletedWithTrip: true },
        data: { deletedAt: null, deletedWithTrip: false, deletedById: null, deletedByRole: null },
      }),
      tx.wishlistItem.updateMany({ where: { tripId, deletedWithTrip: true }, data: { deletedAt: null, deletedWithTrip: false } }),
      tx.review.updateMany({ where: { tripId, deletedWithTrip: true }, data: { deletedAt: null, deletedWithTrip: false } }),
    ]);
  });

  await logActivity({
    userId: session.user.id,
    action: "TRIP_RESTORED",
    label: "Restored a deleted trip",
    metadata: { tripId, title: trip.title },
  });

  revalidatePath("/admin/trips");
  revalidatePath("/admin/trip-changes");
  revalidatePath("/trips");
  revalidatePath("/");
  updateTag("trips");
  updateTag("reviews");
  revalidatePath(`/trips/${trip.slug}`);
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

  const tripId = asString(formData.get("tripId"));
  const dateValue = asString(formData.get("date"));
  const capacity = parseSlotInteger(asString(formData.get("capacity")));
  const reserved = parseSlotInteger(asString(formData.get("reserved")), 0);

  if (!tripId) {
    throw new Error("Missing trip id.");
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
    const trip = await tx.trip.findUnique({
      where: { id: tripId },
      select: { slug: true },
    });

    if (!trip) {
      throw new Error("Trip not found.");
    }

    slug = trip.slug;

    await tx.slot.create({
      data: { tripId, date, capacity, reserved },
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
      include: { trip: { select: { slug: true } } },
    });

    if (!slot) {
      throw new Error("Slot not found.");
    }

    slug = slot.trip.slug;

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

export async function cancelSlotAction(slotId: string, reason?: string) {
  const session = await requirePermission("trips.manage", "/login?callbackUrl=/admin/trips");

  if (!slotId) {
    throw new Error("Missing slot id.");
  }

  const cleanReason = sanitizeText(reason ?? "", { maxLength: 500 });
  const now = new Date();
  let emails: CancellationEmail[] = [];
  let slug = "";
  let slotDate = "";
  let slotCapacity = 0;
  let slotReserved = 0;

  await prisma.$transaction(async (tx) => {
    const slot = await tx.slot.findUnique({
      where: { id: slotId },
      include: {
        trip: {
          select: {
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

    if (!slot) {
      throw new Error("Slot not found.");
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

    slug = slot.trip.slug;
    slotDate = slot.date.toISOString();
    slotCapacity = slot.capacity;
    slotReserved = slot.reserved;
    emails = await cancelActiveBookingsForSlot(
      tx,
      slot,
      { id: session.user.id, role: session.user.role },
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
    await logActivity({
      userId: session.user.id,
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
      userId: session.user.id,
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

  revalidateSlotPages(slug);
  revalidatePath("/admin/bookings");
  revalidatePath("/guide-board/bookings");
  revalidatePath("/support");
  revalidatePath("/profile");
}
