import type { Prisma } from "@/generated/prisma/client";

/**
 * Unlink everything that references a Guide row, then delete the Guide itself.
 * Trips and reviews keep their rows but drop the guide link; certifications,
 * trip-change requests, and trip drafts cascade away with the guide.
 * Safe to call inside a transaction — used by guide deletion and when a guide
 * is demoted to a non-guide role.
 */
export async function unlinkAndDeleteGuide(
  tx: Prisma.TransactionClient,
  guideId: string,
) {
  await tx.trip.updateMany({ where: { guideId }, data: { guideId: null } });
  await tx.review.updateMany({ where: { guideId }, data: { guideId: null } });
  await tx.guide.delete({ where: { id: guideId } });
}
