import { SPORT_META, SportIcon, type SportId } from "@/components/trips/sport-icon";

export const GUIDE_SPORT_OPTIONS: { value: string; sport: SportId; label: string }[] = [
  { value: "TREK", sport: "trek", label: SPORT_META.trek.label },
  { value: "BIKE", sport: "bike", label: SPORT_META.bike.label },
  { value: "SNOWBOARD", sport: "snowboard", label: SPORT_META.snowboard.label },
  { value: "SKI", sport: "ski", label: SPORT_META.ski.label },
  { value: "ROCKCLIMB", sport: "rockclimb", label: SPORT_META.rockclimb.label },
  { value: "EXPEDITION", sport: "expedition", label: SPORT_META.expedition.label },
  { value: "YOGA", sport: "yoga", label: SPORT_META.yoga.label },
];

export function GuideSports({ sports = [] }: { sports?: string[] }) {
  const selectedSports = GUIDE_SPORT_OPTIONS.filter((sport) => sports.includes(sport.value));
  if (selectedSports.length === 0) return null;

  return (
    <div>
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Sports</p>
      <div className="mt-3 flex flex-nowrap gap-3 overflow-x-auto pb-1">
        {selectedSports.map(({ value, sport, label }) => (
          <div key={value} className="flex min-w-20 flex-col items-center gap-1 text-center text-[0.65rem] font-semibold text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 dark:bg-sky-500/10"><SportIcon sport={sport} className="h-4 w-4" iconClassName="text-sky-700 dark:text-sky-300" /></span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GuideSportsField({ sports = [] }: { sports?: string[] }) {
  return (
    <div>
      <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Sports</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {GUIDE_SPORT_OPTIONS.map(({ value, sport, label }) => (
          <label key={value} className="group flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 px-2.5 py-2 text-xs font-medium transition has-checked:border-emerald-500 has-checked:bg-emerald-50 dark:has-checked:bg-emerald-500/10">
            <input type="checkbox" name="sports" value={value} defaultChecked={sports.includes(value)} className="sr-only" />
            <SportIcon sport={sport} className="h-4 w-4" iconClassName="text-muted-foreground transition group-has-checked:text-emerald-700 dark:group-has-checked:text-emerald-300" />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
