import type { ComponentType } from "react";

import {
  Bike,
  Footprints,
  Mountain,
  MountainSnow,
  Snowflake,
} from "lucide-react";

import { cn } from "@/lib/utils";

type IconProps = {
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
};

export type SportId =
  | "bike"
  | "rockclimb"
  | "winter"
  | "trek"
  | "yoga"
  | "expedition";

type SportMeta = {
  label: string;
  icon: ComponentType<IconProps>;
  /** Foreground icon color, tuned to stay legible in light + dark mode. */
  iconClassName: string;
  /** Tinted chip background, tuned to stay legible in light + dark mode. */
  chipClassName: string;
};

export const SPORT_META: Record<SportId, SportMeta> = {
  bike: {
    label: "Cycling",
    icon: Bike,
    iconClassName: "text-emerald-700 dark:text-emerald-400",
    chipClassName: "bg-emerald-500/10 dark:bg-emerald-400/15",
  },
  rockclimb: {
    label: "Rock Climbing",
    icon: Mountain,
    iconClassName: "text-orange-700 dark:text-orange-400",
    chipClassName: "bg-orange-500/10 dark:bg-orange-400/15",
  },
  winter: {
    label: "Snowboard and Ski",
    icon: Snowflake,
    iconClassName: "text-sky-700 dark:text-sky-400",
    chipClassName: "bg-sky-500/10 dark:bg-sky-400/15",
  },
  trek: {
    label: "Hiking and Trekking",
    icon: Footprints,
    iconClassName: "text-amber-700 dark:text-amber-400",
    chipClassName: "bg-amber-500/10 dark:bg-amber-400/15",
  },
  yoga: {
    label: "Yoga and Meditation",
    icon: OmIcon,
    iconClassName: "text-orange-700 dark:text-orange-400",
    chipClassName: "bg-orange-500/10 dark:bg-orange-400/15",
  },
  expedition: {
    label: "Summit Expedition",
    icon: MountainSnow,
    iconClassName: "text-rose-700 dark:text-rose-400",
    chipClassName: "bg-rose-500/10 dark:bg-rose-400/15",
  },
};

/** Om (ॐ) glyph used for the Yoga and Meditation sport icon. */
function OmIcon({ className, "aria-hidden": ariaHidden }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden={ariaHidden}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g transform="translate(-4.575 -5.625) scale(1.5)">
        <path d="M8.413 10.04c4.28-2.09 4.127 1.545 1.378 2.565 0 0 2.32.294 2.3 1.796-.02 1.502-.862 2.464-2.263 2.377-.959-.088-2.533-.445-3.021-2.761" />
        <path d="M11.79 8.057s1.877 2.338 3.927.299" />
        <path d="M11.333 13.16s1.783.474 2.32-.896c0 0 .938-2.329 2.441-1.64s1.155 3.363.759 3.993c0 0-1.367 2.455-3.126.458" />
        <circle cx="13.37" cy="7.383" r=".667" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}

export function isSportId(value: string): value is SportId {
  return value in SPORT_META;
}

/**
 * Colored sport icon. Renders nothing for an unknown sport id so it can be
 * dropped inline next to any sport name without blowing up on bad data.
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
      className={cn(
        "shrink-0",
        meta.iconClassName,
        iconClassName ?? "size-4",
        className,
      )}
    />
  );
}

/**
 * Sport icon inside a soft, tinted circular chip. The tint keeps the icon
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
        "inline-flex size-6 shrink-0 items-center justify-center rounded-full",
        meta.chipClassName,
        className,
        chipClassName,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "shrink-0",
          meta.iconClassName,
          iconClassName ?? "size-3.5",
        )}
      />
    </span>
  );
}
