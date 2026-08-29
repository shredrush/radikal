export const TRIP_CATEGORY_LABELS: Record<string, string> = {
  ADVENTURE_ENTHUSIAST: "Adventure Enthusiast",
  WOMEN_ONLY: "Women Only",
  CORPORATE: "Corporate",
  LUXURY: "Luxury",
  FAMILY: "For Family",
  COURSE: "Courses",
  SELF_GUIDED: "Self Guided",
  BEGINNER_FRIENDLY: "Beginner Friendly",
};

export const TRIP_CATEGORIES = Object.keys(TRIP_CATEGORY_LABELS);

export const ACTIVITY_TYPE_OPTIONS = [
  { value: "TREK", label: "Hiking & Trekking" },
  { value: "BIKE", label: "Cycling" },
  { value: "SNOWBOARD", label: "Snowboarding" },
  { value: "SKI", label: "Skiing" },
  { value: "ROCKCLIMB", label: "Rock Climbing" },
  { value: "EXPEDITION", label: "Summit Expedition" },
  { value: "YOGA", label: "Yoga & Meditation" },
] as const;

export const ACTIVITY_TYPE_LABELS = ACTIVITY_TYPE_OPTIONS.reduce<Record<string, string>>(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {},
);
