// Client-safe media constants. No Supabase imports here — this module is
// imported by browser components (MediaUploader) as well as server code.

export const MEDIA_LIMITS = {
  guide: { images: 5, videos: 5 },
  trip: { images: 10, videos: 5 },
} as const;

export const MAX_VIDEO_SECONDS = 15;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 30 * 1024 * 1024;

export const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
export const VIDEO_MIME = new Set(["video/mp4", "video/webm"]);

export const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export const VIDEO_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};

// Immutable cache header: media names are content-addressed (UUID), so a
// changed file is a new path and old responses can be cached forever.
export const CACHE_CONTROL = "31536000";

export type MediaKind = "images" | "videos";

export type MediaEntity = keyof typeof MEDIA_LIMITS;
