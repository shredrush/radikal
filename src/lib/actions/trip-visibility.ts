"use server";

import { revalidatePath, updateTag } from "next/cache";

import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/authz";
import { logActivity } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";

/**
 * Changes a trip's traveller-facing visibility without retiring its operational
 * data. Staff with trip management permission can manage every trip; guides can
 * manage only trips owned by their active guide profile.
 */
export async function setTripActiveAction(tripId: string, active: boolean): Promise<void> {
  if (typeof tripId !== "string" || !tripId.trim()) {
    throw new Error("Missing trip.");
  }
  if (typeof active !== "boolean") {
    throw new Error("Invalid trip visibility.");
  }

  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in to manage trips.");
  }

  const [user, trip] = await Promise.all([
    prisma.user.findFirst({
      where: { id: session.user.id, deletedAt: null },
      select: { role: true, guide: { select: { id: true, deletedAt: true } } },
    }),
    prisma.trip.findUnique({
      where: { id: tripId },
      select: { id: true, title: true, slug: true, guideId: true, active: true, deletedAt: true },
    }),
  ]);

  if (!user) throw new Error("You are not authorized to manage trips.");
  if (!trip || trip.deletedAt) throw new Error("Trip not found.");

  const canManageAllTrips = hasPermission(user.role, "trips.manage");
  const ownsTrip = user.role === "GUIDE" && !user.guide?.deletedAt && user.guide?.id === trip.guideId;
  if (!canManageAllTrips && !ownsTrip) {
    throw new Error("You can only manage your own trips.");
  }

  if (trip.active === active) return;

  await prisma.trip.update({ where: { id: trip.id }, data: { active } });
  await logActivity({
    userId: session.user.id,
    action: active ? "TRIP_ACTIVATED" : "TRIP_DEACTIVATED",
    label: active ? "Made a trip active" : "Made a trip inactive",
    metadata: { tripId: trip.id, title: trip.title },
  });

  revalidatePath("/");
  revalidatePath("/trips");
  revalidatePath(`/trips/${trip.slug}`);
  revalidatePath("/guide-board/trips");
  revalidatePath("/admin/trips");
  updateTag("trips");
}
