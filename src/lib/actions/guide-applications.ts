"use server";

import { revalidatePath, updateTag } from "next/cache";

import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/authz";
import {
  guideApplicationAdminEmail,
  guideApplicationDecisionEmail,
  guideApplicationReceivedEmail,
  sendEmailAfter,
} from "@/lib/email";
import {
  createGuestAccount,
  validateGuestAccount,
  type GuestAccountInput,
} from "@/lib/guest-account";
import { notifyGuideApplicationStaff, notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getActivityLogContext, logActivity, logActivityInTransaction } from "@/lib/activity-log";
import { invalidateSessionVersion } from "@/lib/session-revocation";
import { isSafeHttpUrl, isValidUsername, normalizeUsername, sanitizeText } from "@/lib/sanitize";
import { MEDIA_LIMITS } from "@/lib/media-constants";
import {
  assertValidStoredMedia,
  parseGuideMediaUrls,
} from "@/lib/media";
import { normalizeMediaOrder } from "@/lib/media-order";
import { parseMediaList } from "@/lib/trip-fields";
import { generateAvailableUsername } from "@/lib/available-username";
import { passwordSchema } from "@/lib/validations/auth";

const MAX_GUIDE_LANGUAGES = 20;
const MAX_GUIDE_CERTIFICATIONS = 25;
const MAX_GUIDE_LANGUAGES_INPUT_CHARS = 1700;
const MAX_GUIDE_CERTIFICATIONS_INPUT_CHARS = 5100;
const MAX_SOCIAL_URL_LENGTH = 2048;

class GuideSubmissionError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

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

function readApplicationFields(formData: FormData) {
  const photos = parseGuideMediaUrls(formData, "images");
  const videos = parseGuideMediaUrls(formData, "videos");

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
    videos,
    mediaOrder: normalizeMediaOrder(photos, videos, parseMediaList(formData.getAll("mediaOrder"))),
    instagramUrl: parseSocialUrl(asString(formData.get("instagramUrl"))),
    facebookUrl: parseSocialUrl(asString(formData.get("facebookUrl"))),
    youtubeUrl: parseSocialUrl(asString(formData.get("youtubeUrl"))),
    websiteUrl: parseSocialUrl(asString(formData.get("websiteUrl"))),
  };
}

function validateInputLengths(formData: FormData) {
  const limits = {
    name: 120,
    phone: 40,
    location: 200,
    bio: 3000,
    languages: MAX_GUIDE_LANGUAGES_INPUT_CHARS,
    certifications: MAX_GUIDE_CERTIFICATIONS_INPUT_CHARS,
    instagramUrl: MAX_SOCIAL_URL_LENGTH,
    facebookUrl: MAX_SOCIAL_URL_LENGTH,
    youtubeUrl: MAX_SOCIAL_URL_LENGTH,
    websiteUrl: MAX_SOCIAL_URL_LENGTH,
  };

  return Object.fromEntries(
    Object.entries(limits).flatMap(([name, maxLength]) =>
      asString(formData.get(name)).length > maxLength
        ? [[name, `Use ${maxLength.toLocaleString()} characters or fewer.`]]
        : [],
    ),
  );
}

export type GuideApplicationState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

