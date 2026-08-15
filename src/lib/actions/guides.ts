"use server";

import { revalidatePath, updateTag } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { isValidUsername, isSafeHttpUrl, sanitizeText } from "@/lib/sanitize";

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
  const photos = ["photo1", "photo2", "photo3"]
    .map((key) => {
      const raw = asString(formData.get(key));
      return raw && isSafeHttpUrl(raw) ? raw : null;
    })
    .filter((value): value is string => value !== null);
  // Keep `photo` as the primary image for backwards-compatible consumers
  // (e.g. the community roster) while `photos` powers the public profile.
  const photo = photos[0] ?? null;

  return {
    name: sanitizeText(asString(formData.get("name")), { maxLength: 120 }),
    slug: sanitizeText(asString(formData.get("slug")), { maxLength: 120 }).toLowerCase(),
    bio: sanitizeText(asString(formData.get("bio")), { maxLength: 3000, allowNewlines: true }),
    photo,
    photos,
    location: sanitizeText(asString(formData.get("location")), { maxLength: 200 }),
    experienceYears: parseExperienceYears(asString(formData.get("experienceYears"))),
    languages: parseLanguages(asString(formData.get("languages"))),
    certifications: parseCertifications(asString(formData.get("certifications"))),
  };
}

function validateGuideFields(fields: ReturnType<typeof readGuideFields>) {
  if (!fields.name || !fields.slug || !fields.bio || !fields.location) {
    throw new Error("Name, slug, bio, and location are required.");
  }

  if (!isValidUsername(fields.slug)) {
    throw new Error("Slug must be 3–30 lowercase letters or numbers, with single -, _, or . separators.");
  }

  if (fields.experienceYears < 0) {
    throw new Error("Experience years cannot be negative.");
  }

  return fields;
}

function revalidateGuidePages(...slugs: string[]) {
  revalidatePath("/admin/guides");
  revalidatePath("/community");
  revalidatePath("/");
  updateTag("guides");

  for (const slug of slugs) {
    if (slug) {
      revalidatePath(`/${slug}`);
    }
  }
}

function isUniqueConstraint(error: unknown) {
  return error instanceof Error && error.message.includes("Unique constraint failed");
}

export async function createGuideAction(formData: FormData) {
  await requireAdmin("/login?callbackUrl=/admin/guides");

  const fields = validateGuideFields(readGuideFields(formData));
  const { certifications, ...guideData } = fields;

  try {
    await prisma.guide.create({
      data: {
        ...guideData,
        certifications: { create: certifications },
      },
    });
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw new Error("A guide with this slug already exists. Please choose a different slug.");
    }
    throw error;
  }

  revalidateGuidePages(fields.slug);
}

export async function updateGuideAction(formData: FormData) {
  await requireAdmin("/login?callbackUrl=/admin/guides");

  const guideId = asString(formData.get("guideId"));
  const fields = validateGuideFields(readGuideFields(formData));
  const { certifications, ...guideData } = fields;

  if (!guideId) {
    throw new Error("Missing guide id.");
  }

  let previousSlug = "";

  try {
    await prisma.$transaction(async (tx) => {
      const currentGuide = await tx.guide.findUnique({
        where: { id: guideId },
        select: { slug: true },
      });

      if (!currentGuide) {
        throw new Error("Guide not found.");
      }

      previousSlug = currentGuide.slug;

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
      throw new Error("A guide with this slug already exists. Please choose a different slug.");
    }
    throw error;
  }

  revalidateGuidePages(previousSlug, fields.slug);
}

export async function deleteGuideAction(guideId: string) {
  await requireAdmin("/login?callbackUrl=/admin/guides");

  if (!guideId) {
    throw new Error("Missing guide id.");
  }

  const guide = await prisma.guide.findUnique({
    where: { id: guideId },
    select: { slug: true },
  });

  if (!guide) {
    throw new Error("Guide not found.");
  }

  await prisma.$transaction(async (tx) => {
    // Unlink this guide from its trips and reviews before removing the row,
    // since those relations do not cascade on delete.
    await tx.activity.updateMany({ where: { guideId }, data: { guideId: null } });
    await tx.review.updateMany({ where: { guideId }, data: { guideId: null } });
    await tx.guide.delete({ where: { id: guideId } });
  });

  revalidateGuidePages(guide.slug);
}
