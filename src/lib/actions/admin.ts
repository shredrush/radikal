"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeTripImagePath } from "@/lib/trip-card-image";

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

function parseImages(value: string, slug: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => normalizeTripImagePath(item, slug));
}

function parseCategories(values: FormDataEntryValue[]) {
  return values
    .map((value) => value.toString())
    .filter((value): value is (typeof validCategories)[number] => validCategories.includes(value as (typeof validCategories)[number]));
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
  const images = parseImages(asString(formData.get("images")), slug);
  const categories = parseCategories(formData.getAll("categories"));

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

  const currentActivity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { slug: true },
  });

  if (!currentActivity) {
    throw new Error("Activity not found.");
  }

  await prisma.activity.update({
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

  revalidatePath("/admin/trips");
  revalidatePath("/trips");
  revalidatePath("/");
  revalidatePath(`/trips/${currentActivity.slug}`);

  if (slug !== currentActivity.slug) {
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
  revalidatePath(`/trips/${activity.slug}`);
}
