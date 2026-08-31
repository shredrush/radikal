import { cache } from "react";
import { unstable_cache, updateTag } from "next/cache";

import { prisma } from "@/lib/prisma";

export type ProfileSummary = {
  unreadNotifications: number;
  bookingTotal: number;
  upcomingBookings: number;
  supportUnread: number;
};

const emptyProfileSummary: ProfileSummary = {
  unreadNotifications: 0,
  bookingTotal: 0,
  upcomingBookings: 0,
  supportUnread: 0,
};

/**
 * The profile shell needs a few small counters on every visit. Reading them in
 * one query and caching per user prevents the shell from opening several DB
 * operations during every profile navigation.
 */
export const getProfileSummary = cache((userId: string) =>
  unstable_cache(
    async () => {
      const [summary] = await prisma.$queryRaw<ProfileSummary[]>`
        SELECT
          (
            SELECT COUNT(*)::int
            FROM notifications
            WHERE "userId" = ${userId} AND "readAt" IS NULL
          ) AS "unreadNotifications",
          (
            SELECT COUNT(*)::int
            FROM bookings b
            INNER JOIN trips t ON t.id = b."tripId" AND t."deletedAt" IS NULL
            WHERE b."userId" = ${userId} AND b."deletedAt" IS NULL
          ) AS "bookingTotal",
          (
            SELECT COUNT(*) FILTER (WHERE b.status = 'CONFIRMED')::int
            FROM bookings b
            INNER JOIN trips t ON t.id = b."tripId" AND t."deletedAt" IS NULL
            WHERE b."userId" = ${userId} AND b."deletedAt" IS NULL
          ) AS "upcomingBookings",
          (
            SELECT COUNT(sm.id)::int
            FROM support_chats sc
            LEFT JOIN support_messages sm
              ON sm."chatId" = sc.id
             AND sm."senderId" <> ${userId}
             AND sm."createdAt" > COALESCE(sc."customerLastReadAt", sc."createdAt")
            WHERE sc."userId" = ${userId} AND sc."deletedAt" IS NULL
          ) AS "supportUnread"
      `;

      return summary ?? emptyProfileSummary;
    },
    ["profile-summary", userId],
    { tags: [`profile-summary:${userId}`], revalidate: 30 },
  )(),
);

export function invalidateProfileSummary(userId: string) {
  updateTag(`profile-summary:${userId}`);
}
