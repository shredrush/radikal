import { SUPABASE_CA_CERT } from "./supabase-ca";

function getDatabaseUrlCandidates() {
  const candidates = [
    // Application queries should use Supabase's transaction pooler. Keep
    // DATABASE_URL available for Prisma CLI commands and direct connections.
    ["DATABASE_POOL_URL", process.env.DATABASE_POOL_URL],
    ["DATABASE_URL", process.env.DATABASE_URL],
    ["POSTGRES_URL", process.env.POSTGRES_URL],
    ["POSTGRES_URL_NON_POOLING", process.env.POSTGRES_URL_NON_POOLING],
    ["POSTGRES_PRISMA_URL", process.env.POSTGRES_PRISMA_URL],
  ] as Array<[string, string | undefined]>;

  return candidates.filter(([, value]) => Boolean(value)) as Array<[string, string]>;
}

function normalizeDatabaseUrl(rawUrl: string | undefined) {
  if (!rawUrl) {
    return undefined;
  }

  const trimmed = rawUrl.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

/**
 * The CA certificate used to authenticate the database server over TLS.
 * Prefers the `DATABASE_CA_CERT` env var (inline PEM, for CA rotations), and
 * falls back to the bundled Supabase Root 2021 CA. Returns undefined when no
 * CA is available.
 */
export function getDatabaseCaCert() {
  const override = process.env.DATABASE_CA_CERT?.trim();
  return override || SUPABASE_CA_CERT;
}

/**
 * Whether TLS server authentication is enabled for the production connection.
 * When a CA is configured, the connection string is stripped of any `sslmode`
 * so the `ssl: { ca }` pool option (real verification) is not overridden by
 * node-postgres's URL parsing, and the server is authenticated against the
 * pinned CA.
 */
function usesPinnedCa() {
  return process.env.NODE_ENV === "production" && Boolean(getDatabaseCaCert());
}

function applyDatabaseUrlDefaults(rawUrl: string) {
  try {
    const url = new URL(rawUrl);

    if (usesPinnedCa()) {
      // node-postgres lets a URL `sslmode` silently override the `ssl` object
      // passed to the pool — that override is exactly what made the old
      // `sslmode=require` do full verification against the *system* trust
      // store and fail P1011 against Supabase's private CA. Strip every SSL
      // parameter here so the pinned CA config in prisma.ts is honoured.
      url.searchParams.delete("sslmode");
      url.searchParams.delete("sslrootcert");
      url.searchParams.delete("sslcert");
      url.searchParams.delete("sslkey");
    } else {
      const currentSslMode = url.searchParams.get("sslmode");
      if (process.env.NODE_ENV === "production") {
        // With node-postgres, `sslmode=require` enables TLS but keeps
        // certificate chain verification on (rejectUnauthorized defaults to
        // true), which rejects Supabase's self-signed certificate chain with a
        // P1011 TLS error. `no-verify` keeps the connection encrypted while
        // skipping chain verification, matching libpq's `require` semantics.
        // This path only runs when no CA is pinned (see usesPinnedCa above).
        if (!currentSslMode || currentSslMode === "disable" || currentSslMode === "require") {
          url.searchParams.set("sslmode", "no-verify");
        }
      } else if (!currentSslMode) {
        url.searchParams.set("sslmode", "disable");
      }
    }

    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "10");
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

export function getDatabaseUrl() {
  const candidate = getDatabaseUrlCandidates()[0];
  const rawUrl = normalizeDatabaseUrl(candidate?.[1]);

  if (!rawUrl) {
    return undefined;
  }

  return applyDatabaseUrlDefaults(rawUrl);
}

export function getDatabaseConnectionLogInfo() {
  const candidates = getDatabaseUrlCandidates();
  const [source, rawValue] = candidates[0] || [null, undefined];
  const rawUrl = normalizeDatabaseUrl(rawValue);

  if (!rawUrl) {
    return {
      present: false,
      source: null,
      host: null,
      port: null,
      database: null,
      sslmode: null,
    };
  }

  try {
    const normalizedUrl = applyDatabaseUrlDefaults(rawUrl);
    const url = new URL(normalizedUrl);
    return {
      present: true,
      source,
      host: url.hostname,
      port: url.port || (url.protocol === "postgres:" ? "5432" : null),
      database: url.pathname.replace(/^\//, "") || null,
      sslmode: usesPinnedCa()
        ? "verify-full (pinned CA)"
        : url.searchParams.get("sslmode") || null,
    };
  } catch {
    return {
      present: true,
      source,
      host: rawUrl,
      port: null,
      database: null,
      sslmode: null,
    };
  }
}
