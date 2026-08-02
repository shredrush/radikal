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
  const demoPasswordHash = await bcrypt.hash("r11235", 10);
  const adminPasswordHash = await bcrypt.hash("r112358", 10);

  await prisma.user.upsert({
    where: { email: "demo@radikal.in" },
    update: {
      name: "Demo Traveller",
      passwordHash: demoPasswordHash,
      role: "USER",
    },
    create: {
      name: "Demo Traveller",
      email: "demo@radikal.in",
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
      name: "Admin Radikal",
      email: "admin@radikal.in",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  const guides = await Promise.all([
    prisma.guide.upsert({
      where: { slug: "tashi-norbu" },
      update: {},
      create: {
        slug: "tashi-norbu",
        name: "Tashi Norbu",
        bio: "Certified Himalayan guide from Lahaul & Spiti with deep knowledge of high-altitude treks, skiing routes, and remote expedition logistics.",
        location: "Lahaul & Spiti, Himachal Pradesh",
        experienceYears: 14,
        languages: ["English", "Hindi", "Ladakhi"],
        certifications: {
          create: [{ issuingBody: "Indian Mountaineering Foundation (IMF)", title: "Advanced Mountaineering", yearIssued: 2012 }],
        },
      },
    }),
    prisma.guide.upsert({
      where: { slug: "meera-rawat" },
      update: {},
      create: {
        slug: "meera-rawat",
        name: "Meera Rawat",
        bio: "Women-led adventure guide in Kashmir with a specialty for snowboard clinics, traverses, and cultural expeditions.",
        location: "Gulmarg, Kashmir",
        experienceYears: 10,
        languages: ["English", "Hindi", "Kashmiri"],
        certifications: {
          create: [{ issuingBody: "Atal Bihari Vajpayee Institute of Mountaineering & Allied Sports (ABVIMAS)", title: "Ski Instructor", yearIssued: 2016 }],
        },
      },
    }),
    prisma.guide.upsert({
      where: { slug: "tenzin-dorjee" },
      update: {},
      create: {
        slug: "tenzin-dorjee",
        name: "Tenzin Dorjee",
        bio: "Ladakh-based cycling and expedition guide with experience across high-altitude roads, passes, and mountain camps.",
        location: "Leh, Ladakh",
        experienceYears: 13,
        languages: ["English", "Hindi", "Ladakhi"],
        certifications: {
          create: [{ issuingBody: "Indian Mountaineering Foundation (IMF)", title: "Mountain Rescue", yearIssued: 2014 }],
        },
      },
    }),
    prisma.guide.upsert({
      where: { slug: "nawang-dolma" },
      update: {},
      create: {
        slug: "nawang-dolma",
        name: "Nawang Dolma",
        bio: "Yoga and meditation guide from the eastern Himalayas who designs restorative retreats and mindful eco-trips.",
        location: "Arunachal Pradesh",
        experienceYears: 9,
        languages: ["English", "Hindi", "Tibetan"],
        certifications: {
          create: [{ issuingBody: "Yoga Alliance", title: "200h Yoga Teacher Training", yearIssued: 2019 }],
        },
      },
    }),
  ]);

  const [tashi, meera, tenzin, nawang] = guides;

  const activitiesData = [
    {
      slug: "snowboard-escape-in-gulmarg",
      title: "Snowboard Escape in Gulmarg",
      type: "SNOWBOARD" as const,
      categories: ["WOMEN_ONLY", "BEGINNER_FRIENDLY", "ADVENTURE_ENTHUSIAST"] as const,
      location: "Gulmarg, Kashmir",
      description: "A relaxed weekend of powder riding, mountain dinners and guided descents in Kashmir’s winter playground.",
      priceInRupees: 11200,
      durationDays: 2,
      difficulty: "MODERATE" as const,
      images: [
        "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80",
      ],
      maxGroupSize: 6,
      guideId: meera.id,
    },
    {
      slug: "ladakh-bike-adventure",
      title: "Ladakh Bike Adventure",
      type: "BIKE" as const,
      categories: ["ADVENTURE_ENTHUSIAST", "SELF_GUIDED"] as const,
      location: "Leh to Pangong, Ladakh",
      description: "A scenic high-altitude cycling expedition with premium stays, support vehicles and Himalayan views at every turn.",
      priceInRupees: 21800,
      durationDays: 6,
      difficulty: "EXTREME" as const,
      images: [
        "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&w=1200&q=80",
      ],
      maxGroupSize: 8,
      guideId: tenzin.id,
    },
    {
      slug: "women-only-trek-in-kashmir",
      title: "Women-only Trek in Kashmir",
      type: "TREK" as const,
      categories: ["WOMEN_ONLY", "BEGINNER_FRIENDLY", "FOR_FAMILY"] as const,
      location: "Gulmarg to Sonamarg, Kashmir",
      description: "An iconic alpine trek with lake crossings, meadow camps and a mellow pace for first-time Himalayan travellers.",
      priceInRupees: 13900,
      durationDays: 6,
      difficulty: "MODERATE" as const,
      images: [
        "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=1200&q=80",
      ],
      maxGroupSize: 10,
      guideId: meera.id,
    },
    {
      slug: "expedition-in-the-zanskar-range",
      title: "Expedition in the Zanskar Range",
      type: "TREK" as const,
      categories: ["ADVENTURE_ENTHUSIAST", "COURSES"] as const,
      location: "Zanskar, Ladakh",
      description: "A technical high-altitude expedition with glacier crossings, acclimatization days and fully supported camp logistics.",
      priceInRupees: 26900,
      durationDays: 9,
      difficulty: "EXTREME" as const,
      images: [
        "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=1200&q=80",
      ],
      maxGroupSize: 6,
      guideId: tashi.id,
    },
    {
      slug: "gulmarg-powder-ski-week",
      title: "Gulmarg Powder Ski Week",
      type: "SKI" as const,
      categories: ["ADVENTURE_ENTHUSIAST", "COURSES"] as const,
      location: "Gulmarg, Kashmir",
      description: "A seven-day ski escape with guided powder runs, cozy stays and sunrise tours across Gulmarg’s slopes.",
      priceInRupees: 18500,
      durationDays: 7,
      difficulty: "MODERATE" as const,
      images: [
        "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80",
      ],
      maxGroupSize: 8,
      guideId: meera.id,
    },
    {
      slug: "solang-valley-ski-weekend",
      title: "Solang Valley Ski Weekend",
      type: "SKI" as const,
      categories: ["BEGINNER_FRIENDLY", "ADVENTURE_ENTHUSIAST"] as const,
      location: "Solang Valley, Manali",
      description: "A friendly ski weekend focused on easy terrain, fresh snow and slow-paced mountain hospitality.",
      priceInRupees: 8500,
      durationDays: 2,
      difficulty: "BEGINNER" as const,
      images: [
        "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80",
      ],
      maxGroupSize: 6,
      guideId: tashi.id,
    },
    {
      slug: "tirthan-yoga-retreat",
      title: "Tirthan Yoga Retreat",
      type: "TREK" as const,
      categories: ["FOR_FAMILY", "SELF_GUIDED"] as const,
      location: "Tirthan Valley, Himachal Pradesh",
      description: "A restorative yoga and mountain-view retreat with breathwork sessions, forest walks and healthy meals.",
      priceInRupees: 10800,
      durationDays: 4,
      difficulty: "BEGINNER" as const,
      images: [
        "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
      ],
      maxGroupSize: 10,
      guideId: nawang.id,
    },
    {
      slug: "chopta-meditation-escape",
      title: "Chopta Meditation Escape",
      type: "TREK" as const,
      categories: ["SELF_GUIDED", "BEGINNER_FRIENDLY"] as const,
      location: "Chopta, Uttarakhand",
      description: "A mindful meditation escape among rhododendrons and sunrise viewpoints, designed for slow travel.",
      priceInRupees: 7600,
      durationDays: 3,
      difficulty: "BEGINNER" as const,
      images: [
        "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
      ],
      maxGroupSize: 8,
      guideId: nawang.id,
    },
    {
      slug: "narkanda-ridge-bike-adventure",
      title: "Narkanda Ridge Bike Adventure",
      type: "BIKE" as const,
      categories: ["ADVENTURE_ENTHUSIAST", "SELF_GUIDED"] as const,
      location: "Narkanda, Himachal Pradesh",
      description: "A spirited cycling loop through pine forests, alpine switchbacks and far-reaching mountain views.",
      priceInRupees: 8900,
      durationDays: 3,
      difficulty: "MODERATE" as const,
      images: [
        "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&w=1200&q=80",
      ],
      maxGroupSize: 8,
      guideId: tenzin.id,
    },
    {
      slug: "bhagirathi-rock-climbing-weekend",
      title: "Bhagirathi Rock Climbing Weekend",
      type: "TREK" as const,
      categories: ["ADVENTURE_ENTHUSIAST", "BEGINNER_FRIENDLY"] as const,
      location: "Bhagirathi Valley, Uttarakhand",
      description: "A compact rock climbing escape with guided routes, beginner coaching and a scenic riverside basecamp.",
      priceInRupees: 11800,
      durationDays: 3,
      difficulty: "BEGINNER" as const,
      images: [
        "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=1200&q=80",
      ],
      maxGroupSize: 6,
      guideId: tashi.id,
    },
    {
      slug: "chandra-ice-climbing-sprint",
      title: "Chandra Ice Climbing Sprint",
      type: "TREK" as const,
      categories: ["ADVENTURE_ENTHUSIAST", "COURSES"] as const,
      location: "Chandra Valley, Himachal Pradesh",
      description: "An advanced ice climbing day with technical coaching, safety systems and beautiful frozen waterfalls.",
      priceInRupees: 14200,
      durationDays: 2,
      difficulty: "EXTREME" as const,
      images: [
        "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80",
      ],
      maxGroupSize: 5,
      guideId: tashi.id,
    },
    {
      slug: "spiti-valley-mtb-expedition",
      title: "Spiti Valley Mountain Bike Expedition",
      type: "BIKE" as const,
      categories: ["ADVENTURE_ENTHUSIAST", "SELF_GUIDED"] as const,
      location: "Spiti Valley, Himachal Pradesh",
      description: "Multi-day high-altitude mountain biking through remote Spiti villages with premium camps each night.",
      priceInRupees: 24500,
      durationDays: 5,
      difficulty: "EXTREME" as const,
      images: [
        "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&w=1200&q=80",
      ],
      maxGroupSize: 8,
      guideId: tashi.id,
    },
    {
      slug: "custom-hampta-pass-trek",
      title: "Custom Hampta Pass Trek",
      type: "TREK" as const,
      categories: ["ADVENTURE_ENTHUSIAST", "FOR_FAMILY", "CORPORATE"] as const,
      location: "Lahaul-Spiti border, Himachal Pradesh",
      description: "A configurable multi-day crossing from lush Kullu valley to arid Lahaul with itinerary and pace tailored per group.",
      priceInRupees: 12000,
      durationDays: 4,
      difficulty: "MODERATE" as const,
      images: [
        "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=1200&q=80",
      ],
      maxGroupSize: 10,
      isCustom: true,
      guideId: tashi.id,
    },
  ];

  for (const activityData of activitiesData) {
    const activity = await prisma.activity.upsert({
      where: { slug: activityData.slug },
      update: {},
      create: activityData,
    });

    const existingSlots = await prisma.slot.count({ where: { activityId: activity.id } });

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

  console.log("Seed complete with dummy trips, guides and default accounts.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
