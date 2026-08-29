import { prisma } from "@/lib/prisma";
import {
  listFolders,
  listObjects,
  parseStoredUrl,
  removeObjects,
  type MediaBucket,
} from "@/lib/media";
import type { TripProposal } from "@/lib/trip-changes";

// Objects older than this and not referenced anywhere in the database are
// considered orphans (uploads that were never committed, or media replaced by
// an edit) and can be reclaimed.
const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;

const BUCKETS: MediaBucket[] = ["guide-media", "trip-media"];

// Bounded concurrency for storage listings so the cron stays within Vercel
// function duration limits as the platform grows.
const LIST_CONCURRENCY = 8;

const recordUrl = (referenced: Set<string>, urls: string[]) => {
  for (const url of urls) {
    const parsed = parseStoredUrl(url);
    if (parsed) referenced.add(`${parsed.bucket}/${parsed.path}`);
  }
};

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Nightly sweep that deletes Supabase Storage objects older than 24h that are
 * not referenced by any live record. References are:
 *   - live trip / guide / application / draft rows, and
 *   - PENDING trip-change snapshots (media not yet promoted to a live trip)
 *     and short-lived previews.
 * Historical approved/rejected snapshots and `original` snapshots are NOT
 * references, so media that was replaced or removed by an edit is reclaimed
 * instead of leaking forever. Folder keys come from the buckets themselves,
 * so uploads that never made it into any row (abandoned forms) are covered.
 */
export async function sweepOrphanMedia() {
  const [trips, guides, applications, drafts, pendingChanges, previews] = await Promise.all([
    prisma.trip.findMany({ select: { images: true, videos: true } }),
    prisma.guide.findMany({ select: { photos: true, videos: true } }),
    prisma.guideApplication.findMany({
      where: { status: "PENDING" },
      select: { photos: true, videos: true },
    }),
    prisma.tripDraft.findMany({ select: { images: true, videos: true } }),
    prisma.tripChangeRequest.findMany({
      where: { status: "PENDING" },
      select: { proposed: true },
    }),
    prisma.tripPreview.findMany({ select: { proposed: true } }),
  ]);

  const referenced = new Set<string>(); // `${bucket}/${path}`

  for (const trip of trips) recordUrl(referenced, [...trip.images, ...trip.videos]);
  for (const guide of guides) recordUrl(referenced, [...guide.photos, ...guide.videos]);
  for (const application of applications) {
    recordUrl(referenced, [...application.photos, ...application.videos]);
  }
  for (const draft of drafts) recordUrl(referenced, [...draft.images, ...draft.videos]);
  for (const change of pendingChanges) {
    recordUrl(referenced, (change.proposed as TripProposal | null)?.images ?? []);
    recordUrl(referenced, (change.proposed as TripProposal | null)?.videos ?? []);
  }
  for (const preview of previews) {
    recordUrl(referenced, (preview.proposed as TripProposal | null)?.images ?? []);
    recordUrl(referenced, (preview.proposed as TripProposal | null)?.videos ?? []);
  }

  const cutoff = new Date(Date.now() - ORPHAN_AGE_MS);
  let deleted = 0;
  let scanned = 0;

  for (const bucket of BUCKETS) {
    // Enumerate the actual top-level folders in the bucket — this covers
    // entity folders for committed rows as well as folders left behind by
    // aborted creates (e.g. an application uploaded under {userId} but never
    // submitted).
    const folderKeys = await listFolders(bucket);

    const objects = await mapWithConcurrency(
      folderKeys,
      LIST_CONCURRENCY,
      async (folderKey) => {
        const found: Array<{
          folderKey: string;
          kind: string;
          name: string;
          createdAt: Date | null;
        }> = [];
        for (const kind of ["images", "videos"] as const) {
          const entries = await listObjects(bucket, `${folderKey}/${kind}`);
          for (const entry of entries) {
            found.push({ folderKey, kind, name: entry.name, createdAt: entry.createdAt });
          }
        }
        return found;
      },
    );
    const flat = objects.flat();
    scanned += flat.length;

    const orphans = flat
      .filter((object) => {
        const key = `${bucket}/${object.folderKey}/${object.kind}/${object.name}`;
        return !referenced.has(key) && object.createdAt !== null && object.createdAt < cutoff;
      })
      .map((object) => `${object.folderKey}/${object.kind}/${object.name}`);

    // Storage accepts up to 100 keys per delete call.
    for (let i = 0; i < orphans.length; i += 100) {
      await removeObjects(bucket, orphans.slice(i, i + 100));
    }
    deleted += orphans.length;
  }

  return { scanned, deleted };
}
