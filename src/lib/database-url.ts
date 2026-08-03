function getDatabaseUrlCandidates() {
  const candidates = [
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

function applyDatabaseUrlDefaults(rawUrl: string) {
  try {
    const url = new URL(rawUrl);

    const currentSslMode = url.searchParams.get("sslmode");
    if (!currentSslMode) {
      url.searchParams.set("sslmode", "disable");
    } else if (currentSslMode === "require") {
      url.searchParams.set("sslmode", "require");
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
      sslmode: url.searchParams.get("sslmode") || null,
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
