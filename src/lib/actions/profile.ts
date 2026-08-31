"use server";

import { revalidatePath, updateTag } from "next/cache";

import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { assertValidStoredProfileImage, removeStoredMedia } from "@/lib/media";
import { rateLimit, rateLimitError } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { PROFILE_AVATARS } from "@/lib/profile-avatars";

export type ProfilePhotoActionState = {
  error?: string;
  success?: boolean;
};

export async function updateProfilePhotoAction(
  _prevState: ProfilePhotoActionState,
  formData: FormData,
): Promise<ProfilePhotoActionState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "You must be logged in to update your profile photo." };

  const photoLimit = rateLimit(`profile-photo:user:${userId}`, 10, 60 * 60_000);
  if (!photoLimit.success) return { error: rateLimitError(photoLimit) };

  const avatarKey = formData.get("avatarKey")?.toString() ?? "";
  const avatar = PROFILE_AVATARS.find((item) => item.key === avatarKey);
  const imageUrl = formData.get("imageUrl")?.toString() ?? "";

  let image: string;
  if (avatar) {
    image = avatar.src;
  } else if (imageUrl) {
    try {
      await assertValidStoredProfileImage(imageUrl, userId);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Profile photo could not be validated." };
    }
    image = imageUrl;
  } else {
    return { error: "Choose an avatar or upload a photo." };
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { image },
  });
  if (existing?.image && existing.image !== image) void removeStoredMedia([existing.image]);
  await logActivity({ userId, action: "PROFILE_PHOTO_CHANGED", label: "Changed profile photo" });
  revalidatePath("/profile");
  // Invalidate the cached header avatar (see lib/profile-user.ts).
  updateTag("profiles");

  return { success: true };
}
