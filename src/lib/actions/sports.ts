"use server";

import { revalidatePath, updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { sanitizeText } from "@/lib/sanitize";

const ICONS = new Set(["hike", "bicycle", "snowboard", "ski", "climb", "mountain", "yoga", "moon", "paddle", "run"]);
const read = (value: FormDataEntryValue | null) => String(value ?? "").trim();
const slugify = (name: string) => sanitizeText(name, { maxLength: 80 }).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function revalidateSports() {
  ["/admin/sports", "/admin/trips", "/guide-board/trips", "/trips", "/"].forEach((path) => revalidatePath(path));
  updateTag("trips");
}

function isWriteConflict(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2034";
}

async function requireSportsAdmin() { await requirePermission("trips.manage", "/login?callbackUrl=/admin/sports"); }

export async function createSportAction(formData: FormData) {
  await requireSportsAdmin();
  const name = sanitizeText(read(formData.get("name")), { maxLength: 80 }); const slug = slugify(name); const icon = read(formData.get("icon"));
  if (name.length < 2 || !slug) throw new Error("Sport names must contain at least 2 letters or numbers.");
  if (!ICONS.has(icon)) throw new Error("Choose a valid icon.");
  const exists = await prisma.sport.findFirst({ where: { OR: [{ slug }, { name: { equals: name, mode: "insensitive" } }] }, select: { id: true } });
  if (exists) throw new Error("A sport with this name already exists.");
  await prisma.$transaction(async (tx) => { const last = await tx.sport.findFirst({ where: { deletedAt: null }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } }); await tx.sport.create({ data: { name, slug, icon, sortOrder: (last?.sortOrder ?? -1) + 1 } }); });
  revalidateSports();
}
export async function updateSportAction(formData: FormData) {
  await requireSportsAdmin(); const id = read(formData.get("sportId")); const name = sanitizeText(read(formData.get("name")), { maxLength: 80 }); const icon = read(formData.get("icon"));
  if (!id || name.length < 2) throw new Error("Sport name must contain at least 2 characters."); if (!ICONS.has(icon)) throw new Error("Choose a valid icon.");
  const exists = await prisma.sport.findFirst({ where: { id: { not: id }, name: { equals: name, mode: "insensitive" } }, select: { id: true } }); if (exists) throw new Error("A sport with this name already exists.");
  const result = await prisma.sport.updateMany({ where: { id, deletedAt: null }, data: { name, icon } }); if (!result.count) throw new Error("Sport not found."); revalidateSports();
}
export async function setSportDeletedAction(id: string, deleted: boolean) { await requireSportsAdmin(); if (!id) throw new Error("Missing sport."); const result = await prisma.sport.updateMany({ where: { id }, data: { active: !deleted, deletedAt: deleted ? new Date() : null } }); if (!result.count) throw new Error("Sport not found."); revalidateSports(); }
export async function setSportActiveAction(id: string, active: boolean) {
  await requireSportsAdmin();
  if (!id || typeof active !== "boolean") throw new Error("Invalid sport visibility.");
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.sport.findUnique({ where: { id }, select: { active: true, deletedAt: true } });
      if (!current || current.deletedAt) throw new Error("Sport not found.");
      if (current.active === active) return;
      const last = await tx.sport.findFirst({ where: { active, deletedAt: null }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
      await tx.sport.update({ where: { id }, data: { active, sortOrder: (last?.sortOrder ?? -1) + 1 } });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (isWriteConflict(error)) throw new Error("This sport changed while saving. Please try again.");
    throw error;
  }
  revalidateSports();
}
export async function moveSportAction(id: string, direction: "up" | "down") {
  await requireSportsAdmin();
  if (!id || (direction !== "up" && direction !== "down")) throw new Error("Invalid sport move.");
  try {
    await prisma.$transaction(async (tx) => {
      const sport = await tx.sport.findUnique({ where: { id }, select: { id: true, active: true, deletedAt: true, sortOrder: true } });
      if (!sport) throw new Error("Sport not found.");
      const target = await tx.sport.findFirst({
        where: { active: sport.active, deletedAt: sport.deletedAt ? { not: null } : null, ...(direction === "up" ? { sortOrder: { lt: sport.sortOrder } } : { sortOrder: { gt: sport.sortOrder } }) },
        orderBy: { sortOrder: direction === "up" ? "desc" : "asc" }, select: { id: true, sortOrder: true },
      });
      if (!target) return;
      await Promise.all([tx.sport.update({ where: { id: sport.id }, data: { sortOrder: target.sortOrder } }), tx.sport.update({ where: { id: target.id }, data: { sortOrder: sport.sortOrder } })]);
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (isWriteConflict(error)) throw new Error("This sport changed while reordering. Please try again.");
    throw error;
  }
  revalidateSports();
}
export async function linkTripsToSportAction(formData: FormData) {
  await requireSportsAdmin();
  const sportId = read(formData.get("sportId"));
  const tripIds = Array.from(new Set(formData.getAll("tripIds").map((value) => read(value)).filter(Boolean)));
  if (!sportId || !tripIds.length) throw new Error("Select at least one trip.");
  const [sport, trips] = await Promise.all([
    prisma.sport.findFirst({ where: { id: sportId, deletedAt: null }, select: { id: true } }),
    prisma.trip.findMany({ where: { id: { in: tripIds }, deletedAt: null }, select: { id: true } }),
  ]);
  if (!sport) throw new Error("Sport not found.");
  if (trips.length !== tripIds.length) throw new Error("One or more selected trips are unavailable.");
  await prisma.tripSport.createMany({ data: tripIds.map((tripId) => ({ tripId, sportId })), skipDuplicates: true });
  revalidateSports();
}
export async function unlinkTripFromSportAction(sportId: string, tripId: string) { await requireSportsAdmin(); const links = await prisma.tripSport.findMany({ where: { tripId }, select: { sportId: true } }); if (links.length <= 1) throw new Error("A trip must keep at least one sport."); await prisma.tripSport.deleteMany({ where: { sportId, tripId } }); revalidateSports(); }
