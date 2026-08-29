import { prisma } from "@/lib/prisma";

/**
 * Count trip-change requests still awaiting admin review. Shared by the admin
 * board pages so the "Trip changes" badge in the header and each page's
 * parallel query batch read the same definition of a pending request.
 */
export function countPendingTripChanges() {
  return prisma.tripChangeRequest.count({ where: { status: "PENDING" } });
}
