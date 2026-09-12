import { revalidatePath, updateTag } from "next/cache";

/**
 * Single source of truth for the cache surfaces that render a guide. Used by
 * both the guide actions and the admin user actions so a name/username change
 * never leaves one surface stale.
 */
export function revalidateGuidePages(...usernames: Array<string | null | undefined>) {
  revalidatePath("/admin/guides");
  revalidatePath("/community");
  revalidatePath("/");
  updateTag("guides");

  for (const username of usernames) {
    if (username) {
      revalidatePath(`/${username}`);
    }
  }
}
