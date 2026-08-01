export const DIFFICULTY_VALUES = ["BEGINNER", "MODERATE", "EXTREME"] as const;

export type ActivityDifficulty = (typeof DIFFICULTY_VALUES)[number];

const DIFFICULTY_LABELS: Record<ActivityDifficulty, string> = {
  BEGINNER: "Beginner",
  MODERATE: "Moderate",
  EXTREME: "Extreme",
};

export function getDifficultyLabel(value: string | null | undefined) {
  const normalized = value?.toString().toUpperCase();

  if (normalized && normalized in DIFFICULTY_LABELS) {
    return DIFFICULTY_LABELS[normalized as ActivityDifficulty];
  }

  return "Moderate";
}

export function isValidDifficulty(value: string): value is ActivityDifficulty {
  return DIFFICULTY_VALUES.includes(value.toUpperCase() as ActivityDifficulty);
}
