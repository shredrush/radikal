import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { headerListMock, limitMock, limiterConfigMock, slidingWindowMock } = vi.hoisted(() => ({
  headerListMock: vi.fn(() => new Headers()),
  limitMock: vi.fn(),
  limiterConfigMock: vi.fn(),
  slidingWindowMock: vi.fn(() => ({})),
}));

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(headerListMock()),
}));

vi.mock("server-only", () => ({}));

vi.mock("@upstash/redis", () => ({
  Redis: class {},
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow = slidingWindowMock;
    constructor(config: unknown) {
      limiterConfigMock(config);
    }
    limit = limitMock;
  },
}));

import { getClientIp, rateLimit, rateLimitError } from "./rate-limit";

beforeEach(() => {
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  process.env.AUTH_SECRET = "test-auth-secret";
  delete process.env.TRUSTED_PROXY_IP_HEADER;
  headerListMock.mockReturnValue(new Headers());
  limitMock.mockReset();
  limiterConfigMock.mockClear();
  limitMock.mockResolvedValue({
    success: true,
    limit: 2,
    remaining: 1,
    reset: Date.now() + 60_000,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("maps an allowed Upstash response", async () => {
    const result = await rateLimit("rl:allowed", 2, 60_000);

    expect(result).toMatchObject({
      success: true,
      limit: 2,
      remaining: 1,
      retryAfterSeconds: 0,
    });
    expect(limitMock).toHaveBeenCalledWith(expect.stringMatching(/^v1:[A-Za-z0-9_-]{43}$/));
    expect(limitMock).not.toHaveBeenCalledWith("rl:allowed");
  });

  it("maps a blocked Upstash response with a retry delay", async () => {
    limitMock.mockResolvedValueOnce({
      success: false,
      limit: 2,
      remaining: 0,
      reset: Date.now() + 5_000,
    });

    const result = await rateLimit("rl:blocked", 2, 60_000);

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it("allows non-sensitive requests when Upstash times out", async () => {
    limitMock.mockResolvedValueOnce({
      success: true,
      limit: 2,
      remaining: 1,
      reset: Date.now() + 60_000,
      reason: "timeout",
    });

    const result = await rateLimit("rl:timeout", 2, 60_000);

    expect(result).toMatchObject({ success: true, remaining: 2, retryAfterSeconds: 0 });
  });

  it("denies sensitive requests briefly when the Upstash client throws", async () => {
    limitMock.mockRejectedValueOnce(new Error("network unavailable"));

    const result = await rateLimit("rl:error", 2, 60_000, { failureMode: "deny" });

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSeconds).toBe(5);
  });

  it("keeps rate-limit keys isolated", async () => {
    await rateLimit("rl:a", 1, 60_000);
    await rateLimit("rl:b", 1, 60_000);

    const [firstKey] = limitMock.mock.calls[0] ?? [];
    const [secondKey] = limitMock.mock.calls[1] ?? [];
    expect(firstKey).not.toBe(secondKey);
  });

  it("configures a sliding window for stronger boundary protection", async () => {
    await rateLimit("rl:sliding-window", 7, 15_000);

    expect(slidingWindowMock).toHaveBeenCalledWith(7, "15000 ms");
    expect(limiterConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({ ephemeralCache: false }),
    );
  });
});

describe("getClientIp", () => {
  it("uses only the explicitly configured trusted proxy header", async () => {
    process.env.TRUSTED_PROXY_IP_HEADER = "x-vercel-forwarded-for";
    headerListMock.mockReturnValue(
      new Headers({
        "x-forwarded-for": "198.51.100.1",
        "x-vercel-forwarded-for": "203.0.113.10",
      }),
    );

    await expect(getClientIp()).resolves.toBe("203.0.113.10");
  });

  it("uses a shared bucket when no trusted proxy header is configured", async () => {
    headerListMock.mockReturnValue(new Headers({ "x-forwarded-for": "198.51.100.1" }));

    await expect(getClientIp()).resolves.toBe("unknown");
  });

  it("rejects multi-hop and non-IP identifiers", async () => {
    process.env.TRUSTED_PROXY_IP_HEADER = "x-vercel-forwarded-for";
    headerListMock.mockReturnValue(
      new Headers({ "x-vercel-forwarded-for": "203.0.113.10, 198.51.100.1" }),
    );

    await expect(getClientIp()).resolves.toBe("unknown");

    headerListMock.mockReturnValue(new Headers({ "x-vercel-forwarded-for": "attacker-controlled" }));

    await expect(getClientIp()).resolves.toBe("unknown");
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
