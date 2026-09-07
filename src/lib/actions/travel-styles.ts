"use server";

import { revalidatePath, updateTag } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { parseStoredUrl } from "@/lib/media";
import { isSafeImageSource, sanitizeText } from "@/lib/sanitize";

const MAX_STYLE_NAME_LENGTH = 80;
const MAX_LINKS_PER_REQUEST = 100;

function readId(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function readStyleName(value: FormDataEntryValue | null) {
  const name = sanitizeText(String(value ?? ""), { maxLength: MAX_STYLE_NAME_LENGTH });
  if (name.length < 2) throw new Error("Style names must contain at least 2 characters.");
  return name;
}

function readStyleImage(styleId: string, value: FormDataEntryValue | null) {
  const image = sanitizeText(String(value ?? ""), { maxLength: 2048 });
  if (!image) return null;
  if (!isSafeImageSource(image)) throw new Error("Enter a safe image URL or a site-relative image path.");
  if (image.startsWith("/")) {
    if (!image.startsWith("/travel-styles/")) throw new Error("Style images must use the travel-style image directory.");
    return image;
  }
  const stored = parseStoredUrl(image);
  const storageOrigin = process.env.SUPABASE_URL;
  const isOwnStorage = storageOrigin && new URL(image).origin === new URL(storageOrigin).origin;
  if (!isOwnStorage || stored?.bucket !== "trip-media" || !stored.path.startsWith(`${styleId}/images/`)) {
    throw new Error("Choose a photo uploaded for this travel style.");
  }
  return image;
}

function slugifyStyle(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) throw new Error("Style names must contain letters or numbers.");
  return slug.slice(0, 80).replace(/-+$/g, "");
}

function revalidateTravelStyles() {
  revalidatePath("/admin/styles");
  revalidatePath("/admin/trips");
  revalidatePath("/trips");
  revalidatePath("/");
  updateTag("trips");
}

function isWriteConflict(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2034";
}

export async function createTravelStyleAction(formData: FormData) {
  await requirePermission("trips.manage", "/login?callbackUrl=/admin/styles");
  const name = readStyleName(formData.get("name"));
  const slug = slugifyStyle(name);

  const existing = await prisma.travelStyle.findFirst({
    where: { OR: [{ slug }, { name: { equals: name, mode: "insensitive" } }] },
    select: { id: true },
  });
  if (existing) throw new Error("A travel style with this name already exists.");

  try {
    await prisma.$transaction(async (tx) => {
      const lastStyle = await tx.travelStyle.findFirst({
        where: { active: true }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true },
      });
      await tx.travelStyle.create({
        data: { name, slug, image: "/travel-styles/adventure-enthusiast.jpg", sortOrder: (lastStyle?.sortOrder ?? -1) + 1 },
      });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint failed")) {
      throw new Error("A travel style with this name already exists.");
    }
    if (isWriteConflict(error)) throw new Error("This travel style changed while saving. Please try again.");
    throw error;
  }
  revalidateTravelStyles();
}

export async function renameTravelStyleAction(formData: FormData) {
  await requirePermission("trips.manage", "/login?callbackUrl=/admin/styles");
  const styleId = readId(formData.get("styleId"));
  const name = readStyleName(formData.get("name"));
  if (!styleId) throw new Error("Missing travel style.");

  const existing = await prisma.travelStyle.findFirst({
    where: { id: { not: styleId }, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) throw new Error("A travel style with this name already exists.");

  const result = await prisma.travelStyle.updateMany({ where: { id: styleId }, data: { name } });
  if (result.count !== 1) throw new Error("Travel style not found.");
  revalidateTravelStyles();
}

export async function updateTravelStyleImageAction(formData: FormData) {
  await requirePermission("trips.manage", "/login?callbackUrl=/admin/styles");
  const styleId = readId(formData.get("styleId"));
  if (!styleId) throw new Error("Missing travel style.");
  const image = readStyleImage(styleId, formData.get("image"));

  const result = await prisma.travelStyle.updateMany({ where: { id: styleId }, data: { image } });
  if (result.count !== 1) throw new Error("Travel style not found.");
  revalidateTravelStyles();
}

export async function setTravelStyleActiveAction(styleId: string, active: boolean) {
  await requirePermission("trips.manage", "/login?callbackUrl=/admin/styles");
  if (!styleId.trim()) throw new Error("Missing travel style.");
  if (typeof active !== "boolean") throw new Error("Invalid travel style visibility.");
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.travelStyle.findUnique({ where: { id: styleId }, select: { active: true } });
      if (!current) throw new Error("Travel style not found.");
      if (current.active === active) return;
      const lastStyle = await tx.travelStyle.findFirst({
        where: { active }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true },
      });
      const result = await tx.travelStyle.updateMany({
        where: { id: styleId }, data: { active, sortOrder: (lastStyle?.sortOrder ?? -1) + 1 },
      });
      if (result.count !== 1) throw new Error("Travel style not found.");
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (isWriteConflict(error)) throw new Error("This travel style changed while saving. Please try again.");
    throw error;
  }
  revalidateTravelStyles();
}

