"use server";

import { revalidatePath, updateTag } from "next/cache";

import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { MAX_IMAGE_BYTES } from "@/lib/media-constants";
import { rateLimit, rateLimitError } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { PROFILE_AVATARS } from "@/lib/profile-avatars";

const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const PHOTO_MIME_TYPE_SET = new Set<string>(PHOTO_MIME_TYPES);

export type ProfilePhotoActionState = {
  error?: string;
  success?: boolean;
};

function matchesSignature(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (type === "image/png") {
    return bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  }
  return (
    type === "image/webp" &&
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  );
}

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
  const photo = formData.get("photo");

  let image: string;
  if (avatar) {
    image = avatar.src;
  } else if (photo instanceof File && photo.size > 0) {
    if (photo.size > MAX_IMAGE_BYTES) {
      return { error: `Photo must be ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB or smaller.` };
    }
    if (!PHOTO_MIME_TYPE_SET.has(photo.type)) {
      return { error: "Upload a JPG, PNG, or WebP photo." };
    }

    const bytes = new Uint8Array(await photo.arrayBuffer());
    if (!matchesSignature(bytes, photo.type)) {
      return { error: "That file is not a valid JPG, PNG, or WebP image." };
    }
    image = `data:${photo.type};base64,${Buffer.from(bytes).toString("base64")}`;
  } else {
    return { error: "Choose an avatar or upload a photo." };
  }

  await prisma.user.update({ where: { id: userId }, data: { image } });
  await logActivity({ userId, action: "PROFILE_PHOTO_CHANGED", label: "Changed profile photo" });
  revalidatePath("/profile");
  // Invalidate the cached header avatar (see lib/profile-user.ts).
  updateTag("profiles");

  return { success: true };
}
