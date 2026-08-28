import { describe, expect, it } from "vitest";

import {
  isReservedUsername,
  isSafeHttpUrl,
  isSafeImageSource,
  isValidSlug,
  isValidUsername,
  normalizeUsername,
  sanitizeText,
} from "./sanitize";

describe("sanitizeText", () => {
  it("strips control characters", () => {
    expect(sanitizeText("hello\u0000\u0007world")).toBe("helloworld");
  });

  it("collapses runs of whitespace into single spaces", () => {
    expect(sanitizeText("  hello   \t world  ")).toBe("hello world");
  });

  it("trims leading and trailing whitespace", () => {
    expect(sanitizeText("  hi  ")).toBe("hi");
  });

  it("truncates to maxLength after sanitization", () => {
    expect(sanitizeText("abcdef", { maxLength: 3 })).toBe("abc");
  });

  it("preserves single newlines when allowNewlines is set", () => {
    expect(sanitizeText("line one\n\n\nline two", { allowNewlines: true })).toBe(
      "line one\n\nline two",
    );
  });

  it("collapses newlines into spaces when allowNewlines is not set", () => {
    expect(sanitizeText("a\nb")).toBe("a b");
  });
});

describe("isValidSlug", () => {
  it("accepts lowercase alphanumeric slugs with single hyphens", () => {
    expect(isValidSlug("manali-trek")).toBe(true);
    expect(isValidSlug("abc123")).toBe(true);
  });

  it("rejects uppercase, spaces, slashes and repeated hyphens", () => {
    expect(isValidSlug("Manali-Trek")).toBe(false);
    expect(isValidSlug("manali trek")).toBe(false);
    expect(isValidSlug("manali/trek")).toBe(false);
    expect(isValidSlug("manali--trek")).toBe(false);
  });
});

describe("normalizeUsername", () => {
  it("lowercases and trims", () => {
    expect(normalizeUsername("  RadikalGuy ")).toBe("radikalguy");
  });
});

describe("isReservedUsername", () => {
  it("matches exact reserved names", () => {
    expect(isReservedUsername("admin")).toBe(true);
    expect(isReservedUsername("trips")).toBe(true);
  });

  it("matches reserved names after stripping separators", () => {
    expect(isReservedUsername("ad.min")).toBe(true);
    expect(isReservedUsername("a-dmin")).toBe(true);
    expect(isReservedUsername("ad_min")).toBe(true);
  });

  it("does not flag ordinary names", () => {
    expect(isReservedUsername("adventurer")).toBe(false);
  });
});

describe("isValidUsername", () => {
  it("accepts valid lowercase usernames", () => {
    expect(isValidUsername("adventurer")).toBe(true);
    expect(isValidUsername("radikal.guy")).toBe(true);
  });

  it("rejects too-short and too-long usernames", () => {
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("a".repeat(31))).toBe(false);
  });

  it("rejects reserved names", () => {
    expect(isValidUsername("admin")).toBe(false);
  });

  it("rejects uppercase and consecutive separators", () => {
    expect(isValidUsername("Radikal")).toBe(false);
    expect(isValidUsername("radikal..guy")).toBe(false);
  });
});

describe("isSafeHttpUrl", () => {
  it("accepts http and https", () => {
    expect(isSafeHttpUrl("https://example.com")).toBe(true);
    expect(isSafeHttpUrl("http://example.com")).toBe(true);
  });

  it("rejects javascript:, data: and other schemes", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html,<script>")).toBe(false);
    expect(isSafeHttpUrl("vbscript:msgbox")).toBe(false);
  });

  it("rejects empty and malformed input", () => {
    expect(isSafeHttpUrl("")).toBe(false);
    expect(isSafeHttpUrl("not a url")).toBe(false);
  });
});

describe("isSafeImageSource", () => {
  it("accepts site-relative paths and http(s) URLs", () => {
    expect(isSafeImageSource("/images/a.jpg")).toBe(true);
    expect(isSafeImageSource("https://example.com/a.jpg")).toBe(true);
  });

  it("accepts raster data URIs", () => {
    expect(isSafeImageSource("data:image/png;base64,AAAA")).toBe(true);
  });

  it("rejects SVG data URIs and javascript URLs", () => {
    expect(isSafeImageSource("data:image/svg+xml;base64,AAAA")).toBe(false);
    expect(isSafeImageSource("javascript:alert(1)")).toBe(false);
  });
});
