import { PrismaPg } from "@prisma/adapter-pg";
import { unstable_rethrow } from "next/navigation";
import { PrismaClient } from "@/generated/prisma/client";
import { getDatabaseCaCert, getDatabaseConnectionLogInfo, getDatabaseUrl } from "@/lib/database-url";

// Reuse a single PrismaClient instance per process. Each instance opens its
// own connection pool, so creating one per request would exhaust connections
// on serverless (Vercel) deployments.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = getDatabaseUrl();
const connectionLogInfo = getDatabaseConnectionLogInfo();
console.log("[prisma] initializing database connection", connectionLogInfo);

const basePrisma =
  globalForPrisma.prisma ??
  (() => {
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not configured for Prisma.");
    }

    // Keep the per-instance pool small. On serverless (Vercel) every function
    // instance creates its own pool, so `max` is multiplied by the number of
    // concurrent instances. The Supabase *session* pooler caps total clients at
    // its `pool_size` (default 15) and fails with EMAXCONNSESSION once exceeded;
    // `max: 5` here means ~3 concurrent instances already blow that limit.
    // Keep it at 1 by default and raise the Supabase pooler `pool_size` for
    // headroom if production traffic needs more concurrency. Release idle
    // serverless connections promptly so brief traffic bursts do not retain
    // all session-pool clients.
    const parsedMax = Number.parseInt(process.env.DATABASE_POOL_MAX ?? "1", 10);
    const poolConfig = {
      max: Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : 1,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 10000,
    };

    // In production, authenticate the database server against the pinned CA
    // (see getDatabaseCaCert) instead of skipping verification. In
    // development the connection is plaintext (sslmode=disable), so no CA is
    // applied. If the CA is ever unavailable, the database-url default keeps
    // `no-verify` encryption and pages still degrade via `safeDb` instead of
    // crashing.
    const caCert = process.env.NODE_ENV === "production" ? getDatabaseCaCert() : undefined;
    const ssl = caCert ? { ca: caCert, rejectUnauthorized: true } : undefined;

    return new PrismaClient({
      adapter: new PrismaPg({
        connectionString: databaseUrl,
        ...(ssl ? { ssl } : {}),
        ...poolConfig,
      }),
    });
  })();

export const prisma = basePrisma;

// Next can load route bundles independently in production. Storing the client
// globally prevents each bundle from creating a separate session-pool client.
globalForPrisma.prisma = basePrisma;

const TRANSIENT_DATABASE_ERROR_CODES = new Set([
  "P1001", // Cannot reach database server.
  "P1002", // Database server connection timed out.
  "P1008", // Database operation timed out.
  "P1017", // Server closed the connection.
  "P2024", // Timed out waiting for a connection from the pool.
  "EAI_AGAIN",
  "ECONNABORTED",
  "ECONNREFUSED",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ETIMEDOUT",
]);

function getDatabaseErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const { code } = error as { code?: unknown };
  return typeof code === "string" ? code : null;
}

export function isTransientDatabaseError(error: unknown) {
  return TRANSIENT_DATABASE_ERROR_CODES.has(getDatabaseErrorCode(error) ?? "");
}

export function getDatabaseErrorStatus(error: unknown) {
  return isTransientDatabaseError(error) ? 503 : 500;
}

function logDatabaseError(label: string, error: unknown, outcome: "serving fallback" | "propagating") {
  const err = error as { message?: string };
  console.error(`[db] "${label}" query failed; ${outcome}`, {
    code: getDatabaseErrorCode(error),
    error: err.message ?? String(error),
    connection: getDatabaseConnectionLogInfo(),
  });
}

/**
 * Run a primary database query. A missing row is returned as null, but query
 * failures are rethrown so routes cannot mistake them for a 404 or redirect.
 */
export async function loadDb<T>(label: string, query: () => Promise<T>): Promise<T> {
  try {
    return await query();
  } catch (error) {
    unstable_rethrow(error);
    logDatabaseError(label, error, "propagating");
    throw error;
  }
}

/**
 * Run a database query and never let a database failure take the page down.
 *
 * Only transient connectivity failures receive the caller's fallback. Schema
 * mismatches and other query failures are rethrown as server errors rather
 * than silently rendering empty or missing data.
 *
 * Because the fallback is returned by this helper rather than inside an
 * `unstable_cache` callback, a failure is never cached: the next request
 * retries the real query and recovers automatically once the database is
 * reachable again.
 */
export async function safeDb<T>(
  label: string,
  query: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await query();
  } catch (error) {
    unstable_rethrow(error);
    if (!isTransientDatabaseError(error)) {
      logDatabaseError(label, error, "propagating");
      throw error;
    }
    logDatabaseError(label, error, "serving fallback");
    return fallback;
  }
}