export async function submitGuideApplicationAction(
  _prevState: GuideApplicationState,
  formData: FormData,
): Promise<GuideApplicationState> {
  const session = await auth();
  if (session?.user?.role === "GUIDE") {
    return { error: "Your account is already registered as a guide." };
  }

  const fields = readApplicationFields(formData);
  const lengthErrors = validateInputLengths(formData);
  if (Object.keys(lengthErrors).length > 0) {
    return { error: "Correct the highlighted fields below.", fieldErrors: lengthErrors };
  }

  const fieldErrors: Record<string, string> = {};
  if (!fields.name) fieldErrors.name = "Full name is required.";
  if (!fields.phone) fieldErrors.phone = "Phone is required.";
  if (!fields.location) fieldErrors.location = "Location is required.";
  if (!asString(formData.get("experienceYears"))) fieldErrors.experienceYears = "Experience is required.";
  if (!fields.bio) fieldErrors.bio = "About you is required.";
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Complete the required fields below.", fieldErrors };
  }

  const password = formData.get("password")?.toString() ?? "";
  if (!session?.user) {
    const parsedPassword = passwordSchema.safeParse(password);
    if (!parsedPassword.success) {
      return {
        error: "Correct the highlighted fields below.",
        fieldErrors: { password: parsedPassword.error.issues[0]?.message ?? "Enter a valid password." },
      };
    }
  }

  if (!/^\+\d{7,15}$/.test(fields.phone)) {
    return {
      error: "Correct the required fields below.",
      fieldErrors: { phone: "Enter a valid phone number with country code." },
    };
  }

  const experienceInput = asString(formData.get("experienceYears"));
  if (!/^\d+$/.test(experienceInput) || Number(experienceInput) < 1 || Number(experienceInput) > 100) {
    return {
      error: "Correct the required fields below.",
      fieldErrors: { experienceYears: "Enter experience as a whole number from 0 to 100." },
    };
  }

  if (fields.languages.length === 0) {
    return {
      error: "Complete the required fields below.",
      fieldErrors: { languages: "Add at least one language you speak." },
    };
  }

  if (fields.languages.length > MAX_GUIDE_LANGUAGES) {
    return {
      error: "Correct the highlighted fields below.",
      fieldErrors: { languages: `List at most ${MAX_GUIDE_LANGUAGES} languages.` },
    };
  }

  if (fields.certifications.length > MAX_GUIDE_CERTIFICATIONS) {
    return {
      error: "Correct the highlighted fields below.",
      fieldErrors: { certifications: `List at most ${MAX_GUIDE_CERTIFICATIONS} certifications.` },
    };
  }

  const invalidSocialLinks = Object.fromEntries(
    ["instagramUrl", "facebookUrl", "youtubeUrl", "websiteUrl"].flatMap((name) => {
      const value = asString(formData.get(name));
      return value && !isSafeHttpUrl(value) ? [[name, "Enter a valid http(s) URL."]] : [];
    }),
  );
  if (Object.keys(invalidSocialLinks).length > 0) {
    return { error: "Correct the highlighted links below.", fieldErrors: invalidSocialLinks };
  }

  if (fields.experienceYears < 0) {
    return { error: "Experience years cannot be negative." };
  }

  if (
    fields.photos.length > MEDIA_LIMITS.guide.images ||
    fields.videos.length > MEDIA_LIMITS.guide.videos
  ) {
    return {
      error: `Applications can include at most ${MEDIA_LIMITS.guide.images} photos and ${MEDIA_LIMITS.guide.videos} videos.`,
    };
  }

  try {
    await Promise.all([
      assertValidStoredMedia("images", fields.photos),
      assertValidStoredMedia("videos", fields.videos),
    ]);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Media could not be validated." };
  }

  const requestedUsername = normalizeUsername(asString(formData.get("username")));
  if (requestedUsername && !isValidUsername(requestedUsername)) {
    return {
      error: "Username must be 3–30 lowercase letters or numbers, with single -, _, or . separators.",
      fieldErrors: { username: "Use 3–30 lowercase letters or numbers." },
    };
  }

  if (requestedUsername) {
    const usernameTaken = await prisma.user.findFirst({
      where: {
        username: requestedUsername,
        deletedAt: null,
        ...(session?.user?.id ? { id: { not: session.user.id } } : {}),
      },
      select: { id: true },
    });
    if (usernameTaken) {
      return { error: "This username is already taken.", fieldErrors: { username: "This username is already taken." } };
    }
  }

  let guestAccountData: GuestAccountInput | null = null;
  if (!session?.user?.id) {
    const account = validateGuestAccount({
      name: fields.name,
      email: asString(formData.get("email")),
      phone: fields.phone,
      password,
    });
    if (!account.success) return { error: account.error, fieldErrors: account.fieldErrors };
    guestAccountData = account.data;
  }

  const { certifications, ...applicationData } = fields;
  const guestActivityContext = guestAccountData ? await getActivityLogContext() : null;
  let submission: { userId: string; accountEmail: string; resolvedUsername: string };

  try {
    submission = await prisma.$transaction(async (tx) => {
      let userId = session?.user?.id;
      let accountEmail = session?.user?.email ?? "";
      if (!userId) {
        const account = await createGuestAccount(guestAccountData!, tx);
        if (!account.success) {
          throw new GuideSubmissionError(account.error, account.fieldErrors);
        }
        userId = account.user.id;
        accountEmail = account.user.email;
        if (guestActivityContext) {
          await logActivityInTransaction(tx, {
            userId,
            action: "ACCOUNT_CREATED",
            label: "Account created from a guide application",
            metadata: { email: accountEmail, source: "guide_application" },
          }, guestActivityContext);
        }
      }

      const existingUser = await tx.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: { username: true },
      });
      if (!existingUser) throw new GuideSubmissionError("Account not found.");

      const existing = await tx.guideApplication.findFirst({
        where: { userId, status: "PENDING" },
        select: { id: true },
      });
      if (existing) throw new GuideSubmissionError("You already have an application under review.");

      // Every guide needs a public URL, so an available handle is generated when
      // the applicant leaves this optional field blank.
      const resolvedUsername = requestedUsername ?? existingUser.username ?? await generateAvailableUsername("guide", tx);
      if (existingUser.username !== resolvedUsername) {
        const usernameTaken = await tx.user.findFirst({
          where: { username: resolvedUsername, id: { not: userId } },
          select: { id: true },
        });
        if (usernameTaken) {
          throw new GuideSubmissionError("This username is already taken.", { username: "This username is already taken." });
        }
      }

      // The handle is now live, so retire any alias that still points to it.
      await tx.usernameAlias.deleteMany({ where: { username: resolvedUsername } });

      await tx.user.update({
        where: { id: userId },
        data: { username: resolvedUsername },
      });

      await tx.guideApplication.create({
        data: {
          ...applicationData,
          userId,
          certifications: { create: certifications },
        },
      });
      return { userId, accountEmail, resolvedUsername };
    });
  } catch (error) {
    if (error instanceof GuideSubmissionError) {
      return { error: error.message, fieldErrors: error.fieldErrors };
    }
    if (error instanceof Error && error.message.includes("Unique constraint failed")) {
      return { error: "Your application could not be submitted. Please try again." };
    }
    throw error;
  }

  await logActivity({
    userId: submission.userId,
    action: "GUIDE_APPLICATION_SUBMITTED",
    label: "Submitted a guide application",
  });

  // Acknowledge receipt in the background — never block submission on email.
  await sendEmailAfter(
    guideApplicationReceivedEmail({
      to: submission.accountEmail,
      name: session?.user?.name ?? fields.name,
    }),
  );

  // Let the applicant know in-app that their application is under review.
  try {
    await notifyUser(submission.userId, {
      type: "GUIDE_APPLICATION_SUBMITTED",
      title: "Application under review",
      body: "Your guide application is under review. We'll email you once a decision is made.",
      href: "/become-a-guide",
    });
  } catch (error) {
    console.error("[guide-application] failed to notify applicant", error);
  }

  // Tell the staff who review applications — in-app and by email — so a new
  // submission never goes unnoticed. A notification/email failure must not
  // fail the submission itself.
  try {
    const staff = await notifyGuideApplicationStaff({
      type: "GUIDE_APPLICATION_NEW",
      title: "New guide application",
      body: `${fields.name} (@${submission.resolvedUsername}) applied to become a guide.`,
      href: "/admin/guides",
    });

    for (const user of staff) {
      await sendEmailAfter(
        guideApplicationAdminEmail({
          to: user.email,
          name: user.name ?? "",
          applicant: {
            name: fields.name,
            username: submission.resolvedUsername,
            location: fields.location,
            experienceYears: fields.experienceYears,
            languages: fields.languages,
            bio: fields.bio,
          },
        }),
      );
    }
  } catch (error) {
    console.error("[guide-application] failed to notify staff", error);
  }

  revalidatePath("/become-a-guide");
  revalidatePath("/admin/guides");

  return { success: true };
}

