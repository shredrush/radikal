"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { rateLimit, rateLimitError } from "@/lib/rate-limit";

export type ToggleWishlistResult =
  | { success: true; inWishlist: boolean }
  | { success: false; error: string };

/**
 * Adds or removes a trip from the logged-in user's wishlist. The tripId is the
 * only client input; the user is always derived from the server-side session.
 */
export async function toggleWishlist(
  tripId: string,
): Promise<ToggleWishlistResult> {
  if (typeof tripId !== "string" || tripId.length === 0) {
    return { success: false, error: "Invalid trip." };
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      success: false,
      error: "You must be logged in to manage your wishlist.",
    };
  }

  const wishlistLimit = rateLimit(`wishlist:user:${userId}`, 60, 60_000);
  if (!wishlistLimit.success) {
    return { success: false, error: rateLimitError(wishlistLimit) };
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true },
  });
  if (!trip) {
    return { success: false, error: "This trip no longer exists." };
  }

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_tripId: { userId, tripId } },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    await logActivity({
      userId,
      action: "WISHLIST_REMOVED",
      label: "Removed a trip from their wishlist",
      metadata: { tripId },
    });
    revalidatePath("/profile");
    return { success: true, inWishlist: false };
  }

  await prisma.wishlistItem.create({
    data: { userId, tripId },
  });
  await logActivity({
    userId,
    action: "WISHLIST_ADDED",
    label: "Added a trip to their wishlist",
    metadata: { tripId },
  });
  revalidatePath("/profile");
  return { success: true, inWishlist: true };
}
