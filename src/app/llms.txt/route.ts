import { absoluteUrl } from "@/lib/seo";
import { SPORT_GUIDES } from "@/lib/sport-guides";

export const revalidate = 86400;

export function GET() {
  const sportGuideUrls = Object.keys(SPORT_GUIDES)
    .map((sport) => absoluteUrl(`/sports/${sport}`))
    .join(", ");
  const content = `# Radikal

Radikal is a platform for small-group outdoor adventures and skills courses led by expert guides, with a focus on responsible exploration across the Himalayas.

## Public pages

- Trips catalog: ${absoluteUrl("/trips")}
- Outdoor community and safety standards: ${absoluteUrl("/community")}
- Sport guides: ${sportGuideUrls}
- Become a guide: ${absoluteUrl("/become-a-guide")}
- Custom trips: ${absoluteUrl("/custom-trip")}

## Discovery

The complete, current set of public trips and guide profiles is published in the sitemap: ${absoluteUrl("/sitemap.xml")}

## Content boundaries

Only publicly rendered pages are intended for discovery. Account profiles, bookings, payments, support conversations, previews, staff tools, APIs, and private custom-trip requests are not public content.
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
