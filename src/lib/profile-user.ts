import { cache } from "react";

import { prisma } from "@/lib/prisma";

const profileUserSelect = {
  image: true,
  guide: {
    select: {
      photo: true,
      photos: true,
      user: { select: { username: true } },
    },
  },
} as const;

/**
 * The current user's avatar data, deduplicated per request with React `cache`.
 * Both the site header (root layout) and the profile page need the same row,
 * so sharing this helper turns two round-trips into one within a single
 * server-side render.
 */
export const getProfileUser = cache((userId: string) =>
  prisma.user.findUnique({
    where: { id: userId },
    select: profileUserSelect,
  }),
);
