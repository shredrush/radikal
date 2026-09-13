import type { TripType } from "@/generated/prisma/client";

export type SportGuideId = "trek" | "bike" | "rockclimb" | "expedition" | "ski" | "snowboard" | "winter" | "yoga";

export type SportGuide = {
  id: SportGuideId;
  label: string;
  eyebrow: string;
  summary: string;
  types: Array<{ title: string; description: string }>;
  timeline: Array<{ phase: string; title: string; description: string }>;
  startWith: string[];
  addLater: string[];
  guideProvides: string[];
  cityIdeas: string[];
  safety: string[];
  tripTypes: TripType[];
  accent: "orange" | "blue" | "green";
};

export const SPORT_GUIDES: Record<SportGuideId, SportGuide> = {
  trek: {
    id: "trek", label: "Hiking and Trekking", eyebrow: "Move through the mountains, one step at a time",
    summary: "Trekking combines steady movement, route awareness and time outdoors. Begin with local walks, then build toward longer days and guided multi-day routes.",
    types: [{ title: "Day hikes", description: "A practical first step for pacing, layers and trail etiquette." }, { title: "Multi-day treks", description: "Longer routes that add pack management and recovery between days." }, { title: "Alpine trekking", description: "Higher terrain where acclimatisation and weather planning matter." }],
    timeline: [{ phase: "Today", title: "Walk consistently", description: "Start with comfortable walks and learn to use your footwear." }, { phase: "Weeks 1-4", title: "Build time on feet", description: "Add hills or stairs and carry a light day pack." }, { phase: "Months 2-3", title: "Practise outdoors", description: "Join local day hikes and test layers, water and navigation." }, { phase: "Next", title: "Take a guided trek", description: "Choose a beginner-friendly itinerary with realistic daily distances." }],
    startWith: ["Comfortable walking shoes", "Day pack and water bottle", "Sun and rain protection"], addLater: ["Properly fitted hiking boots", "Trekking poles", "Layering system"], guideProvides: ["Route plan and safety briefing", "Group support", "Trip-specific logistics"], cityIdeas: ["Join a local walking or hiking group", "Use parks and stairs for hill training", "Practise with a day pack on weekend walks"], safety: ["Increase distance gradually", "Check weather and route conditions", "Turn back before fatigue affects decisions"], tripTypes: ["TREK"], accent: "green",
  },
  bike: {
    id: "bike", label: "Cycling", eyebrow: "Find your rhythm on two wheels",
    summary: "Cycling is a low-impact way to build endurance and explore further. Skills, bike fit and traffic awareness make early rides more enjoyable.",
    types: [{ title: "Road cycling", description: "Paved routes focused on cadence, endurance and group-riding awareness." }, { title: "Mountain biking", description: "Off-road riding that develops balance, braking and trail reading." }, { title: "Bike touring", description: "Multi-day riding with simple packing and route planning." }],
    timeline: [{ phase: "Today", title: "Set up your bike", description: "Check fit, brakes and tyre pressure before short rides." }, { phase: "Weeks 1-4", title: "Ride regularly", description: "Build easy rides and practise smooth braking and turning." }, { phase: "Months 2-3", title: "Add terrain", description: "Introduce hills, longer routes or a skills clinic." }, { phase: "Next", title: "Join a supported ride", description: "Start with a route matched to your fitness and confidence." }],
    startWith: ["Serviced bike", "Certified helmet", "Water and lights"], addLater: ["Padded shorts", "Repair kit and pump", "Weather-ready layers"], guideProvides: ["Route guidance", "Pacing support", "Trip-specific logistics"], cityIdeas: ["Book a professional bike fit", "Join a beginner group ride", "Take a safe-cycling or mountain-bike skills class"], safety: ["Wear a helmet on every ride", "Learn local road rules", "Keep a buffer for fatigue and changing weather"], tripTypes: ["BIKE"], accent: "blue",
  },
  rockclimb: {
    id: "rockclimb", label: "Rock Climbing", eyebrow: "Technique first, strength follows",
    summary: "Climbing rewards movement, problem-solving and trust. A climbing gym and qualified instructor are the safest place to start before going outdoors.",
    types: [{ title: "Bouldering", description: "Short, roped-free problems close to the ground above mats." }, { title: "Top-rope climbing", description: "Roped indoor climbing that is ideal for learning movement and belaying." }, { title: "Sport climbing", description: "Outdoor routes protected by fixed bolts, learned with instruction." }],
    timeline: [{ phase: "Today", title: "Visit a climbing gym", description: "Take an introduction session and focus on footwork." }, { phase: "Weeks 1-4", title: "Learn movement", description: "Climb easy routes consistently and build comfortable habits." }, { phase: "Months 2-3", title: "Learn systems", description: "Take a supervised belay course and practise with experienced partners." }, { phase: "Next", title: "Climb outside with a guide", description: "Use a qualified guide for your first outdoor climbing days." }],
    startWith: ["Gym entry and rental shoes", "Comfortable movement clothing", "Intro lesson"], addLater: ["Fitted climbing shoes", "Chalk bag", "Personal helmet"], guideProvides: ["Ropes and protection", "Safety systems", "Site-specific instruction"], cityIdeas: ["Try a bouldering gym", "Book a top-rope introduction", "Join a gym technique class"], safety: ["Learn from qualified instructors", "Inspect equipment every time", "Use a partner check before each climb"], tripTypes: ["ROCKCLIMB"], accent: "orange",
  },
  expedition: {
    id: "expedition", label: "Summit Expedition", eyebrow: "A long-term mountain objective",
    summary: "Expeditions combine endurance, mountain judgement and technical preparation. They are a progression from trekking and should be planned with experienced professionals.",
    types: [{ title: "Non-technical summits", description: "High, demanding hikes that emphasise fitness and acclimatisation." }, { title: "Alpine objectives", description: "Routes that may require snow, ice and rope skills." }, { title: "Expeditions", description: "Multi-day summit attempts with detailed planning and contingency time." }],
    timeline: [{ phase: "Today", title: "Build a base", description: "Develop consistent hiking fitness and learn mountain basics." }, { phase: "Months 1-3", title: "Gain experience", description: "Complete guided treks and build time at altitude progressively." }, { phase: "Months 4-12", title: "Train specifically", description: "Work with a guide on the technical and fitness demands of your objective." }, { phase: "Next", title: "Choose the right expedition", description: "Select an itinerary with a conservative acclimatisation plan." }],
    startWith: ["Training plan", "Day-hiking kit", "Medical and insurance review"], addLater: ["Technical mountain boots", "Mountaineering layers", "Personal safety equipment"], guideProvides: ["Risk management", "Technical group equipment", "Route and acclimatisation plan"], cityIdeas: ["Train on stairs with a light pack", "Work with an endurance coach", "Take an introductory mountaineering course"], safety: ["Do not rush altitude progression", "Discuss health conditions with a clinician", "Treat summit day as optional"], tripTypes: ["EXPEDITION"], accent: "green",
  },
  ski: {
    id: "ski", label: "Skiing", eyebrow: "Start on gentle slopes, progress with control",
    summary: "Skiing starts with balance, edging and speed control. Lessons and rental equipment make the first days simple and low-commitment.",
    types: [{ title: "Piste skiing", description: "Groomed runs designed for learning turns and speed control." }, { title: "All-mountain skiing", description: "A mix of prepared terrain and changing snow conditions." }, { title: "Backcountry skiing", description: "Advanced terrain requiring avalanche training and specialist knowledge." }],
    timeline: [{ phase: "Today", title: "Book a lesson", description: "Use rental equipment and a beginner slope." }, { phase: "Days 1-3", title: "Learn control", description: "Focus on stopping, turning and lift etiquette." }, { phase: "This season", title: "Build repetitions", description: "Take lessons and ski easy terrain frequently." }, { phase: "Next", title: "Join a guided trip", description: "Choose a beginner-friendly ski itinerary." }],
    startWith: ["Rental skis and boots", "Helmet", "Warm waterproof layers"], addLater: ["Fitted boots", "Goggles", "Base and mid layers"], guideProvides: ["Terrain guidance", "Safety briefing", "Trip logistics"], cityIdeas: ["Use an indoor or dry slope", "Join a beginner lesson programme", "Build leg strength and mobility"], safety: ["Wear a helmet", "Stay on open terrain within your level", "Never enter avalanche terrain without training"], tripTypes: ["SKI"], accent: "blue",
  },
  snowboard: {
    id: "snowboard", label: "Snowboarding", eyebrow: "Balance, flow and deliberate progression",
    summary: "Snowboarding builds from safe falling and edge control to linked turns. A lesson on beginner terrain makes the learning curve much friendlier.",
    types: [{ title: "Resort riding", description: "Groomed slopes for learning turns, lift use and slope etiquette." }, { title: "Freestyle", description: "Park features and jumps, introduced after strong basic control." }, { title: "Backcountry", description: "Advanced terrain requiring avalanche training and specialist skills." }],
    timeline: [{ phase: "Today", title: "Start with a lesson", description: "Rent equipment and learn on a gentle slope." }, { phase: "Days 1-3", title: "Control each edge", description: "Practise safe stopping and linking simple turns." }, { phase: "This season", title: "Build confidence", description: "Repeat easy runs and learn from an instructor." }, { phase: "Next", title: "Join a guided trip", description: "Pick a trip with terrain suited to newer riders." }],
    startWith: ["Rental board and boots", "Helmet", "Warm waterproof layers"], addLater: ["Fitted boots", "Wrist guards", "Goggles"], guideProvides: ["Terrain guidance", "Safety briefing", "Trip logistics"], cityIdeas: ["Use an indoor or dry slope", "Book a beginner snowboard lesson", "Build core strength and mobility"], safety: ["Wear a helmet and wrist protection", "Stay on open terrain within your level", "Never enter avalanche terrain without training"], tripTypes: ["SNOWBOARD"], accent: "blue",
  },
  winter: {
    id: "winter", label: "Skiing and Snowboarding", eyebrow: "Learn the snow sport that suits your style",
    summary: "Both skiing and snowboarding begin with a lesson, rental equipment and gentle slopes. Try each before deciding which movement feels more natural.",
    types: [{ title: "Skiing", description: "Independent leg movement and poles can feel intuitive for first-timers." }, { title: "Snowboarding", description: "A sideways stance that rewards balance and smooth edge control." }, { title: "Resort riding", description: "The appropriate starting point for either sport." }],
    timeline: [{ phase: "Today", title: "Try a lesson", description: "Rent gear and explore one sport with an instructor." }, { phase: "Days 1-3", title: "Learn control", description: "Prioritise stopping, turning and slope etiquette." }, { phase: "This season", title: "Build repetitions", description: "Return to beginner terrain until control is automatic." }, { phase: "Next", title: "Take a winter trip", description: "Choose an itinerary with appropriate terrain and instruction." }],
    startWith: ["Rental equipment", "Helmet", "Warm waterproof layers"], addLater: ["Fitted boots", "Goggles", "Base layers"], guideProvides: ["Terrain guidance", "Safety briefing", "Trip logistics"], cityIdeas: ["Use an indoor or dry slope", "Take a beginner lesson", "Train leg strength and mobility"], safety: ["Wear a helmet", "Stay on open terrain within your level", "Never enter avalanche terrain without training"], tripTypes: ["SKI", "SNOWBOARD"], accent: "blue",
  },
  yoga: {
    id: "yoga", label: "Yoga and Meditation", eyebrow: "Build awareness before intensity",
    summary: "Yoga and meditation can support mobility, balance and recovery. Begin with accessible classes and focus on steady, comfortable practice.",
    types: [{ title: "Hatha yoga", description: "A slower, alignment-focused style that suits many beginners." }, { title: "Vinyasa yoga", description: "Breath-led movement through flowing sequences." }, { title: "Meditation", description: "Simple attention practices that support recovery and focus." }],
    timeline: [{ phase: "Today", title: "Take one easy class", description: "Choose a beginner session and let the instructor know you are new." }, { phase: "Weeks 1-4", title: "Create a routine", description: "Practise short sessions consistently rather than intensely." }, { phase: "Months 2-3", title: "Refine your practice", description: "Explore classes that fit your goals and body." }, { phase: "Next", title: "Try a guided retreat", description: "Choose a programme that welcomes beginners." }],
    startWith: ["Comfortable clothing", "Water", "Studio mat or towel"], addLater: ["Personal yoga mat", "Blocks or strap", "Warm layer for rest"], guideProvides: ["Instruction", "Practice space", "Retreat-specific equipment"], cityIdeas: ["Visit a beginner-friendly studio", "Join a community class", "Practise a short mobility routine at home"], safety: ["Avoid forcing range of motion", "Tell your instructor about injuries", "Stop if movement causes sharp pain"], tripTypes: ["YOGA"], accent: "orange",
  },
};

export function isSportGuideId(value: string): value is SportGuideId {
  return Object.prototype.hasOwnProperty.call(SPORT_GUIDES, value);
}
