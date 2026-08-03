export function getDatabaseUrl() {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.DIRECT_URL,
  ].filter(Boolean) as string[];

  const rawUrl = candidates[0];
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
