import { describe, expect, it } from "vitest";

import { isValidEmailSender, normalizeEmailSender } from "@/lib/email-sender";

describe("email sender configuration", () => {
  it("removes accidental outer quotes from environment values", () => {
    expect(normalizeEmailSender('"Radikal <trips@radikal.in>"')).toBe(
      "Radikal <trips@radikal.in>",
    );
  });

  it("accepts Resend sender formats and rejects malformed values", () => {
    expect(isValidEmailSender("trips@radikal.in")).toBe(true);
    expect(isValidEmailSender("Radikal <trips@radikal.in>")).toBe(true);
    expect(isValidEmailSender("Radikal <trips@radikal.in")).toBe(false);
  });
});
