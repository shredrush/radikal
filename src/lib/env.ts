import "server-only";

const databaseUrlNames = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_PRISMA_URL",
] as const;

function isUrl(value: string | undefined) {
  if (!value) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/** Fail deployment startup when production dependencies are misconfigured. */
export function validateProductionEnvironment() {
  if (process.env.NODE_ENV !== "production") return;

  const missing: string[] = [];
  const invalid: string[] = [];
  const databaseUrl = databaseUrlNames.find((name) => process.env[name]?.trim());

  if (!databaseUrl) {
    missing.push(`one of ${databaseUrlNames.join(", ")}`);
  } else if (!isUrl(process.env[databaseUrl])) {
    invalid.push(databaseUrl);
  }

  for (const name of [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "CRON_SECRET",
  ] as const) {
    if (!process.env[name]?.trim()) missing.push(name);
  }

  if (!isUrl(process.env.SUPABASE_URL)) invalid.push("SUPABASE_URL");
  if (!isUrl(process.env.NEXTAUTH_URL)) invalid.push("NEXTAUTH_URL");
  if (!process.env.NEXTAUTH_URL?.trim()) missing.push("NEXTAUTH_URL");
  if (!process.env.AUTH_SECRET?.trim() && !process.env.NEXTAUTH_SECRET?.trim()) {
    missing.push("AUTH_SECRET or NEXTAUTH_SECRET");
  }

  if (missing.length || invalid.length) {
    const details = [
      missing.length ? `missing: ${missing.join(", ")}` : "",
      invalid.length ? `invalid URL: ${invalid.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("; ");
    throw new Error(`Invalid production environment configuration (${details}).`);
  }
}
