import { headers } from "next/headers";

/**
 * Vercel injects free, keyless geolocation headers on every request (computed
 * from the real connection, NOT from the spoofable `x-forwarded-for` header).
 * We use them to (1) default the currency selector to the visitor's country and
 * (2) enrich the admin activity log with a coarse location.
 *
 * SECURITY: these headers are only trustworthy when the app actually runs on
 * Vercel. Vercel sets `VERCEL=1` in the runtime environment and overwrites the
 * headers from the real edge connection. On any other host (or behind a proxy
 * that forwards user-supplied headers) a client could spoof
 * `x-vercel-ip-country`, so we refuse to read them unless `VERCEL === "1"`.
 * Every field is also validated/truncated defensively before use.
 */

const IS_VERCEL = process.env.VERCEL === "1";

export type GeoInfo = {
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: string | null;
  longitude: string | null;
  timezone: string | null;
};

const EMPTY_GEO: GeoInfo = {
  country: null,
  region: null,
  city: null,
  latitude: null,
  longitude: null,
  timezone: null,
};

/** Country codes are exactly two ASCII letters (ISO-3166-1 alpha-2). */
function sanitizeCountry(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed || !/^[A-Za-z]{2}$/.test(trimmed)) return null;
  return trimmed.toUpperCase();
}

/** Free-text fields: strip control chars and clamp length. */
function sanitizeText(value: string | null, maxLength: number): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[\u0000-\u001f\u007f]/g, "");
  return cleaned.slice(0, maxLength) || null;
}

/** Latitude/longitude are decimal degrees like "37.7749" / "-122.4194". */
function sanitizeCoordinate(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed || !/^-?\d{1,3}(\.\d{1,6})?$/.test(trimmed)) return null;
  return trimmed;
}

export async function getGeoInfo(): Promise<GeoInfo> {
  // Do not trust these headers anywhere but on Vercel.
  if (!IS_VERCEL) return EMPTY_GEO;

  try {
    const headerList = await headers();
    return {
      country: sanitizeCountry(headerList.get("x-vercel-ip-country")),
      region: sanitizeText(headerList.get("x-vercel-ip-country-region"), 64),
      city: sanitizeText(headerList.get("x-vercel-ip-city"), 64),
      latitude: sanitizeCoordinate(headerList.get("x-vercel-ip-latitude")),
      longitude: sanitizeCoordinate(headerList.get("x-vercel-ip-longitude")),
      timezone: sanitizeText(headerList.get("x-vercel-ip-timezone"), 64),
    };
  } catch {
    return EMPTY_GEO;
  }
}

/** Sanitized 2-letter country code, or `null` (only trusted on Vercel). */
export async function getClientCountry(): Promise<string | null> {
  if (!IS_VERCEL) return null;
  try {
    const headerList = await headers();
    return sanitizeCountry(headerList.get("x-vercel-ip-country"));
  } catch {
    return null;
  }
}

/** True when at least one geolocation field is populated. */
export function hasGeoInfo(geo: GeoInfo): boolean {
  return Boolean(geo.country || geo.region || geo.city);
}
