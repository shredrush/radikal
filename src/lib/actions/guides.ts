"use server";

import { revalidatePath, updateTag } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logActivity } from "@/lib/activity-log";
import { deactivateGuide } from "@/lib/guide-teardown";
import { guideWelcomeEmail, sendEmailAfter } from "@/lib/email";
import { isSafeHttpUrl, isValidUsername, normalizeUsername, sanitizeText } from "@/lib/sanitize";
import { MEDIA_LIMITS } from "@/lib/media-constants";
import {
  assertValidStoredMedia,
  parseGuideMediaUrls,
  removeStoredMedia,
} from "@/lib/media";
import { normalizeMediaOrder } from "@/lib/media-order";
import { parseMediaList } from "@/lib/trip-fields";

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

type CertificationInput = {
  title: string;
  issuingBody: string;
  yearIssued: number | null;
  credentialUrl: string | null;
};

// Each certification is one line, formatted as:
//   Title | Issuing body | Year | Credential URL
// The year and URL are optional; Title and issuing body are required.
function parseCertifications(value: string): CertificationInput[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, issuingBody, year, url] = line.split("|").map((part) => part.trim());
      const parsedYear = year ? Number.parseInt(year, 10) : null;
      const credentialUrl = url ? (isSafeHttpUrl(url) ? url : null) : null;
      return {
        title: title ? sanitizeText(title, { maxLength: 200 }) : "",
        issuingBody: issuingBody ? sanitizeText(issuingBody, { maxLength: 200 }) : "",
        yearIssued:
          parsedYear !== null && !Number.isNaN(parsedYear) && parsedYear >= 1900 && parsedYear <= 2100
            ? parsedYear
            : null,
        credentialUrl,
      };
    })
    .filter((cert) => cert.title && cert.issuingBody);
}

function readGuideFields(formData: FormData) {
  const photos = parseGuideMediaUrls(formData, "images");
  const videos = parseGuideMediaUrls(formData, "videos");
  // Keep `photo` as the primary image for backwards-compatible consumers
  // (e.g. the community roster) while `photos` powers the public profile.
  const photo = photos[0] ?? null;

  return {
    name: sanitizeText(asString(formData.get("name")), { maxLength: 120 }),
    bio: sanitizeText(asString(formData.get("bio")), { maxLength: 3000, allowNewlines: true }),
    photo,
    photos,
    videos,
    mediaOrder: normalizeMediaOrder(photos, videos, parseMediaList(formData.getAll("mediaOrder"))),
    location: sanitizeText(asString(formData.get("location")), { maxLength: 200 }),
    experienceYears: parseExperienceYears(asString(formData.get("experienceYears"))),
    languages: parseLanguages(asString(formData.get("languages"))),
    certifications: parseCertifications(asString(formData.get("certifications"))),
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

  // Notify the newly added guide in the background — never block the action.
  sendEmailAfter(
    guideWelcomeEmail({ to: linkedUser.email, name: linkedUser.name }),
  );
}

export async function updateGuideAction(formData: FormData) {
  await requirePermission("guides.manage", "/login?callbackUrl=/admin/guides");

  const guideId = asString(formData.get("guideId"));
  const fields = validateGuideFields(readGuideFields(formData));
  const { certifications, ...guideData } = fields;
  await assertValidGuideMedia(fields.photos, fields.videos);

  if (!guideId) {
    throw new Error("Missing guide id.");
  }

  let username = "";

  try {
    await prisma.$transaction(async (tx) => {
      const currentGuide = await tx.guide.findUnique({
        where: { id: guideId },
        select: { deletedAt: true, user: { select: { username: true } } },
      });

      if (!currentGuide || currentGuide.deletedAt) {
        throw new Error("Guide not found.");
      }

      username = currentGuide.user.username ?? "";

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
    });
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw new Error("A guide with this username already exists. Please choose a different username.");
    }
    throw error;
  }

  revalidateGuidePages(username);
}

export async function deleteGuideAction(guideId: string) {
  await requirePermission("guides.manage", "/login?callbackUrl=/admin/guides");

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
  });

  await logActivity({
    userId: guide.userId,
    action: "GUIDE_PROFILE_REMOVED",
    label: "Guide profile removed by an admin",
    metadata: { guideId: guide.id, roleReset: guide.user.role === "GUIDE" },
  });

  // Storage objects are not cascaded by the DB delete — remove the guide's
  // media best-effort after the transaction commits.
  await removeStoredMedia([...(guide.photos ?? []), ...(guide.videos ?? [])]);

  revalidateGuidePages(username);
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${guide.userId}`);
}
