"use server";

import { revalidatePath, updateTag } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { requireGuideAction } from "@/lib/guide-board";
import { getActivityLogContext, logActivityInTransaction } from "@/lib/activity-log";
import { invalidateSessionVersion } from "@/lib/session-revocation";
import { deactivateGuide } from "@/lib/guide-teardown";
import { guideWelcomeEmail, sendEmailAfter } from "@/lib/email";
import { isValidUsername, normalizeUsername, sanitizeText } from "@/lib/sanitize";
import { rateLimit, rateLimitError } from "@/lib/rate-limit";
import { MEDIA_LIMITS } from "@/lib/media-constants";
import {
  assertValidStoredMedia,
  parseGuideMediaUrls,
  removeStoredMedia,
} from "@/lib/media";
import { normalizeMediaOrder } from "@/lib/media-order";
import { parseMediaList } from "@/lib/trip-fields";
import { ACTIVITY_TYPE_OPTIONS } from "@/lib/trip-metadata";

function asString(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

// Languages can be entered as a comma- or newline-separated list.
function parseLanguages(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\r\n,]+/)
        .map((item) => sanitizeText(item, { maxLength: 80 }))
        .filter(Boolean),
    ),
  );
}

function parseExperienceYears(value: string) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.min(Math.max(0, parsed), 100);
}

const guideSportValues = new Set<string>(ACTIVITY_TYPE_OPTIONS.map((option) => option.value));
const MAX_GUIDE_LANGUAGES = 20;
const MAX_GUIDE_CERTIFICATIONS = 25;
const MAX_GUIDE_LANGUAGES_INPUT_CHARS = 1700;
const MAX_GUIDE_CERTIFICATIONS_INPUT_CHARS = 5100;

function readBoundedText(formData: FormData, field: string, maxLength: number) {
  const value = asString(formData.get(field));
  if (value.length > maxLength) {
    throw new Error(`${field} must be ${maxLength.toLocaleString()} characters or fewer.`);
  }
  return value;
}

function parseSports(formData: FormData) {
  return Array.from(new Set(formData.getAll("sports").map((value) => value.toString()))).filter((sport) => guideSportValues.has(sport));
}

function parseCertifications(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\r\n,]+/)
        .map((item) => sanitizeText(item, { maxLength: 200 }))
        .filter(Boolean),
    ),
  ).map((title) => ({ title }));
}

function readGuideFields(formData: FormData) {
  const photos = parseGuideMediaUrls(formData, "images");
  const videos = parseGuideMediaUrls(formData, "videos");
  // Keep `photo` as the primary image for backwards-compatible consumers
  // (e.g. the community roster) while `photos` powers the public profile.
  const photo = photos[0] ?? null;

  return {
    name: sanitizeText(readBoundedText(formData, "name", 120), { maxLength: 120 }),
    bio: sanitizeText(readBoundedText(formData, "bio", 3000), { maxLength: 3000, allowNewlines: true }),
    photo,
    photos,
    videos,
    mediaOrder: normalizeMediaOrder(photos, videos, parseMediaList(formData.getAll("mediaOrder"))),
    location: sanitizeText(readBoundedText(formData, "location", 200), { maxLength: 200 }),
    experienceYears: parseExperienceYears(asString(formData.get("experienceYears"))),
    languages: parseLanguages(readBoundedText(formData, "languages", MAX_GUIDE_LANGUAGES_INPUT_CHARS)),
    sports: parseSports(formData),
    certifications: parseCertifications(
      readBoundedText(formData, "certifications", MAX_GUIDE_CERTIFICATIONS_INPUT_CHARS),
    ),
  };
}

/** Authoritative, parallel size/type validation of guide media. */
async function assertValidGuideMedia(photos: string[], videos: string[]) {
  await Promise.all([
    assertValidStoredMedia("images", photos),
    assertValidStoredMedia("videos", videos),
  ]);
}

