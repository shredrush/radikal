"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function asString(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

// Languages can be entered as a comma- or newline-separated list.
function parseLanguages(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\r\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function parseExperienceYears(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
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
      return {
        title: title ?? "",
        issuingBody: issuingBody ?? "",
        yearIssued: parsedYear !== null && !Number.isNaN(parsedYear) ? parsedYear : null,
        credentialUrl: url || null,
      };
    })
    .filter((cert) => cert.title && cert.issuingBody);
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login?callbackUrl=/admin/guides");
  }
}

function readGuideFields(formData: FormData) {
  return {
    name: asString(formData.get("name")),
    slug: asString(formData.get("slug")),
    bio: asString(formData.get("bio")),
    photo: asString(formData.get("photo")) || null,
    location: asString(formData.get("location")),
    experienceYears: parseExperienceYears(asString(formData.get("experienceYears"))),
    languages: parseLanguages(asString(formData.get("languages"))),
    certifications: parseCertifications(asString(formData.get("certifications"))),
  };
}

function validateGuideFields(fields: ReturnType<typeof readGuideFields>) {
  if (!fields.name || !fields.slug || !fields.bio || !fields.location) {
    throw new Error("Name, slug, bio, and location are required.");
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
  await requireAdmin();

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
  await requireAdmin();

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
  await requireAdmin();

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
