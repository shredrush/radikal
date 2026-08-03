function getDatabaseUrlCandidates() {
  return [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.DIRECT_URL,
  ].filter(Boolean) as string[];
}

export function getDatabaseUrl() {
  const rawUrl = getDatabaseUrlCandidates()[0];
  if (!rawUrl) {
    return undefined;
  }

  try {
    const url = new URL(rawUrl);

    if (!url.searchParams.has("sslmode") && !url.hostname.includes("localhost") && !url.hostname.includes("127.0.0.1")) {
      url.searchParams.set("sslmode", "require");
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

export function getDatabaseConnectionLogInfo() {
  const candidates = getDatabaseUrlCandidates();
  const rawUrl = candidates[0];

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
    const url = new URL(rawUrl);
    return {
      present: true,
      source: "DATABASE_URL",
      host: url.hostname,
      port: url.port || (url.protocol === "postgres:" ? "5432" : null),
      database: url.pathname.replace(/^\//, "") || null,
      sslmode: url.searchParams.get("sslmode") || null,
    };
  } catch {
    return {
      present: true,
      source: "DATABASE_URL",
      host: rawUrl,
      port: null,
      database: null,
      sslmode: null,
    };
  }
}
