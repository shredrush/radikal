import crypto from "node:crypto";

import { prisma } from "@/lib/prisma";
import { generateUsername } from "@/lib/username-generator";

const USERNAME_CANDIDATE_BATCH_SIZE = 25;

/**
 * Choose an unused generated username with one indexed lookup instead of
 * probing the users table once per candidate.
 */
export async function generateAvailableUsername(prefix = "traveler"): Promise<string> {
  const candidates = new Set<string>();
  while (candidates.size < USERNAME_CANDIDATE_BATCH_SIZE) {
    candidates.add(generateUsername());
  }

  const existing = await prisma.user.findMany({
    where: { username: { in: [...candidates] } },
    select: { username: true },
  });
  const taken = new Set(existing.flatMap((user) => (user.username ? [user.username] : [])));

  for (const candidate of candidates) {
    if (!taken.has(candidate)) return candidate;
  }

  // The normal name pool has been exhausted for this batch. A 48-bit suffix
  // keeps the fallback collision probability negligible; the unique constraint
  // remains the final guard against concurrent account creation.
  return `${prefix}-${crypto.randomBytes(6).toString("hex")}`;
}
