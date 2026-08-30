import type { Prisma } from "@/generated/prisma/client";

/**
 * Deactivate a Guide row without deleting connected history. Trips, reviews,
 * certifications, trip-change requests, and drafts keep their links so admin
 * history remains connected and can be audited later.
 * Safe to call inside a transaction — used by guide deletion and when a guide
 * is demoted to a non-guide role.
 */
export async function deactivateGuide(
  tx: Prisma.TransactionClient,
  guideId: string,
) {
  const deletedAt = new Date();
  await Promise.all([
    tx.guide.update({ where: { id: guideId }, data: { deletedAt } }),
    tx.trip.updateMany({ where: { guideId, deletedAt: null }, data: { deletedAt } }),
    tx.slot.updateMany({ where: { trip: { guideId }, deletedAt: null }, data: { deletedAt, deletedWithTrip: true } }),
    tx.booking.updateMany({ where: { trip: { guideId }, deletedAt: null }, data: { deletedAt, deletedWithTrip: true } }),
    tx.wishlistItem.updateMany({ where: { trip: { guideId }, deletedAt: null }, data: { deletedAt, deletedWithTrip: true } }),
    tx.review.updateMany({ where: { guideId, deletedAt: null }, data: { deletedAt, deletedWithGuide: true } }),
    tx.tripDraft.updateMany({ where: { guideId, deletedAt: null }, data: { deletedAt } }),
    tx.tripChangeRequest.updateMany({
      where: { guideId, status: "PENDING" },
      data: { status: "REJECTED", reviewedAt: deletedAt },
    }),
  ]);
}
