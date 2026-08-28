import { describe, expect, it } from "vitest";

import {
  CURRENCIES,
  currencyForCountry,
  formatPrice,
  getCurrency,
  isCurrencyCode,
} from "./currency";

describe("getCurrency", () => {
  it("returns the matching currency by code", () => {
    expect(getCurrency("USD").code).toBe("USD");
  });

  it("falls back to INR for unknown or missing codes", () => {
    expect(getCurrency("ZZZ").code).toBe("INR");
    expect(getCurrency(null).code).toBe("INR");
    expect(getCurrency(undefined).code).toBe("INR");
  });
});

describe("isCurrencyCode", () => {
  it("accepts known codes", () => {
    expect(isCurrencyCode("INR")).toBe(true);
    expect(isCurrencyCode("EUR")).toBe(true);
  });

  it("rejects unknown codes", () => {
    expect(isCurrencyCode("ZZZ")).toBe(false);
  });
});

describe("formatPrice", () => {
  it("formats INR as whole units", () => {
    expect(formatPrice(1000)).toBe("₹1,000");
  });

  it("converts and formats USD with two decimals", () => {
    const converted = 1000 * 0.012;
    expect(formatPrice(1000, "USD")).toBe(`$${converted.toFixed(2)}`);
  });

  it("falls back to INR for an unknown code", () => {
    expect(formatPrice(1000, "ZZZ" as never)).toBe("₹1,000");
  });
});

describe("currencyForCountry", () => {
  it("maps country codes to currencies", () => {
    expect(currencyForCountry("IN")).toBe("INR");
    expect(currencyForCountry("US")).toBe("USD");
    expect(currencyForCountry("FR")).toBe("EUR");
  });

  it("normalizes case and trims", () => {
    expect(currencyForCountry(" us ")).toBe("USD");
  });

  it("returns null for unknown or invalid codes", () => {
    expect(currencyForCountry("XX")).toBe(null);
    expect(currencyForCountry("USA")).toBe(null);
    expect(currencyForCountry(null)).toBe(null);
    expect(currencyForCountry(undefined)).toBe(null);
  });

  it("uses INR as the default currency constant", () => {
    expect(CURRENCIES[0].code).toBe("INR");
  });
});