function validateGuideFields(fields: ReturnType<typeof readGuideFields>) {
  if (!fields.name || !fields.bio || !fields.location) {
    throw new Error("Name, bio, and location are required.");
  }

  if (fields.experienceYears < 0) {
    throw new Error("Experience years cannot be negative.");
  }

  if (
    fields.photos.length > MEDIA_LIMITS.guide.images ||
    fields.videos.length > MEDIA_LIMITS.guide.videos
  ) {
    throw new Error(
      `Guides can have at most ${MEDIA_LIMITS.guide.images} photos and ${MEDIA_LIMITS.guide.videos} videos.`,
    );
  }

  if (fields.languages.length > MAX_GUIDE_LANGUAGES) {
    throw new Error(`Guides can list at most ${MAX_GUIDE_LANGUAGES} languages.`);
  }

  if (fields.certifications.length > MAX_GUIDE_CERTIFICATIONS) {
    throw new Error(`Guides can list at most ${MAX_GUIDE_CERTIFICATIONS} certifications.`);
  }

  return fields;
}

function revalidateGuidePages(...usernames: string[]) {
  revalidatePath("/admin/guides");
  revalidatePath("/community");
  revalidatePath("/");
  updateTag("guides");

  for (const username of usernames) {
    if (username) {
      revalidatePath(`/${username}`);
    }
  }
}

function isUniqueConstraint(error: unknown) {
  return error instanceof Error && error.message.includes("Unique constraint failed");
}

function changedValues(before: object, after: object) {
  const previous = before as Record<string, unknown>;
  const next = after as Record<string, unknown>;
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  for (const [field, value] of Object.entries(next)) {
    if (JSON.stringify(previous[field]) !== JSON.stringify(value)) {
      changes[field] = { from: previous[field], to: value };
    }
  }

  return changes;
}

export async function createGuideAction(formData: FormData) {
  await requirePermission("guides.manage", "/login?callbackUrl=/admin/guides");

  const fields = validateGuideFields(readGuideFields(formData));
  const { certifications, ...guideData } = fields;
  await assertValidGuideMedia(fields.photos, fields.videos);

  // Guides are accounts, so creating a guide requires linking an existing
  // Radikal account and giving it a unique public username (its URL handle).
  const email = asString(formData.get("email")).trim().toLowerCase();
  const username = normalizeUsername(asString(formData.get("username")));

  if (!email) {
    throw new Error("A guide must be linked to an account. Enter the account email.");
  }

  if (!username) {
    throw new Error("Username is required — it becomes the guide's public URL.");
  }

  if (!isValidUsername(username)) {
    throw new Error("Username must be 3–30 lowercase letters or numbers, with single -, _, or . separators.");
  }

  const linkedUser = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: { id: true, email: true, name: true, username: true },
  });

  if (!linkedUser) {
    throw new Error("No account found with this email.");
  }

  const alreadyLinked = await prisma.guide.findUnique({
    where: { userId: linkedUser.id },
    select: { id: true, deletedAt: true },
  });
  if (alreadyLinked && !alreadyLinked.deletedAt) {
    throw new Error("This account is already linked to a guide.");
  }
  if (alreadyLinked?.deletedAt) {
    throw new Error("This account has a removed guide profile. Restore or update that profile instead of creating a duplicate.");
  }

  if (linkedUser.username !== username) {
    const usernameTaken = await prisma.user.findFirst({
      where: { username, deletedAt: null },
      select: { id: true },
    });
    if (usernameTaken) {
      throw new Error("This username is already taken. Please choose a different username.");
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.guide.create({
        data: {
          ...guideData,
          userId: linkedUser.id,
          certifications: { create: certifications },
        },
      });

      // The handle is now live, so retire any alias that still points to it.
      await tx.usernameAlias.deleteMany({ where: { username } });

      await tx.user.update({
        where: { id: linkedUser.id },
        data: { username, role: "GUIDE" },
      });
    });
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw new Error("This username is already taken. Please choose a different username.");
    }
    throw error;
  }

  revalidateGuidePages(username);

  // The linked account was promoted to GUIDE — make the new role visible to
  // their existing session immediately instead of on next login.
  invalidateSessionVersion(linkedUser.id);

  // Notify the newly added guide in the background — never block the action.
  sendEmailAfter(
    guideWelcomeEmail({ to: linkedUser.email, name: linkedUser.name }),
  );
}

