// Vercel redirects the apex domain to this production host. All generated SEO
// URLs must use the destination directly rather than a redirecting URL.
export const SITE_URL = new URL("https://www.radikal.in");

const SITE_HOST = SITE_URL.hostname;

export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

/**
 * Keep metadata and schema media to local assets or the configured public
 * media host. User-provided arbitrary URLs must not become crawl directives.
 */
export function publicImageUrl(value: string | null | undefined) {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value, SITE_URL);
    const isLocalAsset = url.hostname === SITE_HOST;
    const isSupabaseAsset = url.protocol === "https:" && url.hostname.endsWith(".supabase.co");
    return isLocalAsset || isSupabaseAsset ? url.toString() : null;
  } catch {
    return null;
  }
}

export function plainText(value: string, maxLength = 160) {
  const normalized = value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= maxLength) return normalized;

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function serializeJsonLd(data: unknown) {
  // Prevent text supplied through the CMS from terminating the JSON-LD script.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
