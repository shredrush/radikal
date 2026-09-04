import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createReferralAttribution,
  normalizeReferralCode,
  parseReferralAttribution,
} from "./referrals";

const originalAuthSecret = process.env.AUTH_SECRET;

afterEach(() => {
  vi.useRealTimers();
  if (originalAuthSecret === undefined) {
    delete process.env.AUTH_SECRET;
  } else {
    process.env.AUTH_SECRET = originalAuthSecret;
  }
});

describe("referral codes", () => {
  it("normalizes four-character codes without regard to case", () => {
    expect(normalizeReferralCode(" a7k9 ")).toBe("A7K9");
    expect(normalizeReferralCode("ABC")).toBeNull();
    expect(normalizeReferralCode("A-79")).toBeNull();
  });
});

describe("referral attribution", () => {
  it("accepts an untampered, unexpired signed attribution", () => {
    process.env.AUTH_SECRET = "test-referral-secret";
    const token = createReferralAttribution("guide-id", "A7K9");

    expect(token).not.toBeNull();
    expect(parseReferralAttribution(token ?? undefined)).toMatchObject({
      guideId: "guide-id",
      code: "A7K9",
    });
  });

  it("rejects a tampered attribution", () => {
    process.env.AUTH_SECRET = "test-referral-secret";
    const token = createReferralAttribution("guide-id", "A7K9");

    expect(parseReferralAttribution(`${token}x`)).toBeNull();
  });

  it("rejects expired attributions", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    process.env.AUTH_SECRET = "test-referral-secret";
    const token = createReferralAttribution("guide-id", "A7K9");
    vi.advanceTimersByTime(31 * 24 * 60 * 60 * 1000);

    expect(parseReferralAttribution(token ?? undefined)).toBeNull();
  });
});
