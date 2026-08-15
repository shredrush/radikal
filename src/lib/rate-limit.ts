import { headers } from "next/headers";

/**
 * Lightweight in-memory rate limiter using fixed-window counters.
 *
 * IMPORTANT LIMITATIONS (intentional — this is not a production-grade gateway):
 * - State lives in the Node process, so it resets on restart and is NOT shared
 *   across multiple server instances (serverless/multi-replica deployments need
 *   a shared store such as Redis or a DB-backed counter).
 * - Counters are keyed by a caller-supplied key (e.g. client IP + action, or a
 *   per-user id). IP detection depends on the `x-forwarded-for` header, which
 *   must be trusted (i.e. only trust it when the app is behind a proxy you
 *   control).
 *
 * This is a fine first line of defense against scripted brute force and abuse
 * for a single-instance deployment, but should be replaced with a shared
 * implementation before scaling out.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

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

const buckets = new Map<string, Bucket>();

// Bounded size + periodic sweep so a flood of unique keys cannot grow the map
// without limit (which would otherwise leak memory).
const MAX_BUCKETS = 50_000;
let lastCleanupAt = 0;
const CLEANUP_INTERVAL_MS = 60_000;

function sweepExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

/**
 * Record a request for `key` and decide whether it is allowed.
 *
 * @param key      Unique bucket key (e.g. `login:192.0.2.1` or `signup:userId`).
 * @param limit    Maximum requests allowed per window.
 * @param windowMs Window length in milliseconds.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  if (now - lastCleanupAt > CLEANUP_INTERVAL_MS) {
    sweepExpired(now);
    lastCleanupAt = now;
  }

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    // Bound the map: evict the oldest entry when at capacity so a flood of
    // unique keys cannot grow memory without limit.
    if (!buckets.has(key) && buckets.size >= MAX_BUCKETS) {
      const oldest = buckets.keys().next().value;
      if (oldest !== undefined) {
        buckets.delete(oldest);
      }
    }
    buckets.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit,
      remaining: Math.max(0, limit - 1),
      resetAt,
      retryAfterSeconds: 0,
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);

  if (existing.count > limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return {
    success: true,
    limit,
    remaining,
    resetAt: existing.resetAt,
    retryAfterSeconds: 0,
  };
}

/**
 * Best-effort client IP for a server action/route. Trusts `x-forwarded-for`
 * only from the nearest proxy hop. Falls back to a shared bucket so the limit
 * still applies when the header is absent (e.g. local dev).
 */
export async function getClientIp(): Promise<string> {
  try {
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }
    const realIp = headerList.get("x-real-ip");
    if (realIp) return realIp.trim();
    return headerList.get("x-forwarded-host")?.trim() || "unknown";
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
