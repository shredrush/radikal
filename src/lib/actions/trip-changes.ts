"use server";

import { revalidatePath, updateTag } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { isValidSlug, isSafeImageSource, sanitizeText } from "@/lib/sanitize";
import { notifyTripReviewStaff, notifyUser } from "@/lib/notifications";
import { slugifyTripTitle, type TripProposal } from "@/lib/trip-changes";
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
async function uniqueActivitySlug(title: string): Promise<string> {
  const base = slugifyTripTitle(title) || "trip";
  let slug = isValidSlug(base) ? base : "trip";
  let attempts = 0;

  while (attempts < 25) {
    const taken = await prisma.activity.findUnique({ where: { slug }, select: { id: true } });
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
  const slug = await uniqueActivitySlug(fields.title);

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
  const activityId = asString(formData.get("activityId"));

  if (!activityId) {
    throw new Error("Missing trip id.");
  }

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    include: {
      tripLocation: true,
      inclusions: { orderBy: { order: "asc" } },
      highlights: { orderBy: { order: "asc" } },
    },
  });

  if (!activity) {
    throw new Error("Trip not found.");
  }

  if (activity.guideId !== guide.id) {
    throw new Error("You can only edit your own trips.");
  }

  const fields = validateTripFields(readTripFields(formData));

  const original: TripProposal = {
    slug: activity.slug,
    title: activity.title,
    type: activity.type,
    location: activity.location,
    description: activity.description,
    priceInRupees: activity.priceInRupees,
    durationDays: activity.durationDays,
    maxGroupSize: activity.maxGroupSize,
    categories: activity.categories,
    images: activity.images,
    pickup: activity.tripLocation?.pickup ?? "",
    drop: activity.tripLocation?.drop ?? "",
    inclusions: activity.inclusions.filter((i) => i.included).map((i) => i.item),
    exclusions: activity.inclusions.filter((i) => !i.included).map((i) => i.item),
    highlights: activity.highlights.map((h) => h.text),
  };

  const proposal: TripProposal = { ...fields, slug: activity.slug };

  await prisma.tripChangeRequest.create({
    data: {
      type: "UPDATE",
      guideId: guide.id,
      activityId,
      proposed: proposal as unknown as Prisma.InputJsonValue,
      original: original as unknown as Prisma.InputJsonValue,
      submittedById: userId,
    },
  });

  await notifySubmitted(guide.name, proposal);

  revalidatePath("/profile");
  revalidatePath("/admin/trip-changes");
}

/** Apply the supplemental (location/inclusions/highlights) side tables. */
async function applySupplemental(
  tx: Prisma.TransactionClient,
  activityId: string,
  proposal: TripProposal,
) {
  if (proposal.pickup || proposal.drop) {
    await tx.tripLocation.upsert({
      where: { activityId },
      update: { pickup: proposal.pickup, drop: proposal.drop },
      create: { activityId, pickup: proposal.pickup, drop: proposal.drop },
    });
  } else {
    await tx.tripLocation.deleteMany({ where: { activityId } });
  }

  await tx.tripInclusion.deleteMany({ where: { activityId } });
  if (proposal.inclusions.length > 0 || proposal.exclusions.length > 0) {
    await tx.tripInclusion.createMany({
      data: [
        ...proposal.inclusions.map((item, order) => ({ activityId, item, included: true, order })),
        ...proposal.exclusions.map((item, order) => ({ activityId, item, included: false, order })),
      ],
    });
  }

  await tx.tripHighlight.deleteMany({ where: { activityId } });
  if (proposal.highlights.length > 0) {
    await tx.tripHighlight.createMany({
      data: proposal.highlights.map((text, order) => ({ activityId, text, order })),
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
        const activity = await tx.activity.create({
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

        await applySupplemental(tx, activity.id, proposal);
      } else {
        if (!change.activityId) {
          throw new Error("Missing trip id for this change.");
        }

        const existing = await tx.activity.findUnique({
          where: { id: change.activityId },
          select: { id: true, guideId: true },
        });

        if (!existing) {
          throw new Error("The trip no longer exists.");
        }

        if (existing.guideId !== change.guideId) {
          throw new Error("This trip is no longer linked to this guide.");
        }

        await tx.activity.update({
          where: { id: change.activityId },
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

        await applySupplemental(tx, change.activityId, proposal);
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

  if (change.type === "UPDATE" && change.activityId) {
    const activity = await prisma.activity.findUnique({
      where: { id: change.activityId },
      select: { slug: true },
    });
    if (activity) revalidatePath(`/trips/${activity.slug}`);
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
      href: "/profile?tab=trips",
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
      href: "/profile?tab=trips",
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
