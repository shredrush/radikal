/**
 * Central input sanitization helpers.
 *
 * React escapes all rendered output by default (no `dangerouslySetInnerHTML` is
 * used anywhere in this app), so the main remaining risks are:
 *   - Control characters smuggled into text (log/console injection, XSS-adjacent).
 *   - Unsafe URLs (e.g. `javascript:` / `data:` / `vbscript:` schemes) in fields
 *     that later become `href`/`src` values.
 *   - Overly long inputs used to abuse storage or reading surfaces.
 *
 * Apply these to every user-supplied string *before* it is persisted.
 */

/** Control characters other than the safe set (tab, LF, CR). */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

/** Matches a lowercase slug: letters, digits and single hyphens. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function stripControlChars(value: string): string {
  return value.replace(CONTROL_CHARS, "");
}

export type SanitizeTextOptions = {
  /** Maximum length after sanitization. Excess characters are truncated. */
  maxLength?: number;
  /** Whether line breaks should be preserved (e.g. descriptions). */
  allowNewlines?: boolean;
};

/**
 * Sanitize a free-text value: strip control characters, normalize whitespace
 * (collapsing runs of spaces/newlines into single spaces unless newlines are
 * allowed), trim, and enforce a maximum length.
 */
export function sanitizeText(value: string, options: SanitizeTextOptions = {}): string {
  let text = stripControlChars(value);

  if (options.allowNewlines) {
    // Collapse runs of blank space but keep a single newline.
    text = text.replace(/[^\S\r\n]+/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  } else {
    text = text.replace(/\s+/g, " ");
  }

  text = text.trim();

  if (options.maxLength !== undefined && text.length > options.maxLength) {
    text = text.slice(0, options.maxLength).trim();
  }

  return text;
}

/** A slug must be lowercase alphanumeric with single hyphens (no spaces, slashes). */
export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

/** Only `http:` and `https:` URLs — rejects `javascript:`, `data:`, `vbscript:`, etc. */
export function isSafeHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * An image source may be an http(s) URL, a site-relative path, or a raster
 * `data:image/*` URI. SVG data URIs are rejected because they can embed
 * scripts.
 */
export function isSafeImageSource(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  return /^data:image\/(png|jpe?g|gif|webp|avif);/i.test(trimmed);
}
