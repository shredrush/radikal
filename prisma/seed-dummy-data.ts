  import "dotenv/config";
  import bcrypt from "bcryptjs";
  import { Pool } from "pg";
  import { PrismaClient } from "../src/generated/prisma/client";
  import { PrismaPg } from "@prisma/adapter-pg";
  import { getDatabaseUrl } from "../src/lib/database-url";

  const databaseUrl = getDatabaseUrl();
  const shouldDisableTlsVerification = Boolean(
    databaseUrl && !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1"),
  );

  const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  function daysFromNow(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(6, 0, 0, 0);
    return date;
  }

  function activityImagePath(slug: string) {
    return `/activities/${slug}/cover.png`;
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
        slug: "spiti-meditation-escape",
        title: "Spiti Meditation Escape",
        type: "YOGA" as const,
        categories: ["LUXURY", "WOMEN_ONLY", "BEGINNER_FRIENDLY"] as const,
        location: "Spiti Valley, Himachal Pradesh",
        description: "Nestled amid the raw, high-altitude landscapes of Spiti, this meditation course offers a rare chance to disconnect from the noise of daily life and reconnect with stillness. Set against ancient monasteries, dramatic mountains, and clear blue skies, the retreat blends traditional mindfulness and breathwork practices with the natural serenity of the Himalayas. Ideal for beginners and experienced practitioners alike, it's a journey inward — guided by silence, simplicity, and the vast quiet of one of India's most remote valleys.",
        priceInRupees: 12000,
        durationDays: 4,
        images: ["/activities/spiti-meditation-escape.jpg"],
        maxGroupSize: 6,
        guideId: ritu.id,
      },
      {
        slug: "ladakh-yoga-course",
        title: "Ladakh Yoga Course",
        type: "YOGA" as const,
        categories: ["LUXURY", "FAMILY", "COURSE", "BEGINNER_FRIENDLY"] as const,
        location: "Ladakh",
        description: "Nestled amid the raw, high-altitude landscapes of Ladakh, this yoga camp offers a rare chance to disconnect from the noise of daily life and reconnect with stillness. Set against ancient monasteries, dramatic mountains, and clear blue skies, the retreat blends traditional mindfulness and breathwork practices with the natural serenity of the Himalayas. Ideal for beginners and experienced practitioners alike, it's a journey inward — guided by silence, simplicity, and the vast quiet of one of India's most remote valleys.",
        priceInRupees: 30000,
        durationDays: 5,
        images: ["/activities/ladakh-yoga-course.jpg"],
        maxGroupSize: 6,
        guideId: ritu.id,
      },
      {
        slug: "sethan-snowboarding-course",
        title: "Snowboarding Course",
        type: "SNOWBOARD" as const,
        categories: ["ADVENTURE_ENTHUSIAST", "COURSE", "BEGINNER_FRIENDLY"] as const,
        location: "Sethan, Manali",
        description: "Get ready to carve through the snow-covered slopes of Manali with this beginner-friendly snowboarding course. Designed for first-timers, sessions cover the basics — balance, stance, turning, and stopping — under the guidance of certified instructors on gentle, learner-friendly slopes. Whether you're chasing an adrenaline rush or just want to try something new this winter, this course offers a fun, safe, and hands-on introduction to snowboarding amid the stunning snowy backdrop of the Himalayas.",
        priceInRupees: 35000,
        durationDays: 6,
        images: ["/activities/sethan-snowboarding-course.jpg"],
        maxGroupSize: 4,
        guideId: tenzinNamgyal.id,
      },
      {
        slug: "backcountry-snowboarding-expedition",
        title: "Backcountry Snowboarding and Ski Expedition",
        type: "SNOWBOARD" as const,
        categories: ["ADVENTURE_ENTHUSIAST", "COURSE", "BEGINNER_FRIENDLY"] as const,
        location: "Lahaul, Himachal Pradesh",
        description: "Venture into the backcountry of Lahaul for an exhilarating snowboarding/ski expedition. This course is designed for adventure enthusiasts looking to explore untouched slopes, with guidance from experienced instructors. Participants will navigate varied terrain, from powder-filled valleys to challenging ridges, ensuring a thrilling and immersive snowboarding/skiing experience amid the breathtaking landscapes of the Himalayas.",
        priceInRupees: 35000,
        durationDays: 6,
        images: ["/activities/backcountry-snowboarding-expedition.jpg"],
        maxGroupSize: 4,
        guideId: tenzinNamgyal.id,
      },
      {
        slug: "lahaul-multi-day-hike",
        title: "Lahaul Multi Day Hike",
        type: "TREK" as const,
        categories: ["ADVENTURE_ENTHUSIAST", "LUXURY", "FAMILY", "SELF_GUIDED", "BEGINNER_FRIENDLY"] as const,
        location: "Lahaul",
        description: "Escape into the wild with our multi-day hiking tour package, designed for adventurers who crave more than just a day trip. Choose from a rotating lineup of stunning trails, each offering a immersive 3-day trek through diverse terrain — from dense forests and alpine meadows to rugged ridgelines and hidden waterfalls.",
        priceInRupees: 15000,
        durationDays: 3,
        images: ["/activities/lahaul-multi-day-hike.jpg"],
        maxGroupSize: 5,
        guideId: tenzinNamgyal.id,
      },
      {
        slug: "ghepan-lake-trek",
        title: "Ghepan Lake Trek",
        type: "TREK" as const,
        categories: ["ADVENTURE_ENTHUSIAST", "LUXURY", "FAMILY", "SELF_GUIDED", "BEGINNER_FRIENDLY"] as const,
        location: "Sissu, Lahaul",
        description: "Tucked away in the folds of the Pir Panjal range, the Ghepan Ghat Lake trek leads you to one of Lahaul's best-kept secrets — a striking neon-blue glacial lake resting at over 4,100 meters, far from the well-worn trails of Himachal. Starting from the quiet village of Sissu on the Manali–Leh highway, this trek winds through dense pine and birch forests, open alpine meadows, and rocky glacial moraine before revealing the lake in all its untouched glory.",
        priceInRupees: 15000,
        durationDays: 3,
        images: ["/activities/ghepan-lake-lahaul-trek.jpg"],
        maxGroupSize: 6,
        guideId: tenzinNamgyal.id,
      },
      {
        slug: "miyar-valley-trek",
        title: "Miyar Valley Trek",
        type: "TREK" as const,
        categories: ["ADVENTURE_ENTHUSIAST", "LUXURY", "FAMILY", "SELF_GUIDED", "BEGINNER_FRIENDLY"] as const,
        location: "Lahaul, Himachal Pradesh",
        description: "Step off the beaten path into Miyar Valley — a remote, S-shaped valley in Lahaul so wild and flower-strewn it's earned the name 'Valley of Flowers of Himachal.' Framed by the Zanskar and Chamba ranges, this trek carries you through meadows bursting with Himalayan wildflowers, past quiet villages, and alongside the Miyar Glacier, where seven crystal-clear glacial ponds glisten at its snout. Far from the crowds of Himachal's popular circuits, Miyar Valley offers something increasingly rare — true solitude in the mountains. Ideal for both seasoned trekkers and fit beginners chasing untouched Himalayan beauty.",
        priceInRupees: 35000,
        durationDays: 5,
        images: ["/activities/miyar-valley-lahaul-trek.jpg"],
        maxGroupSize: 4,
        guideId: tenzinNamgyal.id,
      },
      {
        slug: "yunam-peak",
        title: "Yunam Peak 6111m",
        type: "EXPEDITION" as const,
        categories: ["ADVENTURE_ENTHUSIAST", "LUXURY"] as const,
        location: "Lahaul, Himachal Pradesh",
        description: "Rising to 6,111 m near the iconic Baralacha La pass, Yunam Peak is one of the most accessible 6,000-meter summits in the Indian Himalayas — and a rare chance to cross the 6,000m threshold without technical glacier travel or a prior mountaineering course.",
        priceInRupees: 45000,
        durationDays: 6,
        images: ["/activities/yunam-peak.jpg"],
        maxGroupSize: 4,
        guideId: tashi.id,
      },
      {
        slug: "kanamo-peak",
        title: "Kanamo Peak 5960m",
        type: "EXPEDITION" as const,
        categories: ["ADVENTURE_ENTHUSIAST", "LUXURY"] as const,
        location: "Kibber, Spiti Valley",
        description: "Starting from Kibber — one of the highest motorable villages on Earth — the Kanamo Peak trek is where Spiti's cold desert landscape truly opens up. Gradual ascents across wide ridgelines and barren slopes give trekkers time to properly acclimatize while soaking in some of the most expansive views in the region.",
        priceInRupees: 60000,
        durationDays: 10,
        images: ["/activities/kanamo-peak-summit.jpg"],
        maxGroupSize: 5,
        guideId: tashi.id,
      },
      {
        slug: "deo-tibba",
        title: "Deo Tibba 6001m",
        type: "EXPEDITION" as const,
        categories: ["ADVENTURE_ENTHUSIAST"] as const,
        location: "Manali, Himachal Pradesh",
        description: "Deo Tibba is the classic — a true 6,000m summit and the natural next objective for climbers ready to level up. The route winds through Duhangan Nallah and across the Malana Glacier's ice cap, culminating in a broad, level snow-dome summit that legend holds is where the gods themselves gather. It's technical enough to feel earned, forgiving enough to be a realistic first 6,000er, and the views — of Indrasan, a mountain lake, and endless Himalayan ridgelines — are unforgettable.",
        priceInRupees: 60000,
        durationDays: 13,
        images: ["/activities/deo-tibba-summit.jpg"],
        maxGroupSize: 4,
        guideId: tenzinNamgyal.id,
      },
      {
        slug: "gulmarg-snowboard-weekend",
        title: "Gulmarg Snowboarding Weekend",
        type: "SNOWBOARD" as const,
        categories: ["ADVENTURE_ENTHUSIAST"] as const,
        location: "Gulmarg, Kashmir",
        description: "A relaxed weekend of powder riding, mountain dinners and guided descents in Kashmir’s winter playground.",
        priceInRupees: 15000,
        durationDays: 3,
        images: ["/activities/snowboard-gulmarg.jpg"],
        maxGroupSize: 5,
        guideId: tenzinNamgyal.id,
      },
      {
        slug: "pin-parvati-pass-trek",
        title: "Pin Parvati Pass Trek",
        type: "TREK" as const,
        categories: ["ADVENTURE_ENTHUSIAST"] as const,
        location: "Parvati Valley, Himachal Pradesh",
        description: "Walk out of the green, flower-strewn Parvati Valley and into the raw, barren beauty of Spiti — on foot, over a 5,319m Himalayan pass. Hot springs, glacier crossings, and two completely different worlds joined by one unforgettable trail. This is the trek serious mountain lovers dream about.",
        priceInRupees: 50000,
        durationDays: 8,
        images: ["/activities/trek-pin-parvati.jpg"],
        maxGroupSize: 8,
        guideId: tenzinNamgyal.id,
      },
      {
        slug: "nun-kun",
        title: "Nun Kun 7135m",
        type: "EXPEDITION" as const,
        categories: ["ADVENTURE_ENTHUSIAST"] as const,
        location: "Suru Valley, Ladakh",
        description: "India's most accessible 7,000m summit — twin peaks Nun and Kun rise above Ladakh's remote Suru Valley, separated by a 4km snow plateau in the heart of the Zanskar Range. A serious, technical mountaineering objective with crevassed glaciers, steep ice, and knife-edge ridges — the definitive next step for climbers ready to go beyond 6,000m.",
        priceInRupees: 150000,
        durationDays: 21,
        images: ["/activities/climb-nun-kun.jpg"],
        maxGroupSize: 4,
        guideId: tenzinNamgyal.id,
      },
      {
        slug: "pangong-bike-expedition",
        title: "Pangong Cycling Expedition",
        type: "BIKE" as const,
        categories: ["ADVENTURE_ENTHUSIAST", "LUXURY"] as const,
        location: "Leh, Ladakh",
        description: "Ride from Leh to one of the most surreal landscapes on Earth — Pangong Tso, a vast high-altitude lake that shifts through shades of blue and turquoise as the sun moves across the sky. The route climbs over Chang La, one of the world's highest motorable passes, before descending through Durbuk and Tangtse into the wide-open Changthang plateau. Pedal past ancient monasteries, remote Ladakhi villages, and dramatic Himalayan scenery, with support vehicles on hand for the toughest climbs. Arrive lakeside at 4,300m to camp beneath a sky full of stars, in a landscape that stretches all the way to Tibet.",
        priceInRupees: 24000,
        durationDays: 4,
        images: ["/activities/bike-pangong.jpg"],
        maxGroupSize: 6,
        guideId: tenzinNamgyal.id,
      },
      {
        slug: "bouldering-introduction-course",
        title: "Bouldering Introduction Course",
        type: "ROCKCLIMB" as const,
        categories: ["ADVENTURE_ENTHUSIAST", "COURSE"] as const,
        location: "Sethan, Manali",
        description: "Tucked into an alpine valley on the road to Hampta Pass, Sethan is quietly becoming one of India's premier bouldering destinations — a forest scattered with hundreds of granite and gneiss boulders, set against a backdrop of high Himalayan peaks.",
        priceInRupees: 20000,
        durationDays: 5,
        images: ["/activities/rockclimb-bouldering-intro.jpg"],
        maxGroupSize: 6,
        guideId: tenzinNamgyal.id,
      },
      {
        slug: "chhatru-bouldering",
        title: "Bouldering at Chhatru",
        type: "ROCKCLIMB" as const,
        categories: ["ADVENTURE_ENTHUSIAST", "COURSE"] as const,
        location: "Chhatru, Lahaul",
        description: "Chhatru is a hidden gem for bouldering enthusiasts, offering a variety of granite and gneiss boulders set against the stunning backdrop of the Lahaul Himalayas. This course is built for climbers who want more than a gym-adjacent boulder field — it's a genuine wilderness bouldering trip. You'll camp riverside, climb through the day on rock that's still being discovered and graded, and spend evenings under some of the clearest night skies in Himachal. Suited to climbers with some bouldering experience looking to push into rawer, more remote terrain — though motivated beginners are welcome with guided instruction.",
        priceInRupees: 25000,
        durationDays: 5,
        images: ["/activities/chhatru-rockclimb.jpg"],
        maxGroupSize: 6,
        guideId: tenzinNamgyal.id,
      },
      {
        slug: "lahaul-spiti-cycle",
        title: "Lahaul Spiti Cycling Expedition",
        type: "BIKE" as const,
        categories: ["ADVENTURE_ENTHUSIAST"] as const,
        location: "Lahaul Spiti, Himachal Pradesh",
        description: "Explore the remote and stunning landscapes of Lahaul on two wheels. This cycling expedition takes you through picturesque villages, rugged mountain trails, and serene valleys, offering an immersive experience of the region's natural beauty and local culture.",
        priceInRupees: 50000,
        durationDays: 12,
        images: ["/activities/lahaul-cycle.jpg"],
        maxGroupSize: 6,
        guideId: tenzinNamgyal.id,
      },
      {
        slug: "mountain-bike-introduction-course",
        title: "Mountain Bike Introduction Course",
        type: "BIKE" as const,
        categories: ["ADVENTURE_ENTHUSIAST"] as const,
        location: "Leh, Ladakh",
        description: "Learn the basics of mountain biking in the scenic surroundings of Disko Valley Bike Park, Leh. This course covers essential skills, safety, and techniques for navigating mountain trails, with guided practice sessions and expert instruction at the park built by professionals.",
        priceInRupees: 30000,
        durationDays: 4,
        images: ["/activities/mountain-bike-intro.jpg"],
        maxGroupSize: 6,
        guideId: tenzinNamgyal.id,
      },
      {
        slug: "mountain-bike-trails",
        title: "Mountain Bike Trails",
        type: "BIKE" as const,
        categories: ["ADVENTURE_ENTHUSIAST"] as const,
        location: "Manali, Himachal Pradesh",
        description: "Explore the best mountain biking trails in Manali. This course covers technical skills, safety, and strategies for navigating high-altitude mountain trails, with guided practice sessions and expert instruction.",
        priceInRupees: 25000,
        durationDays: 3,
        images: ["/activities/mountain-bike-trails.jpg"],
        maxGroupSize: 6,
        guideId: tenzinNamgyal.id,
      },
    ];

    for (const activityData of activitiesData) {
      const normalizedActivityData = {
        ...activityData,
        categories: [...activityData.categories],
        images: [activityImagePath(activityData.slug)],
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

    // ── Per-trip supplemental data ──────────────────────────────────────────
    const supplementalData: Record<string, {
      pickup: string;
      drop: string;
      inclusions: string[];
      exclusions: string[];
      highlights: string[];
    }> = {
      "spiti-meditation-escape": {
        pickup: "Kaza, Spiti Valley",
        drop: "Kaza, Spiti Valley",
        inclusions: ["Certified meditation & yoga instructor", "Accommodation (monastery guesthouse)", "All vegetarian meals", "Yoga mats, blocks & props", "Guided monastery visits"],
        exclusions: ["Transport to/from Kaza", "Travel insurance", "Personal clothing & gear", "Non-vegetarian meals", "Tips"],
        highlights: ["Meditate at 3,800m in one of India's most remote valleys", "Ancient monastery visits and silent sitting sessions", "Star-gazing evenings in pitch-dark Spiti skies", "Completely off-grid — no phone signal, no distractions"],
      },
      "ladakh-yoga-course": {
        pickup: "Leh Airport / Hotel",
        drop: "Leh Airport / Hotel",
        inclusions: ["Certified yoga & breathwork instructor", "Accommodation in a Ladakhi homestay", "All vegetarian meals", "Yoga mats & props", "Acclimatisation walks"],
        exclusions: ["Flights to/from Leh", "Travel insurance", "Personal yoga clothing", "Alcoholic beverages", "Tips"],
        highlights: ["Yoga and pranayama at high altitude in thin, pure air", "Homestay living with a local Ladakhi family", "Morning sessions with panoramic Himalayan views", "Suitable for complete beginners and seasoned practitioners"],
      },
      "sethan-snowboarding-course": {
        pickup: "Manali Bus Stand / Hotel",
        drop: "Manali Bus Stand / Hotel",
        inclusions: ["Certified snowboard instructor", "Snowboard & boot rental", "Helmet & wrist guards", "Daily lift pass", "Safety briefing & avalanche awareness"],
        exclusions: ["Personal snowboard clothing", "Travel insurance", "Accommodation & meals", "Transport to Sethan from Manali", "Tips"],
        highlights: ["Learn on gentle, beginner-friendly powder slopes", "Small groups — maximum 4 students per instructor", "Sethan village: a hidden gem above Manali at 2,900m", "Quick progression from first-timers to independent riders"],
      },
      "backcountry-snowboarding-expedition": {
        pickup: "Manali Bus Stand / Hotel",
        drop: "Manali Bus Stand / Hotel",
        inclusions: ["Lead guide + assistant guide", "Avalanche safety equipment (beacon, probe, shovel)", "Snowboard & boot rental", "Backcountry permits", "Camping gear & all meals on expedition"],
        exclusions: ["Personal snowboard/ski clothing", "Travel & evacuation insurance (mandatory)", "Transport to Lahaul base", "Sleeping bag rated below −10°C", "Tips"],
        highlights: ["Access untouched powder lines closed to regular resort riders", "Glacier descents and couloir runs in Lahaul's Chandra Valley", "Full avalanche safety protocol — guided by IMF-certified experts", "Camp under stars at 4,000m+ between riding days"],
      },
      "lahaul-multi-day-hike": {
        pickup: "Manali Bus Stand / Hotel",
        drop: "Manali Bus Stand / Hotel",
        inclusions: ["Certified trek guide", "Camping gear (tents, sleeping bags)", "All meals during trek", "First aid kit", "Porters for shared luggage"],
        exclusions: ["Personal trekking gear & clothing", "Travel insurance", "Transport to trailhead", "Alcoholic beverages", "Tips"],
        highlights: ["Rotating trail selection — no two trips are the same", "Camp in meadows surrounded by 5,000m+ peaks", "Spot rare Himalayan wildlife and wildflower carpets", "Suitable for fit beginners — no technical skills required"],
      },
      "ghepan-lake-trek": {
        pickup: "Sissu, Lahaul (Manali–Leh Highway)",
        drop: "Sissu, Lahaul (Manali–Leh Highway)",
        inclusions: ["Certified trek guide", "Camping tents & sleeping bags", "All meals (breakfast, lunch, dinner)", "First aid kit", "Porter support"],
        exclusions: ["Personal trekking gear & clothing", "Travel insurance", "Transport to Sissu", "Alcoholic beverages", "Tips"],
        highlights: ["Discover Lahaul's best-kept secret: a neon-blue glacial lake at 4,100m", "Walk through dense Himalayan birch and pine forests", "Virtually no crowds — a true off-the-beaten-path experience", "Views of Deo Tibba, Indrasan, and surrounding 6,000m peaks"],
      },
      "miyar-valley-trek": {
        pickup: "Udaipur, Lahaul",
        drop: "Udaipur, Lahaul",
        inclusions: ["Lead guide + assistant guide", "Full camping kit (tents, mats, sleeping bags)", "All meals during trek", "First aid & emergency kit", "Pack horse / porter for shared equipment"],
        exclusions: ["Personal trekking clothing & boots", "Travel insurance", "Transport to Udaipur from Manali/Keylong", "Sleeping bag rated below −10°C", "Tips"],
        highlights: ["Trek through Himachal's own 'Valley of Flowers' — uncrowded and stunning", "Camp beside the Miyar Glacier and its seven glacial ponds", "Cross high alpine passes with views into Zanskar", "Deep wilderness — no mobile signal, no other tourists"],
      },
      "yunam-peak": {
        pickup: "Darcha, Lahaul",
        drop: "Darcha, Lahaul",
        inclusions: ["Lead guide + high-altitude support guide", "All permits (DM + forest)", "Camping equipment for summit camp", "All meals (base camp & high camp)", "Supplemental oxygen (emergency use)", "Group first aid kit"],
        exclusions: ["Personal mountaineering gear (crampons, ice axe, harness)", "Travel & evacuation insurance (mandatory)", "Transport to Darcha", "Sleeping bag rated below −20°C", "Tips"],
        highlights: ["Cross the 6,000m threshold on one of India's most accessible summits", "No technical glacier travel or ropes required", "Summit views: Baralacha La, Deepak Tal, and the entire Lahaul plateau", "Ideal first high-altitude peak for fit trekkers ready to step up"],
      },
      "kanamo-peak": {
        pickup: "Kibber, Spiti Valley",
        drop: "Kibber, Spiti Valley",
        inclusions: ["Lead guide + assistant guide", "All permits (inner line + peak)", "Full camping kit", "All meals during expedition", "Acclimatisation itinerary built in", "Group medical kit"],
        exclusions: ["Personal trekking & mountaineering gear", "Travel & evacuation insurance (mandatory)", "Transport to Kibber from Kaza", "High-altitude sleeping bag", "Tips"],
        highlights: ["Start from one of Earth's highest motorable villages at 4,205m", "Gradual ascent gives excellent acclimatisation across 10 days", "360° views across Spiti, Kinnaur, and the Zanskar Range at summit", "Cold desert terrain unlike any other trek in India"],
      },
      "deo-tibba": {
        pickup: "Jagatsukh, Manali",
        drop: "Jagatsukh, Manali",
        inclusions: ["Lead mountaineer + support guide", "All permits (DM + peak fee)", "Full high-altitude camping kit", "All meals from base camp onwards", "Fixed ropes on technical sections", "Group first aid & emergency kit"],
        exclusions: ["Personal mountaineering equipment (crampons, ice axe, harness, helmet)", "Travel & evacuation insurance (mandatory)", "Transport to Jagatsukh", "Personal sleeping bag (−20°C rated)", "Tips"],
        highlights: ["Summit the legendary 6,001m — the classic first 6,000er for Indian mountaineers", "Traverse the Malana Glacier to reach a broad, level snow dome summit", "Views of Indrasan, Deo Tibba's twin, and a shimmering mountain lake below", "13-day itinerary built for safe acclimatisation and maximum summit success"],
      },
      "gulmarg-snowboard-weekend": {
        pickup: "Gulmarg Gondola Base / Srinagar Hotel",
        drop: "Gulmarg Gondola Base / Srinagar Hotel",
        inclusions: ["Certified snowboard guide", "2-day gondola pass (Phase 1 + Phase 2)", "Snowboard & boot rental", "One mountain dinner at a local dhaba", "Avalanche safety briefing"],
        exclusions: ["Personal snowboard clothing & layers", "Travel insurance", "Accommodation & main meals", "Srinagar–Gulmarg transport", "Tips"],
        highlights: ["Ride one of Asia's highest ski resorts at 4,200m", "2km of vertical drop — from alpine treeline to open powder bowls", "Intimate small-group experience with a certified Kashmiri guide", "Après-ski in a Kashmiri wood-panelled guesthouse with kahwa tea"],
      },
      "pin-parvati-pass-trek": {
        pickup: "Kasol / Barshaini, Parvati Valley",
        drop: "Mudh Village, Pin Valley, Spiti",
        inclusions: ["Lead guide + assistant guide", "Full camping kit (tents, mats, sleeping bags)", "All meals during trek", "Glacier crossing equipment", "First aid & emergency kit", "Inner line permits"],
        exclusions: ["Personal trekking gear & clothing", "Travel & evacuation insurance (mandatory)", "Transport (Kasol inbound / Kaza outbound — one-way)", "Sleeping bag rated below −15°C", "Tips"],
        highlights: ["Walk across two completely different Himalayan worlds in one trek", "Natural hot springs at Kheerganga on day 1", "Cross the 5,319m Pin Parvati Pass on glacier snow", "Arrive in the cold-desert lunar landscape of Pin Valley, Spiti"],
      },
      "nun-kun": {
        pickup: "Kargil / Parkachik Village, Suru Valley",
        drop: "Kargil / Parkachik Village, Suru Valley",
        inclusions: ["Lead guide + 2 high-altitude support guides", "All peak & inner line permits", "Full expedition camping kit", "All meals from base camp onward", "Fixed ropes on technical sections", "High Camp oxygen support", "Evacuation plan"],
        exclusions: ["Personal high-altitude mountaineering gear (rated to −30°C)", "Travel & emergency evacuation insurance (mandatory)", "Flights to Leh + transport to Suru Valley", "Personal medication & supplements", "Tips"],
        highlights: ["India's most accessible 7,000m summit — the ultimate high-altitude objective", "Twin summits separated by a 4km snow plateau in the heart of Zanskar", "Technical mountaineering: crevassed glaciers, steep ice, knife-edge ridges", "21-day expedition with full base camp setup in remote Suru Valley"],
      },
      "pangong-bike-expedition": {
        pickup: "Leh, Ladakh",
        drop: "Pangong Tso, Ladakh",
        inclusions: ["Certified cycle guide", "Quality mountain bike rental", "Support vehicle & mechanic throughout", "Helmet & basic safety gear", "Accommodation & all meals", "Chang La pass permit"],
        exclusions: ["Personal cycling clothing & shoes", "Travel insurance", "Flights to Leh", "Alcoholic beverages", "Tips"],
        highlights: ["Pedal over Chang La — one of the world's highest motorable passes at 5,360m", "Camp lakeside at Pangong Tso at 4,350m under a Milky Way sky", "Ride through Durbuk, Tangtse and quiet Changthang plateau villages", "Support vehicle takes luggage — you just ride and enjoy the views"],
      },
      "bouldering-introduction-course": {
        pickup: "Manali Bus Stand / Hotel",
        drop: "Manali Bus Stand / Hotel",
        inclusions: ["Certified climbing instructor", "Chalk bag & climbing shoes rental", "Crash pads (group)", "Daily transport to boulder field", "Safety briefing & spotting instruction"],
        exclusions: ["Personal climbing shoes (rentals available)", "Travel insurance", "Accommodation & meals", "Personal chalk bag", "Tips"],
        highlights: ["Granite and gneiss boulders at 2,900m in an alpine forest setting", "Small groups — maximum 6 climbers per instructor", "Learn movement, technique, and footwork on real rock from day 1", "Sethan: an emerging world-class bouldering destination"],
      },
      "chhatru-bouldering": {
        pickup: "Manali / Gramphoo, Lahaul",
        drop: "Manali / Gramphoo, Lahaul",
        inclusions: ["Certified climbing guide", "Crash pads (group)", "Chalk bag & shoe rental", "Camp accommodation & all meals", "Introduction to new and undocumented boulder problems"],
        exclusions: ["Personal climbing gear", "Travel insurance", "Transport from Manali to Gramphoo", "Sleeping bag rated below −5°C", "Tips"],
        highlights: ["Camp riverside on the banks of the Chandra River", "Boulder on barely-documented rock still being first-ascented", "Clear night skies: some of the best stargazing in Himachal", "A genuine wilderness bouldering adventure far from gyms and guidebooks"],
      },
      "lahaul-spiti-cycle": {
        pickup: "Manali, Himachal Pradesh",
        drop: "Kaza, Spiti Valley",
        inclusions: ["Certified cycle guide", "Quality mountain bike rental", "Support vehicle & mechanic", "Helmet & safety gear", "Accommodation (homestays & guesthouses)", "All meals during expedition"],
        exclusions: ["Personal cycling clothing & shoes", "Travel insurance", "Bus/flight home from Kaza", "Alcoholic beverages", "Tips"],
        highlights: ["12 days through two of India's most dramatic high-altitude valleys", "Cross Rohtang Pass and descend into the cold desert of Spiti", "Stay in remote Lahauli and Spitian homestays — real cultural immersion", "Support vehicle follows you — all you do is ride"],
      },
      "mountain-bike-introduction-course": {
        pickup: "Leh Airport / Hotel, Ladakh",
        drop: "Leh Airport / Hotel, Ladakh",
        inclusions: ["Certified MTB instructor", "Bike rental (hardtail MTB)", "Helmet, knee pads & gloves", "Access to Disko Valley Bike Park", "Daily skills coaching sessions"],
        exclusions: ["Personal cycling clothing", "Travel insurance", "Flights to Leh", "Accommodation & meals", "Tips"],
        highlights: ["Learn at Disko Valley Bike Park — the only purpose-built MTB park in Ladakh", "Progress from flat corners to drops and berms in 4 days", "Ride with views of Stok Kangri and the Ladakh Range", "Expert coaching by professional mountain bikers"],
      },
      "mountain-bike-trails": {
        pickup: "Manali, Himachal Pradesh",
        drop: "Manali, Himachal Pradesh",
        inclusions: ["Certified MTB guide", "Bike rental (full-suspension MTB)", "Helmet & protective gear", "Shuttle to trail heads", "Trail snacks & hydration support"],
        exclusions: ["Personal cycling clothing & shoes", "Travel insurance", "Accommodation & meals", "Bike servicing beyond normal wear", "Tips"],
        highlights: ["Access Manali's best singletrack — handpicked by a local guide", "Descend 1,500m of vertical through pine forests to the Beas River", "Mix of cross-country flow trails and technical rocky descents", "Suitable for riders with basic off-road experience looking to push limits"],
      },
    };

    for (const [slug, data] of Object.entries(supplementalData)) {
      const activity = await prisma.activity.findUnique({ where: { slug }, select: { id: true } });
      if (!activity) continue;

      // Upsert pickup/drop
      await prisma.tripLocation.upsert({
        where: { activityId: activity.id },
        update: { pickup: data.pickup, drop: data.drop },
        create: { activityId: activity.id, pickup: data.pickup, drop: data.drop },
      });

      // Replace inclusions/exclusions
      await prisma.tripInclusion.deleteMany({ where: { activityId: activity.id } });
      await prisma.tripInclusion.createMany({
        data: [
          ...data.inclusions.map((item, order) => ({ activityId: activity.id, item, included: true, order })),
          ...data.exclusions.map((item, order) => ({ activityId: activity.id, item, included: false, order })),
        ],
      });

      // Replace highlights
      await prisma.tripHighlight.deleteMany({ where: { activityId: activity.id } });
      await prisma.tripHighlight.createMany({
        data: data.highlights.map((text, order) => ({ activityId: activity.id, text, order })),
      });
    }

    console.log("Seed complete with current trips, guides, supplemental data, and default accounts.");
  }

  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
