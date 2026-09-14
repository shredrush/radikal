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
  img-src 'self' data: blob: https://ui-avatars.com https://*.supabase.co;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co https://tiles.openfreemap.org;
  media-src 'self' blob: data: https://*.supabase.co;
  object-src 'none';
  worker-src 'self' blob:;
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  report-uri /api/csp-report;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
    // Leave room for multipart form-data overhead above the 16 MB photo limit.
    serverActions: {
      bodySizeLimit: "18mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
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
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/booking/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/guide-board/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/preview/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/profile/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/r/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/support/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/custom-trip/:requestId",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/login",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/signup",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
};

export default nextConfig;
