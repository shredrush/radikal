"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";

import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { requireGuideAction } from "@/lib/guide-board";
import { slugify } from "@/lib/format";
import { assertValidStoredMedia } from "@/lib/media";
import {
  asString,
  readTripFields,
  validateTripFields,
} from "@/lib/trip-fields";
import { type TripProposal } from "@/lib/trip-changes";

// How long a preview link stays valid. Kept deliberately short so a leaked
// link is useless within minutes.
const PREVIEW_TTL_MS = 10 * 60 * 1000;

type PreviewContext =
  | { kind: "CREATE" }
  | { kind: "GUIDE"; guideId: string };

/**
 * Persist a trip snapshot under a fresh high-entropy token and return the
 * preview URL. Expired rows are swept in the same transaction so the table
 * never grows unbounded without a scheduled job.
 */
async function storePreview(
  proposed: TripProposal,
  context: PreviewContext,
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const now = new Date();

  await prisma.$transaction([
    prisma.tripPreview.create({
      data: {
        token,
        proposed: proposed as unknown as Prisma.InputJsonValue,
        context: context as unknown as Prisma.InputJsonValue,
        expiresAt: new Date(now.getTime() + PREVIEW_TTL_MS),
      },
    }),
    prisma.tripPreview.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);

  return `/preview/${token}`;
}

/** Preview for the admin "Add a trip" form — sanitizes the current form state. */
export async function createTripPreviewAction(
  formData: FormData,
): Promise<{ url: string }> {
  await requirePermission("trips.manage", "/login?callbackUrl=/admin/trips");

  const fields = validateTripFields(readTripFields(formData));
  const url = await storePreview(fields, { kind: "CREATE" });
  return { url };
}

/** Preview for the guide board trip form — only the owning guide can open it. */
export async function createGuideTripPreviewAction(
  formData: FormData,
): Promise<{ url: string }> {
  const { guide } = await requireGuideAction();
  const tripId = asString(formData.get("tripId"));

  // Reuse the shared parsing/validation pipeline (sanitization, media limits
  // and stored-media verification) so a preview can never render content the
  // publish flow would reject.
  const fields = readTripFields(formData);

  if (tripId) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { guideId: true, slug: true, deletedAt: true },
    });
    if (!trip || trip.guideId !== guide.id) {
      throw new Error("You can only preview your own trips.");
    }
    if (trip.deletedAt) {
      throw new Error("Deleted trips cannot be previewed.");
    }
    fields.slug = trip.slug;
  } else {
    fields.slug = slugify(asString(formData.get("title")), 60) || "trip-preview";
  }

  fields.guideId = guide.id;
  validateTripFields(fields);
  await Promise.all([
    assertValidStoredMedia("images", fields.images),
    assertValidStoredMedia("videos", fields.videos),
  ]);

  const url = await storePreview(fields, { kind: "GUIDE", guideId: guide.id });
  return { url };
}

export async function authorizeTripPreviewAction(context: Prisma.JsonValue) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findFirst({
    where: { id: session.user.id, deletedAt: null },
    select: { role: true, guide: { select: { id: true, deletedAt: true } } },
  });

  if (hasPermission(user?.role, "trips.manage")) return;

  const value = typeof context === "object" && context !== null && !Array.isArray(context)
    ? context as Record<string, unknown>
    : null;
  if (
    value?.kind === "GUIDE" &&
    typeof value.guideId === "string" &&
    user?.guide?.id === value.guideId &&
    !user.guide.deletedAt
  ) {
    return;
  }

  redirect("/profile");
}
