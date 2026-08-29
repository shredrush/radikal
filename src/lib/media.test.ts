import { describe, expect, it } from "vitest";

import { MEDIA_LIMITS } from "@/lib/media-constants";
import { parseMediaList, validateTripFields } from "@/lib/trip-fields";
import {
  buildMediaPath,
  extFromContentType,
  parseStoredUrl,
} from "@/lib/media";

describe("parseMediaList", () => {
  it("accepts both a newline textarea string and hidden-input array form", () => {
    const textarea = "https://a.example/1.jpg\nhttps://a.example/2.jpg";
    const array = ["https://a.example/1.jpg", "https://a.example/2.jpg"];
    expect(parseMediaList([textarea])).toEqual([
      "https://a.example/1.jpg",
      "https://a.example/2.jpg",
    ]);
    expect(parseMediaList(array)).toEqual([
      "https://a.example/1.jpg",
      "https://a.example/2.jpg",
    ]);
  });

  it("returns every entry without truncating — caps are enforced by validation", () => {
    const values = Array.from(
      { length: 12 },
      (_, index) => `https://a.example/${index}.jpg`,
    );
    expect(parseMediaList(values).length).toBe(12);
  });

  it("dedupes entries and drops unsafe sources", () => {
    const values = [
      "https://a.example/1.jpg",
      "https://a.example/1.jpg",
      "javascript:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      "/activities/slug/cover.jpg",
    ];
    expect(parseMediaList(values)).toEqual([
      "https://a.example/1.jpg",
      "/activities/slug/cover.jpg",
    ]);
  });
});

describe("validateTripFields media caps", () => {
  function baseFields(overrides: { images?: string[]; videos?: string[] }) {
    return {
      title: "A trip",
      slug: "a-trip",
      location: "Himachal",
      description: "Description",
      type: "TREK",
      priceInRupees: 1000,
      durationDays: 3,
      maxGroupSize: 8,
      guideId: "",
      categories: [],
      images: overrides.images ?? [],
      videos: overrides.videos ?? [],
      pickup: "",
      drop: "",
      inclusions: [],
      exclusions: [],
      highlights: [],
    };
  }

  it("rejects more than 10 photos", () => {
    const fields = baseFields({
      images: Array.from({ length: 11 }, (_, i) => `https://a.example/${i}.jpg`),
    });
    expect(() => validateTripFields(fields)).toThrow(/at most 10 photos/);
  });

  it("rejects more than 5 videos", () => {
    const fields = baseFields({
      videos: Array.from({ length: 6 }, (_, i) => `https://a.example/${i}.mp4`),
    });
    expect(() => validateTripFields(fields)).toThrow(/5 videos/);
  });

  it("accepts exactly the caps", () => {
    const fields = baseFields({
      images: Array.from({ length: MEDIA_LIMITS.trip.images }, (_, i) => `https://a.example/${i}.jpg`),
      videos: Array.from({ length: MEDIA_LIMITS.trip.videos }, (_, i) => `https://a.example/${i}.mp4`),
    });
    expect(() => validateTripFields(fields)).not.toThrow();
  });
});

describe("buildMediaPath", () => {
  it("produces a content-addressed path under the folder", () => {
    const path = buildMediaPath("trip-media", "pending", "videos", "mp4");
    expect(path).toMatch(/^pending\/videos\/[0-9a-f-]{36}\.mp4$/);
  });
});

describe("extFromContentType", () => {
  it("maps supported mime types to extensions", () => {
    expect(extFromContentType("image/jpeg")).toBe("jpg");
    expect(extFromContentType("image/webp")).toBe("webp");
    expect(extFromContentType("video/mp4")).toBe("mp4");
    expect(extFromContentType("video/webm")).toBe("webm");
  });

  it("falls back to bin for unknown types", () => {
    expect(extFromContentType("application/pdf")).toBe("bin");
  });
});

describe("parseStoredUrl", () => {
  it("extracts bucket and path from a public storage URL", () => {
    const url =
      "https://olqfpvfpvbpydqkaahxg.supabase.co/storage/v1/object/public/trip-media/pending/images/abc.jpg";
    expect(parseStoredUrl(url)).toEqual({
      bucket: "trip-media",
      path: "pending/images/abc.jpg",
    });
  });

  it("returns null for non-storage URLs", () => {
    expect(parseStoredUrl("https://images.unsplash.com/photo.jpg")).toBeNull();
    expect(parseStoredUrl("/activities/slug/cover.jpg")).toBeNull();
    expect(parseStoredUrl("data:image/png;base64,xxx")).toBeNull();
  });
});
