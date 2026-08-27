import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getDatabaseConnectionLogInfo, getDatabaseUrl } from "@/lib/database-url";

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
    // Keep it at 1-2 and raise the Supabase pooler `pool_size` for headroom.
    const parsedMax = Number.parseInt(process.env.DATABASE_POOL_MAX ?? "2", 10);
    const poolConfig = {
      max: Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    let sslMode: string | null = null;
    try {
      sslMode = new URL(databaseUrl).searchParams.get("sslmode");
    } catch {}

    return new PrismaClient({
      adapter: new PrismaPg({
        connectionString: databaseUrl,
        ...poolConfig,
        ...(sslMode === "require" ? { ssl: { rejectUnauthorized: false } } : {}),
      }),
    });
  })();

export const prisma = basePrisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
}
