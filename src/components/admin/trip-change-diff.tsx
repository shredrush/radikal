import { buildTripDiff, type TripProposal } from "@/lib/trip-changes";

/**
 * Server-rendered diff of a guide trip change. Shows each changed field as
 * "before → after"; for a brand-new trip every field is shown as new.
 */
export function TripChangeDiff({
  type,
  proposed,
  original,
}: {
  type: "CREATE" | "UPDATE";
  proposed: TripProposal;
  original: TripProposal | null;
}) {
  const rows = buildTripDiff(proposed, original);

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[180px_1fr]">
      {rows.map((row) => {
        const isNew = type === "CREATE";
        return (
          <div key={row.key} className="contents">
            <dt className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground sm:pt-1">
              {row.label}
            </dt>
            <dd className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm">
              {isNew ? (
                <span className="whitespace-pre-line text-foreground/90">{row.after}</span>
              ) : (
                <span className="flex flex-col gap-1">
                  <span className="whitespace-pre-line text-muted-foreground line-through decoration-destructive/50">
                    {row.before}
                  </span>
                  <span className="whitespace-pre-line font-medium text-foreground/90">
                    {row.after}
                  </span>
                </span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
