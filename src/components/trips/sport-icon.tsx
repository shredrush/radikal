import type { ComponentType } from "react";

import type { IconWeight } from "@phosphor-icons/react";

import {
  BicycleIcon,
  MountainsIcon,
  PersonSimpleHikeIcon,
  PersonSimpleSkiIcon,
  PersonSimpleSnowboardIcon,
  PersonSimpleTaiChiIcon,
  WallIcon,
} from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

type IconProps = {
  className?: string;
  weight?: IconWeight;
  "aria-hidden"?: boolean | "true" | "false";
};

export type SportId =
  | "bike"
  | "rockclimb"
  | "winter"
  | "ski"
  | "snowboard"
  | "trek"
  | "yoga"
  | "expedition";

type SportMeta = {
  label: string;
  icon: ComponentType<IconProps>;
  /** Icon color, black in light mode and inverted to white in dark mode. */
  iconClassName: string;
  /** Neutral chip background, tuned to stay legible in light + dark mode. */
  chipClassName: string;
};

export const SPORT_META: Record<SportId, SportMeta> = {
  bike: {
    label: "Cycling",
    icon: BicycleIcon,
    iconClassName: "text-black dark:text-white",
    chipClassName: "bg-black/5 dark:bg-white/10",
  },
  rockclimb: {
    label: "Rock Climbing",
    icon: WallIcon,
    iconClassName: "text-black dark:text-white",
    chipClassName: "bg-black/5 dark:bg-white/10",
  },
  winter: {
    label: "Snowboard and Ski",
    icon: PersonSimpleSkiIcon,
    iconClassName: "text-black dark:text-white",
    chipClassName: "bg-black/5 dark:bg-white/10",
  },
  ski: {
    label: "Skiing",
    icon: PersonSimpleSkiIcon,
    iconClassName: "text-black dark:text-white",
    chipClassName: "bg-black/5 dark:bg-white/10",
  },
  snowboard: {
    label: "Snowboarding",
    icon: PersonSimpleSnowboardIcon,
    iconClassName: "text-black dark:text-white",
    chipClassName: "bg-black/5 dark:bg-white/10",
  },
  trek: {
    label: "Hiking and Trekking",
    icon: PersonSimpleHikeIcon,
    iconClassName: "text-black dark:text-white",
    chipClassName: "bg-black/5 dark:bg-white/10",
  },
  yoga: {
    label: "Yoga and Meditation",
    icon: PersonSimpleTaiChiIcon,
    iconClassName: "text-black dark:text-white",
    chipClassName: "bg-black/5 dark:bg-white/10",
  },
  expedition: {
    label: "Summit Expedition",
    icon: MountainsIcon,
    iconClassName: "text-black dark:text-white",
    chipClassName: "bg-black/5 dark:bg-white/10",
  },
};

export function isSportId(value: string): value is SportId {
  return value in SPORT_META;
}

/**
 * Monochrome sport icon rendered with the Phosphor fill weight. Renders
 * nothing for an unknown sport id so it can be dropped inline next to any
 * sport name without blowing up on bad data.
 */
export function SportIcon({
  sport,
  className,
  iconClassName,
}: {
  sport: string;
  className?: string;
  iconClassName?: string;
}) {
  const meta = SPORT_META[sport as SportId];

  if (!meta) {
    return null;
  }

  const Icon = meta.icon;

  return (
    <Icon
      aria-hidden="true"
      weight="fill"
      className={cn(
        "shrink-0",
        meta.iconClassName,
        iconClassName ?? "size-8",
        className,
      )}
    />
  );
}

/**
 * Sport icon inside a soft, neutral circular chip. The tint keeps the icon
 * readable against any of the app's light/dark color themes.
 */
export function SportIconChip({
  sport,
  className,
  chipClassName,
  iconClassName,
}: {
  sport: string;
  className?: string;
  chipClassName?: string;
  iconClassName?: string;
}) {
  const meta = SPORT_META[sport as SportId];

  if (!meta) {
    return null;
  }

  const Icon = meta.icon;

  return (
    <span
      className={cn(
        "inline-flex size-12 shrink-0 items-center justify-center rounded-full",
        meta.chipClassName,
        className,
        chipClassName,
      )}
    >
      <Icon
        aria-hidden="true"
        weight="fill"
        className={cn(
          "shrink-0",
          meta.iconClassName,
          iconClassName ?? "size-7",
        )}
      />
    </span>
  );
}
