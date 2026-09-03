-- A review is always about a completed trip and the guide who led it. Backfill
-- historical guide links from their trips before making both relations required.
UPDATE "reviews" r
SET "guideId" = t."guideId"
FROM "trips" t
WHERE r."tripId" = t.id
  AND r."guideId" IS NULL
  AND t."guideId" IS NOT NULL;

-- Remove legacy reviews that cannot be attributed to both a real trip and a
-- real guide. These rows cannot be displayed accurately under this model.
DELETE FROM "reviews" r
WHERE r."tripId" IS NULL
   OR r."guideId" IS NULL
   OR NOT EXISTS (SELECT 1 FROM "trips" t WHERE t.id = r."tripId")
   OR NOT EXISTS (SELECT 1 FROM "guides" g WHERE g.id = r."guideId");

ALTER TABLE "reviews"
  ALTER COLUMN "tripId" SET NOT NULL,
  ALTER COLUMN "guideId" SET NOT NULL;

-- Replace nullable SetNull foreign keys with restrictive links. Trips and
-- guides are retired through soft deletion, so review history remains intact.
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_tripId_fkey";
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_guideId_fkey";
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_tripId_fkey"
    FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "reviews_guideId_fkey"
    FOREIGN KEY ("guideId") REFERENCES "guides"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "reviews_tripId_idx";
DROP INDEX IF EXISTS "reviews_guideId_deletedAt_idx";
CREATE INDEX "reviews_tripId_deletedAt_createdAt_idx"
  ON "reviews"("tripId", "deletedAt", "createdAt");
CREATE INDEX "reviews_guideId_deletedAt_createdAt_idx"
  ON "reviews"("guideId", "deletedAt", "createdAt");
