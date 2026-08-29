import { permanentRedirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

/**
 * Resolve a retired username to its current owner's guide page. Called after a
 * guide page lookup by username misses, so old public URLs survive renames.
 * Throws a permanent redirect (308, the SEO equivalent of 301) to the current
 * username, or returns null when the alias does not exist.
 */
export async function resolveGuideAlias(username: string) {
  const alias = await prisma.usernameAlias.findUnique({
    where: { username },
    select: {
      user: {
        select: {
          guide: {
            select: {
              user: { select: { username: true } },
            },
          },
        },
      },
    },
  });

  const currentUsername = alias?.user.guide?.user.username;
  if (currentUsername && currentUsername !== username) {
    permanentRedirect(`/${currentUsername}`);
  }

  return null;
}
