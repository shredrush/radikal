import { describe, expect, it } from "vitest";

import {
  createCustomTripSchema,
  customTripMessageSchema,
} from "./custom-trip";

const validRequest = {
  groupType: "PRIVATE",
  sports: ["TREK"],
  startDate: "2026-09-01",
  endDate: "2026-09-02",
  location: "Manali",
  participantCount: 2,
};

describe("custom trip validation", () => {
  it("rejects text above the storage limits instead of silently truncating it", () => {
    expect(
      createCustomTripSchema.safeParse({ ...validRequest, location: "a".repeat(101) }).success,
    ).toBe(false);
    expect(customTripMessageSchema.safeParse({ body: "a".repeat(2001) }).success).toBe(false);
  });

  it("accepts only ISO-8601 calendar date strings", () => {
    expect(createCustomTripSchema.safeParse(validRequest).success).toBe(true);
    expect(
      createCustomTripSchema.safeParse({ ...validRequest, startDate: "09/01/2026" }).success,
    ).toBe(false);
    expect(
      createCustomTripSchema.safeParse({ ...validRequest, startDate: "2026-02-30" }).success,
    ).toBe(false);
  });
});
