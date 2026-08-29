"use server";

import { randomBytes } from "crypto";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { readTripFields, validateTripFields } from "@/lib/trip-fields";
import { type TripProposal } from "@/lib/trip-changes";

// How long a preview link stays valid. Kept deliberately short so a leaked
// link is useless within minutes.
const PREVIEW_TTL_MS = 10 * 60 * 1000;

type PreviewContext =
  | { kind: "CREATE" }
  | { kind: "CHANGE"; changeId: string };

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

/** Preview for a pending guide trip change — reads change.proposed directly. */
export async function createTripChangePreviewAction(
  changeId: string,
): Promise<{ url: string }> {
  await requirePermission(
    "trips.manage",
    "/login?callbackUrl=/admin/trip-changes",
  );

  if (!changeId) throw new Error("Missing change id.");

  const change = await prisma.tripChangeRequest.findUnique({
    where: { id: changeId },
    select: { proposed: true, status: true },
  });

  if (!change) throw new Error("Change request not found.");
  if (change.status !== "PENDING") {
    throw new Error("This change has already been reviewed.");
  }

  const url = await storePreview(change.proposed as unknown as TripProposal, {
    kind: "CHANGE",
    changeId,
  });
  return { url };
}
