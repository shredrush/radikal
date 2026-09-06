import { describe, expect, it } from "vitest";

import { getPublicTripFilters, getPublicTripFilterWhere } from "@/lib/public-trip-catalog";

describe("public trip catalog filters", () => {
  it("normalizes public URL filters and bounds the requested page", () => {
    const filters = getPublicTripFilters({
      page: "3",
      q: "  winter hiking  ",
      sport: ["winter", "trek", "invalid", "bike"],
      travelStyle: ["course", "invalid"],
      location: [" Manali ", ""],
      startDate: "2026-10-01",
      endDate: "2026-10-31",
    });

    expect(filters).toMatchObject({
      page: 3,
      query: "winter hiking",
      sports: ["SKI", "SNOWBOARD", "TREK"],
      travelStyles: ["COURSE"],
      locations: ["Manali"],
    });
    expect(filters.startDate).toEqual(new Date("2026-10-01T00:00:00.000Z"));
    expect(filters.endDate).toEqual(new Date("2026-10-31T00:00:00.000Z"));
  });

  it("builds date and semantic search predicates on the server", () => {
    const where = getPublicTripFilterWhere(
      getPublicTripFilters({ q: "ski beginner", startDate: "2026-12-01" }),
    );

    expect(where).toMatchObject({
      AND: expect.arrayContaining([
        { slots: { some: { deletedAt: null, date: { gte: new Date("2026-12-01T00:00:00.000Z") } } } },
      ]),
    });
    expect(JSON.stringify(where)).toContain('"SKI"');
    expect(JSON.stringify(where)).toContain('"BEGINNER_FRIENDLY"');
  });
});
