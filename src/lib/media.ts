import { createClient } from "@supabase/supabase-js";

import {
  IMAGE_EXT,
  IMAGE_MIME,
  MAX_IMAGE_BYTES,
  MAX_PROFILE_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  VIDEO_EXT,
  VIDEO_MIME,
  type MediaKind,
} from "@/lib/media-constants";
import { isSafeHttpUrl } from "@/lib/sanitize";

export type MediaBucket = "guide-media" | "profile-media" | "trip-media";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Lazy singleton. The client is only created when an upload/delete/verify is
// actually requested, so pages that never touch storage don't pay the setup
// cost and misconfiguration surfaces as a clear error instead of a crash.
let storageClient: ReturnType<typeof createClient>["storage"] | null = null;

function storage() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured before uploading media.",
    );
  }
  if (!storageClient) {
    storageClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }).storage;
  }
  return storageClient;
}

/** Public (CDN) URL for an object in a public bucket. */
export function publicMediaUrl(bucket: MediaBucket, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Make sure the bucket and the parent folder for a path exist so a subsequent
 * signed upload is accepted. Supabase Storage does not auto-create nested
 * folders and `createSignedUploadUrl` fails with "resource does not exist" when
 * the parent is missing (which is the case for every brand-new guide/user).
 * Bucket creation is idempotent and folder creation simply uploads an empty
 * placeholder object. Fails closed: misconfiguration surfaces as a clear error.
 */
async function ensureMediaParent(bucket: MediaBucket, path: string): Promise<void> {
  const bucketInfo = await storage().getBucket(bucket);
  if (bucketInfo.error) {
    if (!String(bucketInfo.error.message).toLowerCase().includes("not found")) {
      throw new Error(`Could not access storage bucket “${bucket}”: ${bucketInfo.error.message}`);
    }
    const created = await storage().createBucket(bucket, { public: true });
    if (created.error && !String(created.error.message).toLowerCase().includes("already exists")) {
      throw new Error(`Could not create storage bucket “${bucket}”: ${created.error.message}`);
    }
  }

  const lastSlash = path.lastIndexOf("/");
  if (lastSlash === -1) return;
  const parent = path.slice(0, lastSlash);

  const listed = await storage().from(bucket).list(parent, { limit: 1 });
  if (!listed.error) return; // parent already exists (or is empty but writable) — good enough.

  const { error } = await storage().from(bucket).upload(`${parent}/.keep`, new Uint8Array(0), {
    contentType: "application/octet-stream",
    upsert: true,
  });
  if (error && !String(error.message).toLowerCase().includes("already exists")) {
    throw new Error(`Could not prepare storage folder “${parent}”: ${error.message}`);
  }
}

/**
 * Reverse of `publicMediaUrl`: extract `{ bucket, path }` from a stored URL.
 * Returns null for non-Supabase URLs (e.g. legacy Unsplash or site-relative
 * images), which callers should simply leave untouched.
 */
export function parseStoredUrl(
  url: string,
): { bucket: MediaBucket; path: string } | null {
  const marker = "/storage/v1/object/public/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const rest = url.slice(index + marker.length);
  const slash = rest.indexOf("/");
  if (slash === -1) return null;
  const bucket = rest.slice(0, slash);
  const path = rest.slice(slash + 1);
  if (bucket !== "guide-media" && bucket !== "profile-media" && bucket !== "trip-media") return null;
  return { bucket, path };
}

export function extFromContentType(mime: string): string {
  return IMAGE_EXT[mime] ?? VIDEO_EXT[mime] ?? "bin";
}

/**
 * The server owns object paths — the browser never proposes one. Paths are
 * content-addressed (random UUID) so they are immutable and cacheable forever.
 */
export function buildMediaPath(
  bucket: MediaBucket,
  folderKey: string,
  kind: MediaKind,
  ext: string,
): string {
  return `${folderKey}/${kind}/${crypto.randomUUID()}.${ext}`;
}

/** Issue a short-lived signed upload URL the browser can POST the file to. */
export async function issueSignedUploadUrl(
  bucket: MediaBucket,
  path: string,
): Promise<{ token: string; publicUrl: string }> {
  await ensureMediaParent(bucket, path);
  const { data, error } = await storage()
    .from(bucket)
    .createSignedUploadUrl(path, { upsert: false });
  if (error) {
    throw new Error(`Could not prepare upload: ${error.message}`);
  }
  return { token: data.token, publicUrl: publicMediaUrl(bucket, path) };
}

/**
 * Verify a previously uploaded object exists and return its stored metadata.
 * Used by the save actions as the authoritative size/type gate — the values
 * claimed by the browser during upload are never trusted.
 */
export async function verifyObject(
  bucket: MediaBucket,
  path: string,
): Promise<{ size: number; contentType: string }> {
  const { data, error } = await storage().from(bucket).info(path);
  if (error) {
    throw new Error("Uploaded file could not be verified.");
  }
  // `info()` returns a FileObjectV2 with `size`/`contentType` at the top level;
  // `metadata` is the separate custom-metadata map and is usually empty for
  // signed uploads. Fall back to it only where the SDK used to nest size there.
  const size = Number(data?.size ?? data?.metadata?.size ?? 0);
  const contentType = String(
    data?.contentType ?? data?.metadata?.mimetype ?? data?.metadata?.contentType ?? "",
  );
  return { size, contentType };
}

/** List the top-level folder names of a bucket. */
export async function listFolders(bucket: MediaBucket): Promise<string[]> {
  const out: string[] = [];
  const limit = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await storage()
      .from(bucket)
      .list("", {
        limit,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
    if (error) {
      throw new Error(`Could not list media folders: ${error.message}`);
    }
    for (const entry of data) {
      if (!entry.metadata) out.push(entry.name);
    }
    if (data.length < limit) break;
    offset += limit;
  }

  return out;
}

export type StoredObject = {
  name: string;
  createdAt: Date | null;
};

/**
 * Paginated listing of one folder. Used by the nightly orphan sweep. Returns
 * only files (folders are represented by entries without `metadata`).
 */
export async function listObjects(
  bucket: MediaBucket,
  prefix: string,
): Promise<StoredObject[]> {
  const out: StoredObject[] = [];
  const limit = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await storage()
      .from(bucket)
      .list(prefix, {
        limit,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
    if (error) {
      throw new Error(`Could not list media: ${error.message}`);
    }
    for (const entry of data) {
      if (entry.metadata) {
        out.push({
          name: entry.name,
          createdAt: entry.created_at ? new Date(entry.created_at) : null,
        });
      }
    }
    if (data.length < limit) break;
    offset += limit;
  }

  return out;
}

/** Best-effort bulk delete. Callers should never throw on cleanup failures. */
export async function removeObjects(bucket: MediaBucket, paths: string[]) {
  const cleaned = [...new Set(paths.filter(Boolean))];
  if (cleaned.length === 0) return;
  const { error } = await storage().from(bucket).remove(cleaned);
  if (error) {
    throw new Error(`Could not remove media: ${error.message}`);
  }
}

/**
 * Delete every Supabase-hosted object referenced by the given stored URLs.
 * Legacy URLs (Unsplash, site-relative paths) are skipped. Never throws —
 * cleanup is best-effort and the nightly cron reclaims stragglers.
 */
export async function removeStoredMedia(urls: string[]) {
  const byBucket = new Map<MediaBucket, string[]>();
  for (const url of urls) {
    const parsed = parseStoredUrl(url);
    if (parsed) {
      const list = byBucket.get(parsed.bucket) ?? [];
      list.push(parsed.path);
      byBucket.set(parsed.bucket, list);
    }
  }
  await Promise.allSettled(
    [...byBucket.entries()].map(([bucket, paths]) => removeObjects(bucket, paths)),
  );
}

/**
 * Authoritative, parallel validation of a submitted media list before it is
 * committed. Re-verifies the stored object's actual size and content-type
 * (the values the browser claimed at upload time are never trusted).
 * Non-storage URLs are skipped for images (legacy Unsplash/site-relative
 * entries) but rejected for videos, which can only ever originate from the
 * uploader.
 */
export async function assertValidStoredMedia(kind: MediaKind, urls: string[]) {
  const errors = await Promise.all(
    urls.map(async (url): Promise<string | null> => {
      const parsed = parseStoredUrl(url);
      if (!parsed) {
        return kind === "videos" ? "Videos must be uploaded through Radikal." : null;
      }

      const maxBytes = kind === "images" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
      const allowed = kind === "images" ? IMAGE_MIME : VIDEO_MIME;

      let meta: { size: number; contentType: string };
      try {
        meta = await verifyObject(parsed.bucket, parsed.path);
      } catch {
        return "Uploaded file could not be verified.";
      }

      if (meta.size <= 0 || meta.size > maxBytes) {
        return `Uploaded file exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB limit.`;
      }
      if (!allowed.has(meta.contentType)) {
        return kind === "images"
          ? "Uploaded file is not a supported image."
          : "Uploaded file is not a supported video.";
      }
      return null;
    }),
  );

  const firstError = errors.find((error) => error !== null);
  if (firstError) throw new Error(firstError);
}

/** Validate a profile upload before its public URL is persisted on a user. */
export async function assertValidStoredProfileImage(url: string, userId: string) {
  const parsed = parseStoredUrl(url);
  if (
    !parsed ||
    parsed.bucket !== "profile-media" ||
    !parsed.path.startsWith(`${userId}/images/`)
  ) {
    throw new Error("Profile photos must be uploaded through Radikal.");
  }

  let meta: { size: number; contentType: string };
  try {
    meta = await verifyObject(parsed.bucket, parsed.path);
  } catch {
    throw new Error("Uploaded profile photo could not be verified.");
  }

  if (meta.size <= 0 || meta.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error(`Profile photo exceeds the ${Math.round(MAX_PROFILE_IMAGE_BYTES / 1024 / 1024)} MB limit.`);
  }
  if (!IMAGE_MIME.has(meta.contentType)) {
    throw new Error("Uploaded profile photo is not a supported image.");
  }
}

/**
 * Parse guide profile media (photos/videos) from form data. Accepts a single
 * value or multiple hidden inputs from the MediaUploader, each possibly a
 * newline-separated legacy list. Count caps are enforced by the callers'
 * validation, never by silent truncation.
 */
export function parseGuideMediaUrls(
  formData: FormData,
  kind: MediaKind,
): string[] {
  const field = kind === "images" ? "photos" : "videos";
  return formData
    .getAll(field)
    .flatMap((value) => value.toString().split(/\r?\n/))
    .map((raw) => {
      const trimmed = raw.trim();
      return trimmed && isSafeHttpUrl(trimmed) ? trimmed : null;
    })
    .filter((value): value is string => value !== null);
}
