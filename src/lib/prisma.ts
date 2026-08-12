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

function isDatabaseUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const { code, message } = error as { code?: string; message?: string };

  if (code === "P1001" || code === "P1017" || code === "P1002") {
    return true;
  }

  return /can't reach database server|ECONNRESET|ECONNREFUSED|ETIMEDOUT|database server/i.test(message ?? "");
}

function createFallbackValue(methodName: string) {
  switch (methodName) {
    case "findMany":
    case "findFirst":
    case "findManyOrThrow":
    case "findFirstOrThrow":
    case "aggregate":
    case "groupBy":
    case "queryRaw":
    case "executeRaw":
      return [];
    case "count":
      return 0;
    case "findUnique":
    case "findUniqueOrThrow":
      return null;
    default:
      return null;
  }
}

function wrapWithFallback<T extends object>(target: T, fallbackSource: string): T {
  return new Proxy(target, {
    get(targetObject, property, receiver) {
      const value = Reflect.get(targetObject, property, receiver);

      if (typeof value === "function") {
        return (...args: unknown[]) => {
          const result = (value as (...args: unknown[]) => unknown).apply(targetObject, args);

          if (result && typeof result === "object" && "then" in result && typeof (result as Promise<unknown>).then === "function") {
            return (result as Promise<unknown>).catch((error: unknown) => {
              if (isDatabaseUnavailableError(error)) {
                console.error(error);
                console.warn(`[prisma] database unavailable while calling ${fallbackSource}.${String(property)}, using fallback values`);
                return createFallbackValue(String(property));
              }

              throw error;
            });
          }

          return result;
        };
      }

      if (typeof value === "object" && value !== null && String(property).startsWith("$") === false) {
        return wrapWithFallback(value, `${fallbackSource}.${String(property)}`);
      }

      return value;
    },
  }) as T;
}

const basePrisma =
  globalForPrisma.prisma ??
  (() => {
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not configured for Prisma.");
    }

    return new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    });
  })();

export const prisma = wrapWithFallback(basePrisma, "prisma");

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
}