export async function moveTravelStyleAction(styleId: string, direction: "up" | "down") {
  await requirePermission("trips.manage", "/login?callbackUrl=/admin/styles");
  if (!styleId.trim() || (direction !== "up" && direction !== "down")) {
    throw new Error("Invalid travel style move.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const style = await tx.travelStyle.findUnique({
        where: { id: styleId }, select: { id: true, active: true, sortOrder: true },
      });
      if (!style) throw new Error("Travel style not found.");
      const target = await tx.travelStyle.findFirst({
        where: { active: style.active, ...(direction === "up" ? { sortOrder: { lt: style.sortOrder } } : { sortOrder: { gt: style.sortOrder } }) },
        orderBy: { sortOrder: direction === "up" ? "desc" : "asc" },
        select: { id: true, sortOrder: true },
      });
      if (!target) return;
      await Promise.all([
        tx.travelStyle.update({ where: { id: style.id }, data: { sortOrder: target.sortOrder } }),
        tx.travelStyle.update({ where: { id: target.id }, data: { sortOrder: style.sortOrder } }),
      ]);
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (isWriteConflict(error)) throw new Error("This travel style changed while reordering. Please try again.");
    throw error;
  }
  revalidateTravelStyles();
}

export async function deleteTravelStyleAction(styleId: string) {
  await requirePermission("trips.manage", "/login?callbackUrl=/admin/styles");
  if (!styleId.trim()) throw new Error("Missing travel style.");

  // Cascading FK cleanup and the style deletion occur atomically.
  const result = await prisma.travelStyle.deleteMany({ where: { id: styleId } });
  if (result.count !== 1) throw new Error("Travel style not found.");
  revalidateTravelStyles();
}

export async function linkTripsToTravelStyleAction(formData: FormData) {
  await requirePermission("trips.manage", "/login?callbackUrl=/admin/styles");
  const styleId = readId(formData.get("styleId"));
  const tripIds = [...new Set(formData.getAll("tripIds").map((value) => String(value).trim()).filter(Boolean))];
  if (!styleId) throw new Error("Missing travel style.");
  if (tripIds.length === 0) throw new Error("Select at least one trip to link.");
  if (tripIds.length > MAX_LINKS_PER_REQUEST) throw new Error("Link at most 100 trips at a time.");

  const [style, trips] = await Promise.all([
    prisma.travelStyle.findUnique({ where: { id: styleId }, select: { id: true } }),
    prisma.trip.findMany({
      where: { id: { in: tripIds }, deletedAt: null },
      select: { id: true },
    }),
  ]);
  if (!style) throw new Error("Travel style not found.");
  if (trips.length !== tripIds.length) throw new Error("One or more selected trips are unavailable.");

  await prisma.tripTravelStyle.createMany({
    data: tripIds.map((tripId) => ({ tripId, travelStyleId: styleId })),
    skipDuplicates: true,
  });
  revalidateTravelStyles();
}

export async function unlinkTripFromTravelStyleAction(styleId: string, tripId: string) {
  await requirePermission("trips.manage", "/login?callbackUrl=/admin/styles");
  if (!styleId.trim() || !tripId.trim()) throw new Error("Missing trip or travel style.");
  await prisma.tripTravelStyle.deleteMany({ where: { tripId, travelStyleId: styleId } });
  revalidateTravelStyles();
}

export async function searchUnlinkedTripsForTravelStyleAction(styleId: string, rawQuery: string) {
  await requirePermission("trips.manage", "/login?callbackUrl=/admin/styles");
  if (!styleId.trim()) throw new Error("Missing travel style.");
  const query = sanitizeText(rawQuery, { maxLength: 100 });

  const style = await prisma.travelStyle.findUnique({ where: { id: styleId }, select: { id: true } });
  if (!style) throw new Error("Travel style not found.");

  return prisma.trip.findMany({
    where: {
      deletedAt: null,
      travelStyleLinks: { none: { travelStyleId: styleId } },
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { location: { contains: query, mode: "insensitive" } },
              { guide: { name: { contains: query, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { title: "asc" },
    take: 50,
    select: { id: true, title: true, location: true, guide: { select: { name: true } } },
  }).then((trips) => trips.map((trip) => ({ ...trip, guideName: trip.guide?.name ?? null })));
}
