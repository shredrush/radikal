import { prisma } from "@/lib/prisma";

const read = (value: FormDataEntryValue | null) => String(value ?? "").trim();

const legacyTypeBySlug = {
  trek: "TREK",
  bike: "BIKE",
  snowboard: "SNOWBOARD",
  ski: "SKI",
  rockclimb: "ROCKCLIMB",
  expedition: "EXPEDITION",
  yoga: "YOGA",
} as const;

export type LegacyTripType = (typeof legacyTypeBySlug)[keyof typeof legacyTypeBySlug];

/**
 * Resolve and validate the sports submitted on a trip form. Kept outside any
 * "use server" file so the selected IDs are never exposed as publicly callable
 * server actions; it is only a private helper for the admin/guide save actions.
 *
 * A single query both validates the selection and derives the legacy enum
 * `type` value (used only for historical enum-backed rows).
 */
export async function resolveActiveSports(formData: FormData): Promise<{
  sportIds: string[];
  legacyType: LegacyTripType;
}> {
  const ids = Array.from(
    new Set(formData.getAll("sportIds").map((value) => read(value)).filter(Boolean)),
  );
  if (!ids.length) throw new Error("Select at least one sport.");

  const sports = await prisma.sport.findMany({
    where: { id: { in: ids }, active: true, deletedAt: null },
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true },
  });
  if (sports.length !== ids.length) {
    throw new Error("One or more selected sports are unavailable.");
  }

  const legacyType =
    sports
      .map((sport) => legacyTypeBySlug[sport.slug as keyof typeof legacyTypeBySlug])
      .find((type): type is LegacyTripType => Boolean(type)) ?? "TREK";

  return { sportIds: sports.map((sport) => sport.id), legacyType };
}
