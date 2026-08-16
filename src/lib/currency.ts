// Currency support: prices are stored in the DB as integer rupees
// (`priceInRupees` / `totalPriceRupees`). Everything here converts from that
// single source of truth into a user-selected display currency.
//
// Rates are approximate/static (updated manually) — good enough for a store
// front display toggle, NOT for actual payment settlement.

export const CURRENCIES = [
  { code: "INR", symbol: "₹", flag: "🇮🇳", name: "Indian Rupee", rateFromINR: 1 },
  { code: "USD", symbol: "$", flag: "🇺🇸", name: "US Dollar", rateFromINR: 0.012 },
  { code: "EUR", symbol: "€", flag: "🇪🇺", name: "Euro", rateFromINR: 0.011 },
  { code: "GBP", symbol: "£", flag: "🇬🇧", name: "British Pound", rateFromINR: 0.0094 },
  { code: "JPY", symbol: "¥", flag: "🇯🇵", name: "Japanese Yen", rateFromINR: 1.85 },
  { code: "AUD", symbol: "A$", flag: "🇦🇺", name: "Australian Dollar", rateFromINR: 0.018 },
  { code: "CAD", symbol: "C$", flag: "🇨🇦", name: "Canadian Dollar", rateFromINR: 0.0165 },
  { code: "CHF", symbol: "CHF", flag: "🇨🇭", name: "Swiss Franc", rateFromINR: 0.0105 },
  { code: "CNY", symbol: "CN¥", flag: "🇨🇳", name: "Chinese Yuan", rateFromINR: 0.086 },
  { code: "SGD", symbol: "S$", flag: "🇸🇬", name: "Singapore Dollar", rateFromINR: 0.016 },
  { code: "AED", symbol: "د.إ", flag: "🇦🇪", name: "UAE Dirham", rateFromINR: 0.044 },
] as const;

export type Currency = (typeof CURRENCIES)[number];
export type CurrencyCode = Currency["code"];

export const DEFAULT_CURRENCY: CurrencyCode = "INR";

export function getCurrency(code: string | null | undefined): Currency {
  return CURRENCIES.find((currency) => currency.code === code) ?? CURRENCIES[0];
}

export function isCurrencyCode(value: string): value is CurrencyCode {
  return CURRENCIES.some((currency) => currency.code === value);
}

const formatterCache = new Map<CurrencyCode, Intl.NumberFormat>();

function getFormatter(code: CurrencyCode): Intl.NumberFormat {
  const cached = formatterCache.get(code);
  if (cached) return cached;

  // Rupees and yen are whole units; other currencies read better with decimals.
  const fractionDigits = code === "INR" || code === "JPY" ? 0 : 2;
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: code,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  formatterCache.set(code, formatter);
  return formatter;
}

export function formatPrice(
  amountInRupees: number,
  code: CurrencyCode = DEFAULT_CURRENCY,
): string {
  const currency = getCurrency(code);
  const converted = amountInRupees * currency.rateFromINR;
  return getFormatter(currency.code).format(converted);
}

// ISO-3166-1 alpha-2 country → currency. Used with Vercel's
// `x-vercel-ip-country` header to default the selector for first-time visitors.
const COUNTRY_CURRENCY: Record<string, CurrencyCode> = {
  IN: "INR",
  US: "USD",
  GB: "GBP",
  JP: "JPY",
  AU: "AUD",
  CA: "CAD",
  CH: "CHF",
  CN: "CNY",
  SG: "SGD",
  AE: "AED",
  // Eurozone (non-exhaustive, covers the common destinations).
  AT: "EUR",
  BE: "EUR",
  CY: "EUR",
  DE: "EUR",
  EE: "EUR",
  ES: "EUR",
  FI: "EUR",
  FR: "EUR",
  GR: "EUR",
  HR: "EUR",
  IE: "EUR",
  IT: "EUR",
  LT: "EUR",
  LU: "EUR",
  LV: "EUR",
  MT: "EUR",
  NL: "EUR",
  PT: "EUR",
  SI: "EUR",
  SK: "EUR",
};

/** Map a 2-letter country code to a supported currency, or `null` if unknown. */
export function currencyForCountry(
  countryCode: string | null | undefined,
): CurrencyCode | null {
  if (!countryCode) return null;
  // Defensive: only accept an exact ISO-3166-1 alpha-2 shape, and look it up
  // against the fixed allowlist above (never interpolate the value).
  const normalized = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return null;
  return COUNTRY_CURRENCY[normalized] ?? null;
}
