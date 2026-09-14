import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { connection } from "next/server";

import { prisma, safeDb } from "@/lib/prisma";
import { publicTripVisibilityWhere } from "@/lib/public-trip-catalog";
import { absoluteUrl, publicImageUrl } from "@/lib/seo";
import { SPORT_GUIDES } from "@/lib/sport-guides";

const getSitemapContent = unstable_cache(
  async () => {
    const [trips, guides] = await Promise.all([
      prisma.trip.findMany({
        where: publicTripVisibilityWhere,
        select: { slug: true, updatedAt: true, images: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.guide.findMany({
        where: { deletedAt: null, user: { deletedAt: null, username: { not: null } } },
        select: { updatedAt: true, user: { select: { username: true } } },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    return { trips, guides };
  },
  ["public-sitemap-content"],
  { tags: ["trips", "guides"], revalidate: 3600 },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Database content must not be read while producing a deployment build.
  await connection();

  const { trips, guides } = await safeDb("sitemap.content", getSitemapContent, {
    trips: [],
    guides: [],
  });

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/trips"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/community"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/become-a-guide"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/custom-trip"), changeFrequency: "monthly", priority: 0.6 },
  ];

  const sportPages: MetadataRoute.Sitemap = Object.keys(SPORT_GUIDES).map((sport) => ({
    url: absoluteUrl(`/sports/${sport}`),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const tripPages: MetadataRoute.Sitemap = trips.map((trip) => ({
    url: absoluteUrl(`/trips/${trip.slug}`),
    lastModified: trip.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
    images: trip.images.map(publicImageUrl).filter((image): image is string => Boolean(image)),
  }));

  const guidePages: MetadataRoute.Sitemap = guides.flatMap((guide) =>
    guide.user.username
      ? [{
          url: absoluteUrl(`/${guide.user.username}`),
          lastModified: guide.updatedAt,
          changeFrequency: "monthly" as const,
          priority: 0.7,
        }]
      : [],
  );

  return [...staticPages, ...sportPages, ...tripPages, ...guidePages];
}