export async function updateGuideAction(formData: FormData) {
  const session = await requirePermission("guides.manage", "/login?callbackUrl=/admin/guides");

  const guideId = asString(formData.get("guideId"));
  const fields = validateGuideFields(readGuideFields(formData));
  const { certifications, ...guideData } = fields;
  await assertValidGuideMedia(fields.photos, fields.videos);
  const activityContext = await getActivityLogContext();

  if (!guideId) {
    throw new Error("Missing guide id.");
  }

  let username = "";

  try {
    await prisma.$transaction(async (tx) => {
      const currentGuide = await tx.guide.findUnique({
        where: { id: guideId },
        select: {
          userId: true,
          deletedAt: true,
          name: true,
          bio: true,
          photo: true,
          photos: true,
          videos: true,
          mediaOrder: true,
          location: true,
          experienceYears: true,
          languages: true,
          sports: true,
          user: { select: { username: true } },
          certifications: { select: { title: true }, orderBy: { createdAt: "asc" } },
        },
      });

      if (!currentGuide || currentGuide.deletedAt) {
        throw new Error("Guide not found.");
      }

      username = currentGuide.user.username ?? "";

      const changes = changedValues(
        {
          name: currentGuide.name,
          bio: currentGuide.bio,
          photo: currentGuide.photo,
          photos: currentGuide.photos,
          videos: currentGuide.videos,
          mediaOrder: currentGuide.mediaOrder,
          location: currentGuide.location,
          experienceYears: currentGuide.experienceYears,
          languages: currentGuide.languages,
          sports: currentGuide.sports,
          certifications: currentGuide.certifications.map((certification) => certification.title),
        },
        {
          ...guideData,
          certifications: certifications.map((certification) => certification.title),
        },
      );

      await tx.guide.update({
        where: { id: guideId },
        data: guideData,
      });

      // Replace the certification list wholesale so edits stay in sync.
      await tx.certification.deleteMany({ where: { guideId } });
      if (certifications.length > 0) {
        await tx.certification.createMany({
          data: certifications.map((cert) => ({ guideId, ...cert })),
        });
      }

      if (Object.keys(changes).length > 0) {
        await logActivityInTransaction(
          tx,
          {
            userId: session.user.id,
            action: "GUIDE_PROFILE_UPDATED",
            label: "Updated a guide profile",
            metadata: { guideId, guideUserId: currentGuide.userId, changes },
          },
          activityContext,
        );
      }
    });
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw new Error("A guide with this username already exists. Please choose a different username.");
    }
    throw error;
  }

  revalidateGuidePages(username);
}

/**
 * Self-service profile editing. The guide id is deliberately resolved from the
 * active session so a guide can never update another guide's public profile.
 */
