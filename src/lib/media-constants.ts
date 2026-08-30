// Client-safe media constants. No Supabase imports here — this module is
// imported by browser components (MediaUploader) as well as server code.

export const MEDIA_LIMITS = {
  guide: { images: 5, videos: 5 },
  trip: { images: 10, videos: 5 },
} as const;

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 42 * 1024 * 1024;

export const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
// `video/quicktime` is what iPhones report for MP4 files (and mobile browsers
// for `.mp4` picks). It is a valid MP4 container that plays in browsers and the
// `<video>` element, so it is accepted here. `VIDEO_EXT` maps it to `.mp4`.
export const VIDEO_MIME = new Set(["video/mp4", "video/webm", "video/quicktime"]);

export const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export const VIDEO_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mp4",
};

// Immutable cache header: media names are content-addressed (UUID), so a
// changed file is a new path and old responses can be cached forever.
export const CACHE_CONTROL = "31536000";

export type MediaKind = "images" | "videos";

export type MediaEntity = keyof typeof MEDIA_LIMITS;
