import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // These routes either require authentication or contain tokens, account
      // data, payments, staff tools, or non-HTML endpoints.
      disallow: [
        "/admin/",
        "/api/",
        "/booking/",
        "/guide-board/",
        "/preview/",
        "/profile/",
        "/r/",
        "/support/",
        "/custom-trip/*",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
