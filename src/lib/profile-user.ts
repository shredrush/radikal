import { cache } from "react";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";

const profileUserSelect = {
  email: true,
  phone: true,
  image: true,
  usernameChangeCount: true,
} as const;

/**
 * The current user's avatar data, deduplicated per request with React `cache`.
 * Both the site header (root layout) and the profile page need the same row,
 * so sharing this helper turns two round-trips into one within a single
 * server-side render.
 *
 * It is also wrapped in `unstable_cache` (keyed by user id) so the header's
 * avatar read stops hitting Postgres on every page request — the site header
 * renders on every route, so this was a per-request DB round-trip on the most
 * visited pages. Invalidation: tagged "profiles" (photo changes) and "guides"
 * `revalidate` bounds staleness for anything that slips through.
 */
export const getProfileUser = cache((userId: string) =>
  unstable_cache(
    async () =>
      prisma.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: profileUserSelect,
      }),
    ["profile-user", userId],
    { tags: ["profiles"], revalidate: 60 },
  )(),
);
