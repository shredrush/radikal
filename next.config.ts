import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Content Security Policy template.
// Delivered via the `Content-Security-Policy-Report-Only` header, so it is
// monitored (violations are reported) but NOT enforced. To enforce it, rename
// the header key to `Content-Security-Policy` and re-run the app to confirm
// nothing breaks before deploying.
const contentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://images.unsplash.com https://plus.unsplash.com https://ui-avatars.com;
  font-src 'self' data:;
  connect-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  report-uri /api/csp-report;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
    ],
    // Reduce memory usage and improve cache hit rate with aggressive formats
    formats: ["image/avif", "image/webp"],
    // SVG is disabled: the optimizer never serves user-provided SVGs (the
    // static logo is served directly), avoiding SVG-based XSS via <img>.
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // 1 hour cache (revalidated by updateTag/revalidatePath on mutations)
    minimumCacheTTL: 3600,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Report-only CSP: monitored, not enforced.
          {
            key: "Content-Security-Policy-Report-Only",
            value: contentSecurityPolicy,
          },
          // Enforced baseline security headers (independent of CSP).
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
          // HSTS is only meaningful over HTTPS; skip in dev so the browser
          // never pins it for localhost.
          ...(isDev
            ? []
            : [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]),
        ],
      },
    ];
  },
};

export default nextConfig;
