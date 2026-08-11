"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const validTypes = ["TREK", "BIKE", "SNOWBOARD", "SKI", "ROCKCLIMB", "EXPEDITION", "YOGA"] as const;
const validCategories = [
  "ADVENTURE_ENTHUSIAST",
  "WOMEN_ONLY",
  "CORPORATE",
  "LUXURY",
  "FAMILY",
  "COURSE",
  "SELF_GUIDED",
  "BEGINNER_FRIENDLY",
] as const;

function asString(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

function parseImages(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function parseCategories(values: FormDataEntryValue[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.toString())
        .filter(
          (value): value is (typeof validCategories)[number] =>
            validCategories.includes(value as (typeof validCategories)[number]),
        ),
    ),
  );
}

function parseList(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

export async function updateActivityAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login?callbackUrl=/admin/trips");
  }

  const activityId = asString(formData.get("activityId"));
  const title = asString(formData.get("title"));
  const slug = asString(formData.get("slug"));
  const location = asString(formData.get("location"));
  const description = asString(formData.get("description"));
  const type = asString(formData.get("type"));
  const priceInRupees = Number.parseInt(asString(formData.get("priceInRupees")), 10);
  const durationDays = Number.parseInt(asString(formData.get("durationDays")), 10);
  const maxGroupSize = Number.parseInt(asString(formData.get("maxGroupSize")), 10);
  const guideId = asString(formData.get("guideId"));
  const images = parseImages(asString(formData.get("images")));
  const categories = parseCategories(formData.getAll("categories"));
  const pickup = asString(formData.get("pickup"));
  const drop = asString(formData.get("drop"));
  const inclusions = parseList(asString(formData.get("inclusions")));
  const exclusions = parseList(asString(formData.get("exclusions")));
  const highlights = parseList(asString(formData.get("highlights")));

  if (!activityId) {
    throw new Error("Missing activity id.");
  }

  if (!title || !slug || !location || !description) {
    throw new Error("Title, slug, location, and description are required.");
  }

  if (!validTypes.includes(type as (typeof validTypes)[number])) {
    throw new Error("Invalid activity type.");
  }

  if (Number.isNaN(priceInRupees) || Number.isNaN(durationDays) || Number.isNaN(maxGroupSize)) {
    throw new Error("One or more numeric fields are invalid.");
  }

  if (priceInRupees < 0 || durationDays < 1 || maxGroupSize < 1) {
    throw new Error("Price must be >= 0 and duration/group size must be at least 1.");
  }

  let previousSlug = "";

  try {
    await prisma.$transaction(async (tx) => {
      const currentActivity = await tx.activity.findUnique({
        where: { id: activityId },
        select: { slug: true },
      });

      if (!currentActivity) {
        throw new Error("Activity not found.");
      }

      previousSlug = currentActivity.slug;

      await tx.activity.update({
        where: { id: activityId },
        data: {
          title,
          slug,
          location,
          description,
          type: type as (typeof validTypes)[number],
          priceInRupees,
          durationDays,
          maxGroupSize,
          categories,
          images,
          guideId: guideId || null,
        },
      });

      // If both are blank, remove any existing location row to avoid stale values.
      if (pickup || drop) {
        await tx.tripLocation.upsert({
          where: { activityId },
          update: { pickup, drop },
          create: { activityId, pickup, drop },
        });
      } else {
        await tx.tripLocation.deleteMany({ where: { activityId } });
      }

      await tx.tripInclusion.deleteMany({ where: { activityId } });
      if (inclusions.length > 0 || exclusions.length > 0) {
        await tx.tripInclusion.createMany({
          data: [
            ...inclusions.map((item, order) => ({ activityId, item, included: true, order })),
            ...exclusions.map((item, order) => ({ activityId, item, included: false, order })),
          ],
        });
      }

      await tx.tripHighlight.deleteMany({ where: { activityId } });
      if (highlights.length > 0) {
        await tx.tripHighlight.createMany({
          data: highlights.map((text, order) => ({ activityId, text, order })),
        });
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint failed")) {
      throw new Error("Slug already exists. Please choose a different slug.");
    }

    throw error;
  }

  revalidatePath("/admin/trips");
  revalidatePath("/trips");
  revalidatePath("/");
  updateTag("trips");
  revalidatePath(`/trips/${previousSlug}`);

  if (slug !== previousSlug) {
    revalidatePath(`/trips/${slug}`);
  }
}

export async function deleteActivityAction(activityId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login?callbackUrl=/admin/trips");
  }

  if (!activityId) {
    throw new Error("Missing activity id.");
  }

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { slug: true },
  });

  if (!activity) {
    throw new Error("Activity not found.");
  }

  await prisma.activity.delete({ where: { id: activityId } });

  revalidatePath("/admin/trips");
  revalidatePath("/trips");
  revalidatePath("/");
  updateTag("trips");
  revalidatePath(`/trips/${activity.slug}`);
}
