import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "../src/lib/database-url";

const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
const prisma = new PrismaClient({ adapter });

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(6, 0, 0, 0);
  return date;
}

async function main() {
  const demoPasswordHash = await bcrypt.hash("r11235", 10);
  const adminPasswordHash = await bcrypt.hash("r112358", 10);

  const existingUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
    },
  });

  const existingGuides = await prisma.guide.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      bio: true,
      location: true,
      experienceYears: true,
      languages: true,
      photo: true,
      certifications: {
        select: { issuingBody: true, title: true, yearIssued: true },
      },
    },
  });

  const existingActivities = await prisma.activity.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      categories: true,
      location: true,
      description: true,
      priceInRupees: true,
      durationDays: true,
      images: true,
      maxGroupSize: true,
      guideId: true,
    },
  });

  const guideIdMap = new Map<string, string>();

  for (const user of existingUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        passwordHash: user.passwordHash,
      },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash: user.passwordHash,
      },
    });
  }

  await prisma.user.upsert({
    where: { email: "demo@radikal.in" },
    update: {
      name: "Demo Traveller",
      passwordHash: demoPasswordHash,
      role: "USER",
    },
    create: {
      email: "demo@radikal.in",
      name: "Demo Traveller",
      passwordHash: demoPasswordHash,
      role: "USER",
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@radikal.in" },
    update: {
      name: "Admin Radikal",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
    create: {
      email: "admin@radikal.in",
      name: "Admin Radikal",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  for (const guide of existingGuides) {
    const guideRecord = await prisma.guide.upsert({
      where: { slug: guide.slug },
      update: {
        name: guide.name,
        bio: guide.bio,
        location: guide.location,
        experienceYears: guide.experienceYears,
        languages: guide.languages,
        photo: guide.photo,
      },
      create: {
        slug: guide.slug,
        name: guide.name,
        bio: guide.bio,
        location: guide.location,
        experienceYears: guide.experienceYears,
        languages: guide.languages,
        photo: guide.photo,
      },
    });

    guideIdMap.set(guide.id, guideRecord.id);

    await prisma.certification.deleteMany({ where: { guideId: guideRecord.id } });
    if (guide.certifications.length > 0) {
      await prisma.certification.createMany({
        data: guide.certifications.map((certification) => ({
          guideId: guideRecord.id,
          issuingBody: certification.issuingBody,
          title: certification.title,
          yearIssued: certification.yearIssued,
        })),
      });
    }
  }

  for (const activity of existingActivities) {
    const guideId = activity.guideId ? guideIdMap.get(activity.guideId) ?? null : null;

    const activityRecord = await prisma.activity.upsert({
      where: { slug: activity.slug },
      update: {
        title: activity.title,
        type: activity.type,
        categories: activity.categories,
        location: activity.location,
        description: activity.description,
        priceInRupees: activity.priceInRupees,
        durationDays: activity.durationDays,
        images: activity.images,
        maxGroupSize: activity.maxGroupSize,
        guideId,
      },
      create: {
        slug: activity.slug,
        title: activity.title,
        type: activity.type,
        categories: activity.categories,
        location: activity.location,
        description: activity.description,
        priceInRupees: activity.priceInRupees,
        durationDays: activity.durationDays,
        images: activity.images,
        maxGroupSize: activity.maxGroupSize,
        guideId,
      },
    });

    const slotCount = await prisma.slot.count({ where: { activityId: activityRecord.id } });
    if (slotCount === 0) {
      await prisma.slot.createMany({
        data: [
          { activityId: activityRecord.id, date: daysFromNow(14), capacity: activity.maxGroupSize },
          { activityId: activityRecord.id, date: daysFromNow(28), capacity: activity.maxGroupSize },
          { activityId: activityRecord.id, date: daysFromNow(45), capacity: activity.maxGroupSize },
        ],
      });
    }
  }

  console.log(
    `Reseeded ${existingUsers.length} users, ${existingGuides.length} guides, and ${existingActivities.length} activities from the existing database.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
