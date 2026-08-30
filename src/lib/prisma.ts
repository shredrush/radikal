import { PrismaPg } from "@prisma/adapter-pg";
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
    // headroom if production traffic needs more concurrency.
    const parsedMax = Number.parseInt(process.env.DATABASE_POOL_MAX ?? "1", 10);
    const poolConfig = {
      max: Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : 1,
      idleTimeoutMillis: 30000,
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

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
}

/**
 * Run a database query and never let a database failure take the page down.
 *
 * If the query throws (e.g. a TLS/connection error, a provider outage, or an
 * exhausted pool), the error is logged with connection diagnostics — source
 * env var, host, port, database and effective sslmode — so issues like the
 * production P1011 "self-signed certificate in certificate chain" failure are
 * visible in Vercel function logs. The caller receives `fallback` (usually an
 * empty array) and the page renders degraded instead of 500ing.
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
    const err = error as { code?: string; message?: string };
    console.error(
      `[db] "${label}" query failed; serving fallback instead of crashing`,
      {
        code: err.code ?? null,
        error: err.message ?? String(error),
        connection: getDatabaseConnectionLogInfo(),
      },
    );
    return fallback;
  }
}