export async function approveGuideApplicationAction(applicationId: string) {
  const session = await requirePermission("guideApplications.manage", "/login?callbackUrl=/admin/guides");

  if (!applicationId) {
    throw new Error("Missing application id.");
  }

  const application = await prisma.guideApplication.findUnique({
    where: { id: applicationId },
    include: {
      certifications: { select: { title: true } },
      user: { select: { email: true, name: true, username: true } },
    },
  });

  if (!application) {
    throw new Error("Application not found.");
  }

  if (application.status !== "PENDING") {
    throw new Error("This application has already been reviewed.");
  }

  // The guide's public URL is the applicant's username, which is mandatory and
  // locked in at submission time.
  const username = application.user.username;

  if (!username) {
    throw new Error("This applicant has no username. Ask them to set one and resubmit.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.guide.create({
        data: {
          userId: application.userId,
          name: application.name,
          bio: application.bio,
          photo: application.photo,
          photos: application.photos,
          videos: application.videos,
          mediaOrder: application.mediaOrder,
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

  revalidatePath("/admin/guides");
  revalidatePath("/become-a-guide");
  revalidatePath("/community");
  revalidatePath("/");
  revalidatePath(`/${username}`);
  updateTag("guides");
  // The applicant's role just changed to GUIDE — clear the cached session
  // lookup so their next request (header, profile, guide board) sees the new
  // role without logging out and back in.
  invalidateSessionVersion(application.userId);

  await logActivity({
    userId: application.userId,
    action: "GUIDE_APPLICATION_APPROVED",
    label: "Guide application approved",
    metadata: { applicationId },
  });
  await logActivity({
    userId: application.userId,
    action: "USER_ROLE_CHANGED",
    label: "Role changed to GUIDE",
    metadata: { role: "GUIDE" },
  });

  await sendEmailAfter(
    guideApplicationDecisionEmail({
      to: application.user.email,
      name: application.user.name,
      approved: true,
    }),
  );
}

export async function rejectGuideApplicationAction(applicationId: string) {
  const session = await requirePermission("guideApplications.manage", "/login?callbackUrl=/admin/guides");

  if (!applicationId) {
    throw new Error("Missing application id.");
  }

  const application = await prisma.guideApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      userId: true,
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

  await logActivity({
    userId: application.userId,
    action: "GUIDE_APPLICATION_REJECTED",
    label: "Guide application rejected",
    metadata: { applicationId },
  });

  revalidatePath("/admin/guides");
  revalidatePath("/become-a-guide");

  await sendEmailAfter(
    guideApplicationDecisionEmail({
      to: application.user.email,
      name: application.user.name,
      approved: false,
    }),
  );
}

export async function getGuideApplicationsAction() {
  await requirePermission("guideApplications.manage", "/login?callbackUrl=/admin/guides");

  return prisma.guideApplication.findMany({
    orderBy: { submittedAt: "desc" },
    include: {
      user: { select: { id: true, name: true, username: true, email: true } },
      certifications: {
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true },
      },
      reviewedBy: { select: { name: true } },
    },
  });
}
