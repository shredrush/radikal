"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidDifficulty, type ActivityDifficulty } from "@/lib/difficulty";

const validTypes = ["SKI", "SNOWBOARD", "BIKE", "TREK"] as const;

function asString(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

export async function updateActivityAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login?callbackUrl=/admin/trips");
  }

  const activityId = asString(formData.get("activityId"));
  const title = asString(formData.get("title"));
  const location = asString(formData.get("location"));
  const description = asString(formData.get("description"));
  const type = asString(formData.get("type"));
  const difficulty = asString(formData.get("difficulty"));
  const priceInRupees = Number.parseInt(asString(formData.get("priceInRupees")), 10);
  const durationDays = Number.parseInt(asString(formData.get("durationDays")), 10);
  const maxGroupSize = Number.parseInt(asString(formData.get("maxGroupSize")), 10);
  const isCustom = formData.get("isCustom") === "on";

  if (!activityId) {
    throw new Error("Missing activity id.");
  }

  if (!validTypes.includes(type as (typeof validTypes)[number])) {
    throw new Error("Invalid activity type.");
  }

  if (!isValidDifficulty(difficulty)) {
    throw new Error("Invalid difficulty.");
  }

  if (Number.isNaN(priceInRupees) || Number.isNaN(durationDays) || Number.isNaN(maxGroupSize)) {
    throw new Error("One or more numeric fields are invalid.");
  }

  await prisma.activity.update({
    where: { id: activityId },
    data: {
      title,
      location,
      description,
      type: type as (typeof validTypes)[number],
      difficulty: difficulty.toUpperCase() as ActivityDifficulty,
      priceInRupees,
      durationDays,
      maxGroupSize,
      isCustom,
    },
  });

  revalidatePath("/admin/trips");
  revalidatePath("/trips");
  revalidatePath("/");

  redirect("/admin/trips");
}
