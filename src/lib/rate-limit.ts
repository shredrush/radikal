import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import crypto from "node:crypto";
import { isIP } from "node:net";

/**
 * Shared Upstash Redis rate limiter. Keys are namespaced by the SDK prefix and
 * callers supply a scoped identifier (for example, action plus client IP).
 * IP detection uses only an explicitly configured, trusted proxy header.
 */

export type RateLimitResult = {
  success: boolean;
  /** Total allowed requests in the current window. */
  limit: number;
  /** Requests remaining in the current window (0 when blocked). */
  remaining: number;
  /** Unix ms timestamp when the window resets. */
  resetAt: number;
  /** Seconds the caller should wait before retrying (0 when allowed). */
  retryAfterSeconds: number;
};

const RATE_LIMIT_PREFIX = "radikal:rate-limit";
const RATE_LIMIT_TIMEOUT_MS = 1_000;
const RATE_LIMIT_FAILURE_RETRY_SECONDS = 5;
const limiters = new Map<string, Ratelimit>();
let lastFailureLogAt = 0;

export type RateLimitOptions = {
  /** Deny sensitive operations if the shared limiter is unavailable. */
  failureMode?: "allow" | "deny";
};

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    throw new Error("Upstash Redis is not configured.");
  }
  return new Redis({ url, token });
}

function getLimiter(limit: number, windowMs: number) {
  const configKey = `${limit}:${windowMs}`;
  let limiter = limiters.get(configKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: getRedis(),
      // Sliding windows prevent a client from doubling its effective quota at
      // a fixed-window boundary while retaining low Redis overhead.
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      prefix: RATE_LIMIT_PREFIX,
      timeout: RATE_LIMIT_TIMEOUT_MS,
      analytics: false,
      // Redis is authoritative. Do not retain attacker-controlled blocked keys
      // in long-lived server processes.
      ephemeralCache: false,
    });
    limiters.set(configKey, limiter);
  }
  return limiter;
}

function getRateLimitSecret() {
  const secret =
    process.env.RATE_LIMIT_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("Rate limiting requires RATE_LIMIT_SECRET, AUTH_SECRET, or NEXTAUTH_SECRET.");
  }
  return secret;
}

function opaqueKey(key: string) {
  return `v1:${crypto.createHmac("sha256", getRateLimitSecret()).update(key).digest("base64url")}`;
}

function reportLimiterFailure() {
  const now = Date.now();
  if (now - lastFailureLogAt >= 60_000) {
    lastFailureLogAt = now;
    console.error("[rate-limit] Upstash Redis is unavailable");
  }
}

/**
 * Record a request for `key` and decide whether it is allowed.
 *
 * @param key      Unique bucket key (e.g. `login:192.0.2.1` or `signup:userId`).
 * @param limit    Maximum requests allowed per window.
 * @param windowMs Window length in milliseconds.
 * @param options  Outage policy; sensitive operations should fail closed.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  { failureMode = "allow" }: RateLimitOptions = {},
): Promise<RateLimitResult> {
  const now = Date.now();
  try {
    const result = await getLimiter(limit, windowMs).limit(opaqueKey(key));
    // The SDK's timeout response is allowed by default. Deny it explicitly so
    // an unavailable Redis service cannot disable abuse protection.
    if (result.reason !== "timeout") {
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        resetAt: result.reset,
        retryAfterSeconds: result.success
          ? 0
          : Math.max(1, Math.ceil((result.reset - now) / 1000)),
      };
    }
  } catch {
    // Do not log caller keys because they may include user identifiers.
  }

  reportLimiterFailure();
  if (failureMode === "allow") {
    return {
      success: true,
      limit,
      remaining: limit,
      resetAt: now + RATE_LIMIT_FAILURE_RETRY_SECONDS * 1000,
      retryAfterSeconds: 0,
    };
  }

  const resetAt = now + RATE_LIMIT_FAILURE_RETRY_SECONDS * 1000;
  return {
    success: false,
    limit,
    remaining: 0,
    resetAt,
    retryAfterSeconds: RATE_LIMIT_FAILURE_RETRY_SECONDS,
  };
}

/**
 * Client IP for a server action/route from a configured proxy-owned header.
 * Falls back to a shared bucket when the header is absent or invalid.
 */
export async function getClientIp(): Promise<string> {
  try {
    const headerList = await headers();
    const trustedHeader = process.env.TRUSTED_PROXY_IP_HEADER?.trim().toLowerCase();
    if (!trustedHeader) return "unknown";

    const value = headerList.get(trustedHeader)?.trim();
    if (!value || value.length > 45 || value.includes(",") || !isIP(value)) return "unknown";
    return value;
  } catch {
    return "unknown";
  }
}

/** Format a blocked result as a user-facing error string. */
export function rateLimitError(result: RateLimitResult): string {
  const seconds = result.retryAfterSeconds;
  if (seconds < 60) {
    return `Too many attempts. Try again in ${seconds} second${seconds === 1 ? "" : "s"}.`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
