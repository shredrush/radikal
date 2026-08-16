"use server";

import { revalidatePath, updateTag } from "next/cache";

import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/authz";
import {
  guideApplicationDecisionEmail,
  guideApplicationReceivedEmail,
  sendEmailAfter,
} from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { isSafeHttpUrl, isValidUsername, sanitizeText } from "@/lib/sanitize";

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

// Social links are optional, but when present they must be safe http(s) URLs.
function parseSocialUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isSafeHttpUrl(trimmed) ? trimmed : null;
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

function readApplicationFields(formData: FormData) {
  const photos = ["photo1", "photo2", "photo3"]
    .map((key) => {
      const raw = asString(formData.get(key));
      return raw && isSafeHttpUrl(raw) ? raw : null;
    })
    .filter((value): value is string => value !== null);

  return {
    name: sanitizeText(asString(formData.get("name")), { maxLength: 120 }),
    phone: sanitizeText(asString(formData.get("phone")), { maxLength: 40 }),
    location: sanitizeText(asString(formData.get("location")), { maxLength: 200 }),
    bio: sanitizeText(asString(formData.get("bio")), { maxLength: 3000, allowNewlines: true }),
    experienceYears: parseExperienceYears(asString(formData.get("experienceYears"))),
    languages: parseLanguages(asString(formData.get("languages"))),
    certifications: parseCertifications(asString(formData.get("certifications"))),
    photo: photos[0] ?? null,
    photos,
    instagramUrl: parseSocialUrl(asString(formData.get("instagramUrl"))),
    facebookUrl: parseSocialUrl(asString(formData.get("facebookUrl"))),
    youtubeUrl: parseSocialUrl(asString(formData.get("youtubeUrl"))),
    websiteUrl: parseSocialUrl(asString(formData.get("websiteUrl"))),
  };
}

export type GuideApplicationState = {
  error?: string;
  success?: boolean;
};

export async function submitGuideApplicationAction(
  _prevState: GuideApplicationState,
  formData: FormData,
): Promise<GuideApplicationState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be logged in to apply. Please log in and try again." };
  }

  if (session.user.role === "GUIDE") {
    return { error: "Your account is already registered as a guide." };
  }

  const fields = readApplicationFields(formData);

  if (!fields.name || !fields.location || !fields.bio) {
    return { error: "Name, location, and a short bio are required." };
  }

  if (fields.languages.length === 0) {
    return { error: "Add at least one language you speak." };
  }

  if (fields.experienceYears < 0) {
    return { error: "Experience years cannot be negative." };
  }

  const existing = await prisma.guideApplication.findFirst({
    where: { userId: session.user.id, status: "PENDING" },
    select: { id: true },
  });
  if (existing) {
    return { error: "You already have an application under review." };
  }

  const { certifications, ...applicationData } = fields;

  await prisma.guideApplication.create({
    data: {
      ...applicationData,
      userId: session.user.id,
      certifications: { create: certifications },
    },
  });

  // Acknowledge receipt in the background — never block submission on email.
  sendEmailAfter(
    guideApplicationReceivedEmail({
      to: session.user.email ?? "",
      name: session.user.name ?? fields.name,
    }),
  );

  revalidatePath("/become-a-guide");
  revalidatePath("/admin/guide-registrations");

  return { success: true };
}

/** Turn a guide's display name into a URL-safe, valid guide slug. */
function slugifyGuideName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/^-+|-+$/g, "");
}

/**
 * Produce a guide slug that is unique and passes the same rules the admin guide
 * form enforces. Falls back to a random suffix when the base is invalid, taken,
 * or reserved.
 */
async function uniqueGuideSlug(name: string): Promise<string> {
  const base = slugifyGuideName(name) || "guide";
  let slug = isValidUsername(base) ? base : `${base.slice(0, 24)}-${Math.random().toString(36).slice(2, 6)}`;
  let attempts = 0;

  while (attempts < 25) {
    if (isValidUsername(slug)) {
      const taken = await prisma.guide.findUnique({ where: { slug }, select: { id: true } });
      if (!taken) return slug;
    }
    slug = `${base.slice(0, 24)}-${Math.random().toString(36).slice(2, 6)}`;
    attempts += 1;
  }

  return `${base.slice(0, 20)}-${Date.now().toString(36)}`;
}

export async function approveGuideApplicationAction(applicationId: string) {
  const session = await requireAdmin("/login?callbackUrl=/admin/guide-registrations");

  if (!applicationId) {
    throw new Error("Missing application id.");
  }

  const application = await prisma.guideApplication.findUnique({
    where: { id: applicationId },
    include: {
      certifications: true,
      user: { select: { email: true, name: true } },
    },
  });

  if (!application) {
    throw new Error("Application not found.");
  }

  if (application.status !== "PENDING") {
    throw new Error("This application has already been reviewed.");
  }

  const slug = await uniqueGuideSlug(application.name);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.guide.create({
        data: {
          userId: application.userId,
          name: application.name,
          slug,
          bio: application.bio,
          photo: application.photo,
          photos: application.photos,
          location: application.location,
          experienceYears: application.experienceYears,
          languages: application.languages,
          instagramUrl: application.instagramUrl,
          facebookUrl: application.facebookUrl,
          youtubeUrl: application.youtubeUrl,
          websiteUrl: application.websiteUrl,
          certifications: {
            create: application.certifications.map((cert) => ({
              title: cert.title,
              issuingBody: cert.issuingBody,
              yearIssued: cert.yearIssued,
              credentialUrl: cert.credentialUrl,
            })),
          },
        },
      });

      await tx.user.update({
        where: { id: application.userId },
        data: { role: "GUIDE" },
      });

      await tx.guideApplication.update({
        where: { id: applicationId },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedById: session.user.id,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint failed")) {
      throw new Error("Could not approve: this user is already linked to a guide account.");
    }
    throw error;
  }

  revalidatePath("/admin/guide-registrations");
  revalidatePath("/become-a-guide");
  revalidatePath("/community");
  revalidatePath("/");
  revalidatePath(`/${slug}`);
  updateTag("guides");

  sendEmailAfter(
    guideApplicationDecisionEmail({
      to: application.user.email,
      name: application.user.name,
      approved: true,
    }),
  );
}

export async function rejectGuideApplicationAction(applicationId: string) {
  const session = await requireAdmin("/login?callbackUrl=/admin/guide-registrations");

  if (!applicationId) {
    throw new Error("Missing application id.");
  }

  const application = await prisma.guideApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      status: true,
      user: { select: { email: true, name: true } },
    },
  });

  if (!application) {
    throw new Error("Application not found.");
  }

  if (application.status !== "PENDING") {
    throw new Error("This application has already been reviewed.");
  }

  await prisma.guideApplication.update({
    where: { id: applicationId },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedById: session.user.id,
    },
  });

  revalidatePath("/admin/guide-registrations");
  revalidatePath("/become-a-guide");

  sendEmailAfter(
    guideApplicationDecisionEmail({
      to: application.user.email,
      name: application.user.name,
      approved: false,
    }),
  );
}
