import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listFolders: vi.fn(),
  listObjects: vi.fn(),
  removeObjects: vi.fn(),
  tripFindMany: vi.fn(),
  guideFindMany: vi.fn(),
  applicationFindMany: vi.fn(),
  draftFindMany: vi.fn(),
  userFindMany: vi.fn(),
  travelStyleFindMany: vi.fn(),
  changeFindMany: vi.fn(),
  previewFindMany: vi.fn(),
}));

vi.mock("@/lib/media", () => ({
  listFolders: mocks.listFolders,
  listObjects: mocks.listObjects,
  parseStoredUrl: (url: string) => {
    const marker = "/storage/v1/object/public/";
    const [, rest] = url.split(marker);
    const [bucket, ...path] = rest.split("/");
    return { bucket, path: path.join("/") };
  },
  removeObjects: mocks.removeObjects,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trip: { findMany: mocks.tripFindMany },
    guide: { findMany: mocks.guideFindMany },
    guideApplication: { findMany: mocks.applicationFindMany },
    tripDraft: { findMany: mocks.draftFindMany },
    user: { findMany: mocks.userFindMany },
    travelStyle: { findMany: mocks.travelStyleFindMany },
    tripChangeRequest: { findMany: mocks.changeFindMany },
    tripPreview: { findMany: mocks.previewFindMany },
  },
}));

import { sweepOrphanMedia } from "@/lib/media-cleanup";

describe("sweepOrphanMedia", () => {
  it("retains photos referenced by travel styles", async () => {
    const stylePhoto = "https://project.supabase.co/storage/v1/object/public/trip-media/style-1/images/photo.jpg";
    const oldDate = new Date("2020-01-01T00:00:00.000Z");

    mocks.tripFindMany.mockResolvedValue([]);
    mocks.guideFindMany.mockResolvedValue([]);
    mocks.applicationFindMany.mockResolvedValue([]);
    mocks.draftFindMany.mockResolvedValue([]);
    mocks.userFindMany.mockResolvedValue([]);
    mocks.travelStyleFindMany.mockResolvedValue([{ image: stylePhoto }]);
    mocks.changeFindMany.mockResolvedValue([]);
    mocks.previewFindMany.mockResolvedValue([]);
    mocks.listFolders.mockResolvedValue(["style-1"]);
    mocks.listObjects.mockImplementation(async (bucket: string, prefix: string) =>
      bucket === "trip-media" && prefix === "style-1/images"
        ? [{ name: "photo.jpg", createdAt: oldDate }]
        : [],
    );

    await sweepOrphanMedia();

    expect(mocks.removeObjects).not.toHaveBeenCalled();
  });
});
