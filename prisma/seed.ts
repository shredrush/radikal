// Seed script for local development. Run with `npx prisma db seed`.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(6, 0, 0, 0);
  return date;
}

async function main() {
  // --- Demo traveller account (email: demo@radikal.travel / password: password123)
  const demoPasswordHash = await bcrypt.hash("password123", 10);
  await prisma.user.upsert({
    where: { email: "demo@radikal.travel" },
    update: {},
    create: {
      name: "Demo Traveller",
      email: "demo@radikal.travel",
      passwordHash: demoPasswordHash,
      role: "USER",
    },
  });

  // --- Guides
  const tenzin = await prisma.guide.upsert({
    where: { slug: "tenzin-namgyal" },
    update: {},
    create: {
      slug: "tenzin-namgyal",
      name: "Tenzin Namgyal",
      bio: "IMF-certified mountaineer from Leh with 12 years guiding offbeat treks and ski descents across Ladakh.",
      location: "Leh, Ladakh",
      experienceYears: 12,
      languages: ["English", "Hindi", "Ladakhi"],
      certifications: {
        create: [
          {
            issuingBody: "Indian Mountaineering Foundation (IMF)",
            title: "Basic Mountaineering Course",
            yearIssued: 2014,
          },
          {
            issuingBody: "Indian Mountaineering Foundation (IMF)",
            title: "Advanced Mountaineering Course",
            yearIssued: 2017,
          },
        ],
      },
    },
  });

  const ritu = await prisma.guide.upsert({
    where: { slug: "ritu-thakur" },
    update: {},
    create: {
      slug: "ritu-thakur",
      name: "Ritu Thakur",
      bio: "One of the few female certified ski instructors in Manali, specializing in small women-only backcountry groups.",
      location: "Manali, Himachal Pradesh",
      experienceYears: 8,
      languages: ["English", "Hindi"],
      certifications: {
        create: [
          {
            issuingBody: "Atal Bihari Vajpayee Institute of Mountaineering & Allied Sports (ABVIMAS)",
            title: "Ski Instructor Course",
            yearIssued: 2018,
          },
        ],
      },
    },
  });

  // --- Activities
  const activitiesData = [
    {
      slug: "backcountry-ski-solang-valley",
      title: "Backcountry Ski Touring — Solang Valley",
      type: "SKI" as const,
      categories: ["ADVENTURE_ENTHUSIAST" as const],
      location: "Solang Valley, Manali",
      description:
        "Small-group backcountry skiing away from the crowds of the main slopes, led by a certified local guide.",
      priceInRupees: 8500,
      durationDays: 2,
      difficulty: "CHALLENGING" as const,
      images: ["/activities/ski-solang.jpg"],
      maxGroupSize: 6,
      guideId: tenzin.id,
    },
    {
      slug: "womens-only-snowboard-clinic",
      title: "Women-Only Snowboard Clinic — Gulaba",
      type: "SNOWBOARD" as const,
      categories: ["WOMEN_ONLY" as const, "ADVENTURE_ENTHUSIAST" as const],
      location: "Gulaba, Manali",
      description:
        "A supportive, women-only snowboarding clinic in a quiet offbeat slope, with a certified female instructor.",
      priceInRupees: 6500,
      durationDays: 1,
      difficulty: "MODERATE" as const,
      images: ["/activities/snowboard-gulaba.jpg"],
      maxGroupSize: 5,
      guideId: ritu.id,
    },
    {
      slug: "spiti-valley-mtb-expedition",
      title: "Spiti Valley Mountain Bike Expedition",
      type: "BIKE" as const,
      categories: ["ADVENTURE_ENTHUSIAST" as const, "LUXURY" as const],
      location: "Spiti Valley, Himachal Pradesh",
      description:
        "Multi-day high-altitude mountain biking through remote Spiti villages with premium camps each night.",
      priceInRupees: 24500,
      durationDays: 5,
      difficulty: "EXTREME" as const,
      images: ["/activities/bike-spiti.jpg"],
      maxGroupSize: 8,
      guideId: tenzin.id,
    },
    {
      slug: "hampta-pass-custom-trek",
      title: "Hampta Pass Custom Trek",
      type: "TREK" as const,
      categories: ["ADVENTURE_ENTHUSIAST" as const, "CORPORATE" as const],
      location: "Lahaul-Spiti border, Himachal Pradesh",
      description:
        "A configurable multi-day crossing from lush Kullu valley to arid Lahaul — itinerary and pace tailored per group, popular for corporate offsites.",
      priceInRupees: 12000,
      durationDays: 4,
      difficulty: "MODERATE" as const,
      images: ["/activities/trek-hampta.jpg"],
      maxGroupSize: 10,
      isCustom: true,
      guideId: tenzin.id,
    },
    {
      slug: "stok-kangri-summit-climb",
      title: "Stok Kangri Summit Climb — Ladakh",
      type: "TREK" as const,
      categories: ["ADVENTURE_ENTHUSIAST" as const, "LUXURY" as const],
      location: "Stok, Ladakh",
      description:
        "A high-altitude alpine climb with acclimatization days, glacier crossings and a certified Himalayan guide.",
      priceInRupees: 18800,
      durationDays: 5,
      difficulty: "EXTREME" as const,
      images: ["/activities/climb-stok.jpg"],
      maxGroupSize: 6,
      guideId: tenzin.id,
    },
    {
      slug: "leh-ladakh-ski-crossing",
      title: "Ladakh Ski Crossing — Pangong Ridge",
      type: "SKI" as const,
      categories: ["ADVENTURE_ENTHUSIAST" as const],
      location: "Pangong Ridge, Ladakh",
      description:
        "A high-altitude ski crossing with glacier views, remote camps and flexible acclimatization days.",
      priceInRupees: 15800,
      durationDays: 6,
      difficulty: "EXTREME" as const,
      images: ["/activities/ski-pangong.jpg"],
      maxGroupSize: 7,
      guideId: tenzin.id,
    },
    {
      slug: "kashmir-biking-gurez-valley",
      title: "Gurez Valley Bike Loop — Kashmir",
      type: "BIKE" as const,
      categories: ["ADVENTURE_ENTHUSIAST" as const],
      location: "Gurez Valley, Kashmir",
      description:
        "A remote cycling loop through pine forests, river crossings and mountain villages with homestay stays.",
      priceInRupees: 13200,
      durationDays: 4,
      difficulty: "CHALLENGING" as const,
      images: ["/activities/bike-gurez.jpg"],
      maxGroupSize: 6,
      guideId: tenzin.id,
    },
    {
      slug: "nako-to-kaza-trek",
      title: "Nako to Kaza Trek — Spiti",
      type: "TREK" as const,
      categories: ["ADVENTURE_ENTHUSIAST" as const, "CORPORATE" as const],
      location: "Spiti Valley, Himachal Pradesh",
      description:
        "An intimate trek through monasteries, high passes and stark desert landscapes with cultural stops.",
      priceInRupees: 9800,
      durationDays: 3,
      difficulty: "MODERATE" as const,
      images: ["/activities/trek-nako.jpg"],
      maxGroupSize: 8,
      guideId: tenzin.id,
    },
    {
      slug: "gulmarg-snowboard-weekend",
      title: "Gulmarg Snowboard Weekend",
      type: "SNOWBOARD" as const,
      categories: ["ADVENTURE_ENTHUSIAST" as const, "WOMEN_ONLY" as const],
      location: "Gulmarg, Kashmir",
      description:
        "A relaxed weekend of powder riding, mountain dinners and guided descents in Kashmir’s winter playground.",
      priceInRupees: 11200,
      durationDays: 2,
      difficulty: "MODERATE" as const,
      images: ["/activities/snowboard-gulmarg.jpg"],
      maxGroupSize: 5,
      guideId: ritu.id,
    },
  ];

  for (const activityData of activitiesData) {
    const activity = await prisma.activity.upsert({
      where: { slug: activityData.slug },
      update: {},
      create: activityData,
    });

    const existingSlots = await prisma.slot.count({
      where: { activityId: activity.id },
    });

    if (existingSlots === 0) {
      await prisma.slot.createMany({
        data: [
          { activityId: activity.id, date: daysFromNow(14), capacity: activity.maxGroupSize },
          { activityId: activity.id, date: daysFromNow(28), capacity: activity.maxGroupSize },
          { activityId: activity.id, date: daysFromNow(45), capacity: activity.maxGroupSize },
        ],
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
