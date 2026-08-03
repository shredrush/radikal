import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
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

async function runWithRetry<T>(operation: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isDatabaseUnavailableError(error) || attempt === attempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }

  throw lastError;
}

function wrapWithFallback<T extends object>(target: T, fallbackSource: string): T {
  return new Proxy(target, {
    get(targetObject, property, receiver) {
      const value = Reflect.get(targetObject, property, receiver);

      if (typeof value === "function") {
        return (...args: unknown[]) => {
          const invokeOperation = () => {
            const result = (value as (...args: unknown[]) => unknown).apply(targetObject, args);
            return Promise.resolve(result as Promise<unknown>);
          };

          return (async () => {
            try {
              return await runWithRetry(invokeOperation);
            } catch (error) {
              if (isDatabaseUnavailableError(error)) {
                console.warn(`[prisma] database unavailable while calling ${fallbackSource}.${String(property)}, using fallback values`);
                return createFallbackValue(String(property));
              }

              throw error;
            }
          })();
        };
      }

      if (typeof value === "object" && value !== null && String(property).startsWith("$") === false) {
        return wrapWithFallback(value, `${fallbackSource}.${String(property)}`);
      }

      return value;
    },
  }) as T;
}

const shouldDisableTlsVerification = Boolean(
  databaseUrl && !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1"),
);

const adapter = databaseUrl
  ? new PrismaPg({
      connectionString: databaseUrl,
      ...(shouldDisableTlsVerification ? { ssl: { rejectUnauthorized: false } } : {}),
    })
  : undefined;
const prismaClientOptions = (adapter ? { adapter } : {}) as ConstructorParameters<typeof PrismaClient>[0];
const basePrisma = globalForPrisma.prisma ?? new PrismaClient(prismaClientOptions);

export const prisma = wrapWithFallback(basePrisma, "prisma");

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
}
