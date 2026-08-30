export type OrderedMediaItem = { src: string; type: "image" | "video" };

export function normalizeMediaOrder(
  images: string[],
  videos: string[],
  mediaOrder: string[] = [],
) {
  const available = [...images, ...videos].filter(Boolean);
  const allowed = new Set(available);
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const url of mediaOrder) {
    if (allowed.has(url) && !seen.has(url)) {
      ordered.push(url);
      seen.add(url);
    }
  }

  for (const url of available) {
    if (!seen.has(url)) {
      ordered.push(url);
      seen.add(url);
    }
  }

  return ordered;
}

export function getOrderedMediaItems(
  images: string[],
  videos: string[],
  mediaOrder: string[] = [],
): OrderedMediaItem[] {
  const imageSet = new Set(images);
  const videoSet = new Set(videos);

  return normalizeMediaOrder(images, videos, mediaOrder)
    .map((src): OrderedMediaItem | null => {
      if (imageSet.has(src)) return { src, type: "image" };
      if (videoSet.has(src)) return { src, type: "video" };
      return null;
    })
    .filter((item): item is OrderedMediaItem => item !== null);
}
