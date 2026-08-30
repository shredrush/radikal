"use server";

import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/authz";
import { requireGuideAction } from "@/lib/guide-board";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, rateLimitError } from "@/lib/rate-limit";
import {
  IMAGE_EXT,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  VIDEO_EXT,
} from "@/lib/media-constants";
import {
  buildMediaPath,
  extFromContentType,
  issueSignedUploadUrl,
  removeObjects,
  type MediaBucket,
} from "@/lib/media";

export type CreateMediaUploadInput = {
  entity: "guide" | "trip";
  folderKey: string;
  kind: "images" | "videos";
  contentType: string;
  size: number;
};

// Folder keys become storage path segments and are checked for ownership, so
// keep them to safe, simple tokens.
const FOLDER_KEY_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Resolve who may upload into `folderKey` and return their user id.
 * - Guide media: a signed-in user may only upload into their own folder
 *   (guide application and the guide's own profile); staff with
 *   `guides.manage` may upload into any guide folder.
 * - Trip media: the caller must be the guide who owns the target trip, a
 *   guide uploading into their own folder (uncommitted new-trip media), or
 *   staff with `trips.manage`.
 */
async function authorizeFolder(
  entity: "guide" | "trip",
  folderKey: string,
): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be signed in to upload media.");
  }

  if (!FOLDER_KEY_PATTERN.test(folderKey)) {
    throw new Error("Invalid upload folder.");
  }

  if (entity === "guide") {
    if (session.user.id === folderKey) return session.user.id;
    await requirePermission("guides.manage", "/login?callbackUrl=/admin/guides");
    return session.user.id;
  }

  const self = session.user.id;
  if (folderKey === self) return self;

  try {
    const { guide, userId } = await requireGuideAction();
    if (folderKey === userId || folderKey === guide.id) return userId;
    const trip = await prisma.trip.findUnique({
      where: { id: folderKey },
      select: { guideId: true },
    });
    if (trip && trip.guideId === guide.id) return userId;
  } catch {
    // Not a guide — fall through to the staff check.
  }

  await requirePermission("trips.manage", "/login?callbackUrl=/admin/trips");
  return self;
}

/**
 * Issue a signed upload URL for one file. The browser POSTs the file straight
 * to Supabase Storage — the request never goes through a Vercel function, so
 * the 1MB server-action body limit does not apply. The server owns the object
 * path (content-addressed UUID), so the client can never target arbitrary keys.
 */
export async function createMediaUploadAction(input: CreateMediaUploadInput): Promise<{
  token: string;
  publicUrl: string;
  path: string;
}> {
  await authorizeFolder(input.entity, input.folderKey);

  const ip = await getClientIp();
  const limited = rateLimit(`media-upload:${ip}`, 100, 60 * 60_000);
  if (!limited.success) {
    throw new Error(rateLimitError(limited));
  }

  const allowedTypes = input.kind === "images" ? IMAGE_EXT : VIDEO_EXT;
  if (!allowedTypes[input.contentType]) {
    throw new Error(
      input.kind === "images"
        ? "Upload a JPG, PNG, WebP, or AVIF image."
        : "Upload an MP4, WebM, or MOV video.",
    );
  }

  const maxBytes = input.kind === "images" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (input.size <= 0 || input.size > maxBytes) {
    throw new Error(`File too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`);
  }

  const bucket: MediaBucket = input.entity === "guide" ? "guide-media" : "trip-media";
  const path = buildMediaPath(
    bucket,
    input.folderKey,
    input.kind,
    extFromContentType(input.contentType),
  );
  const { token, publicUrl } = await issueSignedUploadUrl(bucket, path);

  return { token, publicUrl, path };
}

/**
 * Delete objects that were uploaded but never committed. Only paths under the
 * caller's own `folderKey` are eligible, so a user cannot remove another
 * user's media. Uncommitted objects are also swept by the nightly cron, so a
 * failed deletion here is not a leak.
 */
export async function deleteMediaAction(input: {
  entity: "guide" | "trip";
  folderKey: string;
  paths: string[];
}): Promise<void> {
  await authorizeFolder(input.entity, input.folderKey);

  const bucket: MediaBucket = input.entity === "guide" ? "guide-media" : "trip-media";
  const scoped = [...new Set(input.paths)].filter((path) =>
    path.startsWith(`${input.folderKey}/`),
  );
  if (scoped.length === 0) return;

  try {
    await removeObjects(bucket, scoped);
  } catch {
    // Cleanup is best-effort; the cron sweep reclaims stragglers.
  }
}
