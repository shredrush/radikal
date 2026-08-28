import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers()),
}));

import { rateLimit, rateLimitError } from "./rate-limit";

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("allows requests up to the limit in a fixed window", () => {
    const key = `rl:window:${Math.random()}`;
    const first = rateLimit(key, 2, 60_000);
    expect(first.success).toBe(true);
    expect(first.remaining).toBe(1);

    const second = rateLimit(key, 2, 60_000);
    expect(second.success).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it("blocks requests past the limit with a retry delay", () => {
    const key = `rl:block:${Math.random()}`;
    rateLimit(key, 2, 60_000);
    rateLimit(key, 2, 60_000);

    const third = rateLimit(key, 2, 60_000);
    expect(third.success).toBe(false);
    expect(third.remaining).toBe(0);
    expect(third.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it("resets the counter once the window elapses", () => {
    vi.useFakeTimers();
    const key = `rl:reset:${Math.random()}`;

    const first = rateLimit(key, 1, 1_000);
    expect(first.success).toBe(true);
    expect(first.remaining).toBe(0);

    vi.advanceTimersByTime(1_001);

    const next = rateLimit(key, 1, 1_000);
    expect(next.success).toBe(true);
    expect(next.remaining).toBe(0);
  });

  it("keeps buckets isolated per key", () => {
    const a = `rl:a:${Math.random()}`;
    const b = `rl:b:${Math.random()}`;

    rateLimit(a, 1, 60_000);
    const onB = rateLimit(b, 1, 60_000);
    expect(onB.success).toBe(true);
  });
});

describe("rateLimitError", () => {
  it("formats a sub-minute retry delay in seconds", () => {
    const result = rateLimitError({
      success: false,
      limit: 10,
      remaining: 0,
      resetAt: 0,
      retryAfterSeconds: 7,
    });
    expect(result).toBe("Too many attempts. Try again in 7 seconds.");
  });

  it("formats a retry delay over a minute in minutes", () => {
    const result = rateLimitError({
      success: false,
      limit: 10,
      remaining: 0,
      resetAt: 0,
      retryAfterSeconds: 120,
    });
    expect(result).toBe("Too many attempts. Try again in 2 minutes.");
  });

  it("uses singular wording for one second", () => {
    const result = rateLimitError({
      success: false,
      limit: 10,
      remaining: 0,
      resetAt: 0,
      retryAfterSeconds: 1,
    });
    expect(result).toBe("Too many attempts. Try again in 1 second.");
  });
});
