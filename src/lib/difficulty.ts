export const DIFFICULTY_VALUES = ["BEGINNER", "MODERATE", "EXTREME"] as const;

export type TripDifficulty = (typeof DIFFICULTY_VALUES)[number];

const DIFFICULTY_LABELS: Record<TripDifficulty, string> = {
  BEGINNER: "Beginner",
  MODERATE: "Moderate",
  EXTREME: "Extreme",
};

export function getDifficultyLabel(value: string | null | undefined) {
  const normalized = value?.toString().toUpperCase();

  if (normalized && normalized in DIFFICULTY_LABELS) {
    return DIFFICULTY_LABELS[normalized as TripDifficulty];
  }

  return "Moderate";
}

export function isValidDifficulty(value: string): value is TripDifficulty {
  return DIFFICULTY_VALUES.includes(value.toUpperCase() as TripDifficulty);
}
