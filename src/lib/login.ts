import { prisma } from "@/lib/prisma";
import { normalizeUsername } from "@/lib/sanitize";

/** Whether a login identifier looks like an email address. */
export function isEmailLike(identifier: string): boolean {
  return identifier.includes("@");
}

/**
 * Resolve a login identifier (either an email address or a username) to a
 * user record. Emails are matched case-insensitively; usernames are
 * normalized to their canonical lowercase slug form before lookup.
 */
export function findUserByIdentifier(identifier: string) {
  if (isEmailLike(identifier)) {
    return prisma.user.findUnique({
      where: { email: identifier.trim().toLowerCase() },
    });
  }
  return prisma.user.findUnique({
    where: { username: normalizeUsername(identifier) },
  });
}
