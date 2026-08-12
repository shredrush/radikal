import type { NextConfig } from "next";

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
    // Don't resize beyond source dims to avoid degradation
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // 1 hour cache (revalidated by updateTag/revalidatePath on mutations)
    minimumCacheTTL: 3600,
  },
};

export default nextConfig;
