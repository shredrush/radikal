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
        where: { slug: "tenzin-namgyal" },
        update: {
          name: "Tenzin Namgyal",
          bio: "IMF-certified mountaineer from Leh with 12 years guiding offbeat treks and ski descents across Ladakh.",
          location: "Leh, Ladakh",
          experienceYears: 12,
          languages: ["English", "Hindi", "Ladakhi"],
        },
        create: {
          slug: "tenzin-namgyal",
          name: "Tenzin Namgyal",
          bio: "IMF-certified mountaineer from Leh with 12 years guiding offbeat treks and ski descents across Ladakh.",
          location: "Leh, Ladakh",
          experienceYears: 12,
          languages: ["English", "Hindi", "Ladakhi"],
          certifications: {
            create: [{ issuingBody: "Indian Mountaineering Foundation (IMF)", title: "Advanced Mountaineering", yearIssued: 2012 }],
          },
        },
      }),
      prisma.guide.upsert({
        where: { slug: "tashi-norbu" },
        update: {
          name: "Tashi Norbu",
          bio: "Certified Himalayan guide from Lahaul & Spiti with deep knowledge of high-altitude treks, skiing routes, and remote expedition logistics.",
          location: "Lahaul & Spiti, Himachal Pradesh",
          experienceYears: 14,
          languages: ["English", "Hindi", "Ladakhi"],
        },
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
        where: { slug: "ritu-thakur" },
        update: {
          name: "Ritu Thakur",
          bio: "One of the few female certified ski instructors in Manali, specializing in small women-only backcountry groups.",
          location: "Manali, Himachal Pradesh",
          experienceYears: 8,
          languages: ["English", "Hindi"],
        },
        create: {
          slug: "ritu-thakur",
          name: "Ritu Thakur",
          bio: "One of the few female certified ski instructors in Manali, specializing in small women-only backcountry groups.",
          location: "Manali, Himachal Pradesh",
          experienceYears: 8,
          languages: ["English", "Hindi"],
          certifications: {
            create: [{ issuingBody: "Atal Bihari Vajpayee Institute of Mountaineering & Allied Sports (ABVIMAS)", title: "Ski Instructor", yearIssued: 2016 }],
          },
        },
      }),
      prisma.guide.upsert({
        where: { slug: "meera-rawat" },
        update: {
          name: "Meera Rawat",
          bio: "Women-led adventure guide in Kashmir with a specialty for snowboard clinics, traverses, and cultural expeditions.",
          location: "Gulmarg, Kashmir",
          experienceYears: 10,
          languages: ["English", "Hindi", "Kashmiri"],
        },
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
        where: { slug: "nawang-dolma" },
        update: {
          name: "Nawang Dolma",
          bio: "Yoga and meditation guide from the eastern Himalayas who designs restorative retreats and mindful eco-trips.",
          location: "Arunachal Pradesh",
          experienceYears: 9,
          languages: ["English", "Hindi", "Tibetan"],
        },
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
      prisma.guide.upsert({
        where: { slug: "tenzin-dorjee" },
        update: {
          name: "Tenzin Dorjee",
          bio: "Ladakh-based cycling and expedition guide with experience across high-altitude roads, passes, and mountain camps.",
          location: "Leh, Ladakh",
          experienceYears: 13,
          languages: ["English", "Hindi", "Ladakhi"],
        },
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
    ]);

    const [tenzinNamgyal, tashi, ritu, meera, nawang, tenzinDorjee] = guides;

    const activitiesData = [
      {
        slug: "manali-meditation-escape",
        title: "Manali Meditation Escape",
        type: "TREK" as const,
        categories: ["ADVENTURE_ENTHUSIAST"] as const,
        location: "Manali",
        description: "A mindful meditation escape among rhododendrons and sunrise viewpoints, designed for slow travel.",
        priceInRupees: 7600,
        durationDays: 3,
        difficulty: "BEGINNER" as const,
        images: ["/activities/meditation-chopta.jpg"],
        maxGroupSize: 8,
        isCustom: false,
        guideId: tenzinNamgyal.id,
      },
      {
        slug: "backcountry-snowboarding",
        title: "Backcountry Snowboarding",
        type: "SNOWBOARD" as const,
        categories: ["ADVENTURE_ENTHUSIAST", "COURSES", "BEGINNER_FRIENDLY"] as const,
        location: "Sethan, Manali",
        description: "Small-group backcountry snowboarding away from the crowds of the main slopes, led by a certified local guide.",
        priceInRupees: 30000,
        durationDays: 6,
        difficulty: "BEGINNER" as const,
        images: ["/activities/ski-solang.jpg"],
        maxGroupSize: 4,
        isCustom: false,
        guideId: tenzinNamgyal.id,
      },
      {
        slug: "leh-bike",
        title: "Ladakh Cycling Tour",
        type: "BIKE" as const,
        categories: ["ADVENTURE_ENTHUSIAST", "LUXURY"] as const,
        location: "Manali-Leh",
        description: "Ladakh bike tour",
        priceInRupees: 25000,
        durationDays: 7,
        difficulty: "MODERATE" as const,
        images: ["/activities/leh-bike.jpg"],
        maxGroupSize: 5,
        isCustom: false,
        guideId: nawang.id,
      },
      {
        slug: "lahaul-hike",
        title: "Lahaul Multi Day Hike",
        type: "TREK" as const,
        categories: ["ADVENTURE_ENTHUSIAST", "LUXURY", "FOR_FAMILY", "SELF_GUIDED", "BEGINNER_FRIENDLY"] as const,
        location: "Lahaul",
        description: "Hike in Lahaul",
        priceInRupees: 15000,
        durationDays: 3,
        difficulty: "BEGINNER" as const,
        images: ["/activities/lahaul-hike.jpg"],
        maxGroupSize: 6,
        isCustom: false,
        guideId: tenzinNamgyal.id,
      },
      {
        slug: "yunam-peak",
        title: "Yunam Peak",
        type: "TREK" as const,
        categories: ["ADVENTURE_ENTHUSIAST", "LUXURY"] as const,
        location: "Lahaul",
        description: "Yunam peak summit",
        priceInRupees: 45000,
        durationDays: 6,
        difficulty: "MODERATE" as const,
        images: ["/activities/yunam-peak.jpg"],
        maxGroupSize: 4,
        isCustom: true,
        guideId: tashi.id,
      },
      {
        slug: "stok-kangri-summit-climb",
        title: "Stok Kangri Summit Climb — Ladakh",
        type: "TREK" as const,
        categories: ["ADVENTURE_ENTHUSIAST", "LUXURY"] as const,
        location: "Stok, Ladakh",
        description: "A high-altitude alpine climb with acclimatization days, glacier crossings and a certified Himalayan guide.",
        priceInRupees: 18800,
        durationDays: 5,
        difficulty: "EXTREME" as const,
        images: ["/activities/climb-stok.jpg"],
        maxGroupSize: 6,
        isCustom: false,
        guideId: tenzinNamgyal.id,
      },
      {
        slug: "nako-to-kaza-trek",
        title: "Nako to Kaza Trek — Spiti",
        type: "TREK" as const,
        categories: ["ADVENTURE_ENTHUSIAST", "CORPORATE"] as const,
        location: "Spiti Valley, Himachal Pradesh",
        description: "An intimate trek through monasteries, high passes and stark desert landscapes with cultural stops.",
        priceInRupees: 9800,
        durationDays: 3,
        difficulty: "MODERATE" as const,
        images: ["/activities/trek-nako.jpg"],
        maxGroupSize: 8,
        isCustom: false,
        guideId: tenzinNamgyal.id,
      },
      {
        slug: "gulmarg-snowboard-weekend",
        title: "Gulmarg Snowboarding Weekend",
        type: "SNOWBOARD" as const,
        categories: ["ADVENTURE_ENTHUSIAST", "WOMEN_ONLY"] as const,
        location: "Gulmarg, Kashmir",
        description: "A relaxed weekend of powder riding, mountain dinners and guided descents in Kashmir’s winter playground.",
        priceInRupees: 11200,
        durationDays: 2,
        difficulty: "MODERATE" as const,
        images: ["/activities/snowboard-gulmarg.jpg"],
        maxGroupSize: 5,
        isCustom: false,
        guideId: ritu.id,
      },
      {
        slug: "gulmarg-powder-ski-week",
        title: "Gulmarg Powder Skiing Week",
        type: "SKI" as const,
        categories: ["ADVENTURE_ENTHUSIAST", "CORPORATE"] as const,
        location: "Gulmarg, Kashmir",
        description: "A seven-day ski escape with guided powder runs, cozy stays and sunrise tours across Gulmarg’s slopes.",
        priceInRupees: 18500,
        durationDays: 7,
        difficulty: "MODERATE" as const,
        images: ["/activities/ski-gulmarg.jpg"],
        maxGroupSize: 8,
        isCustom: false,
        guideId: ritu.id,
      },
      {
        slug: "pin-parvati-pass-trek",
        title: "Pin Parvati Pass Trek",
        type: "TREK" as const,
        categories: ["ADVENTURE_ENTHUSIAST", "CORPORATE"] as const,
        location: "Parvati Valley, Himachal Pradesh",
        description: "A high-pass trekking challenge through lush valleys, glacial streams and remote mountain camps.",
        priceInRupees: 16700,
        durationDays: 8,
        difficulty: "EXTREME" as const,
        images: ["/activities/trek-pin-parvati.jpg"],
        maxGroupSize: 8,
        isCustom: false,
        guideId: tenzinNamgyal.id,
      },
      {
        slug: "nun-kun-expedition-climb",
        title: "Nun Kun Expedition Climb",
        type: "TREK" as const,
        categories: ["ADVENTURE_ENTHUSIAST", "LUXURY"] as const,
        location: "Nun Kun, Ladakh",
        description: "A technical expedition climb with acclimatization days, glacier travel and premium camp logistics.",
        priceInRupees: 26900,
        durationDays: 9,
        difficulty: "EXTREME" as const,
        images: ["/activities/climb-nun-kun.jpg"],
        maxGroupSize: 6,
        isCustom: false,
        guideId: tenzinNamgyal.id,
      },
      {
        slug: "pangong-bike-expedition",
        title: "Pangong Cycling Expedition",
        type: "BIKE" as const,
        categories: ["ADVENTURE_ENTHUSIAST", "LUXURY"] as const,
        location: "Pangong Tso, Ladakh",
        description: "A scenic high-altitude cycling expedition with premium stays and support vehicles along the route.",
        priceInRupees: 24000,
        durationDays: 4,
        difficulty: "EXTREME" as const,
        images: ["/activities/bike-pangong.jpg"],
        maxGroupSize: 6,
        isCustom: false,
        guideId: tenzinNamgyal.id,
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
        images: ["https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=1200&q=80"],
        maxGroupSize: 6,
        isCustom: false,
        guideId: tashi.id,
      },
    ];

    for (const activityData of activitiesData) {
      const normalizedActivityData = {
        ...activityData,
        categories: [...activityData.categories],
      };

      const activity = await prisma.activity.upsert({
        where: { slug: activityData.slug },
        update: {
          ...normalizedActivityData,
          guideId: activityData.guideId,
        },
        create: normalizedActivityData,
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

    console.log("Seed complete with current trips, guides, and default accounts.");
  }

  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