export async function updateOwnGuideProfileAction(formData: FormData) {
  const { guide, userId } = await requireGuideAction();
  const updateLimit = rateLimit(`guide-profile-update:user:${userId}`, 20, 60 * 60_000);
  if (!updateLimit.success) {
    throw new Error(rateLimitError(updateLimit));
  }
  const fields = validateGuideFields(readGuideFields(formData));
  const { certifications, ...guideData } = fields;
  await assertValidGuideMedia(fields.photos, fields.videos);
  const activityContext = await getActivityLogContext();

  let username = "";

  await prisma.$transaction(async (tx) => {
    const currentGuide = await tx.guide.findFirst({
      where: {
        id: guide.id,
        userId: guide.userId,
        deletedAt: null,
        user: { deletedAt: null, role: "GUIDE" },
      },
      select: {
        name: true,
        bio: true,
        photo: true,
        photos: true,
        videos: true,
        mediaOrder: true,
        location: true,
        experienceYears: true,
        languages: true,
        sports: true,
        user: { select: { username: true } },
        certifications: { select: { title: true }, orderBy: { createdAt: "asc" } },
      },
    });

    if (!currentGuide) {
      throw new Error("Your guide profile is no longer active.");
    }

    username = currentGuide.user.username ?? "";

    const changes = changedValues(
      {
        name: currentGuide.name,
        bio: currentGuide.bio,
        photo: currentGuide.photo,
        photos: currentGuide.photos,
        videos: currentGuide.videos,
        mediaOrder: currentGuide.mediaOrder,
        location: currentGuide.location,
        experienceYears: currentGuide.experienceYears,
        languages: currentGuide.languages,
        sports: currentGuide.sports,
        certifications: currentGuide.certifications.map((certification) => certification.title),
      },
      {
        ...guideData,
        certifications: certifications.map((certification) => certification.title),
      },
    );

    await tx.guide.update({
      where: { id: guide.id },
      data: guideData,
    });

    // Replace the certification list wholesale so removed credentials do not
    // remain published on the public profile.
    await tx.certification.deleteMany({ where: { guideId: guide.id } });
    if (certifications.length > 0) {
      await tx.certification.createMany({
        data: certifications.map((cert) => ({ guideId: guide.id, ...cert })),
      });
    }

    if (Object.keys(changes).length > 0) {
      await logActivityInTransaction(
        tx,
        {
          userId,
          action: "GUIDE_PROFILE_UPDATED",
          label: "Updated guide profile",
          metadata: { guideId: guide.id, changes },
        },
        activityContext,
      );
    }
  });

  revalidateGuidePages(username);
  revalidatePath("/guide-board/profile");
}

export async function deleteGuideAction(guideId: string) {
  const session = await requirePermission("guides.manage", "/login?callbackUrl=/admin/guides");

  if (!guideId) {
    throw new Error("Missing guide id.");
  }

  const guide = await prisma.guide.findUnique({
    where: { id: guideId },
    select: {
      id: true,
      userId: true,
      deletedAt: true,
      photos: true,
      videos: true,
      user: { select: { username: true, role: true } },
    },
  });

  if (!guide || guide.deletedAt) {
    throw new Error("Guide not found.");
  }

  const username = guide.user.username ?? "";
  const activityContext = await getActivityLogContext();

  // The teardown unlinks the guide's trips but leaves them live and bookable,
  // so refuse to remove the guide while any of their trips has an active
  // booking — the admin must cancel the bookings or reassign the trips first.
  const activeBookings = await prisma.booking.count({
    where: {
        trip: { guideId: guide.id, deletedAt: null },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
  });
  if (activeBookings > 0) {
    throw new Error(
      "This guide's trips have active bookings. Cancel the bookings or reassign the trips before removing the guide.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await deactivateGuide(tx, guide.id);

    // A user cannot hold the GUIDE role without a linked guide profile — that
    // state redirects them from the guide board while blocking re-application.
    // Reset the role so the account returns to a usable traveller account.
    if (guide.user.role === "GUIDE") {
      await tx.user.update({
        where: { id: guide.userId },
        data: { role: "USER" },
      });
    }

    await logActivityInTransaction(
      tx,
      {
        userId: session.user.id,
        action: "GUIDE_PROFILE_REMOVED",
        label: "Removed a guide profile",
        metadata: { guideId: guide.id, guideUserId: guide.userId, roleReset: guide.user.role === "GUIDE" },
      },
      activityContext,
    );
  });

  // The user was demoted from GUIDE to USER — make the new role visible to
  // their existing session immediately (hides the guide board, etc.).
  invalidateSessionVersion(guide.userId);

  // Storage objects are not cascaded by the DB delete — remove the guide's
  // media best-effort after the transaction commits.
  await removeStoredMedia([...(guide.photos ?? []), ...(guide.videos ?? [])]);

  revalidateGuidePages(username);
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${guide.userId}`);
}
