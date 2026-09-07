"use client";

import { Label } from "@/components/ui/label";

export type TripSportOption = { id: string; name: string; icon: string };

export function TripSportSelector({ sports, selectedIds, idPrefix }: { sports: TripSportOption[]; selectedIds: string[]; idPrefix: string }) {
  return <div className="space-y-2 md:col-span-2">
    <Label>Sports</Label>
    <p className="text-xs text-muted-foreground">Choose every sport this trip includes. At least one is required.</p>
    <div className="grid gap-2 sm:grid-cols-2">
      {sports.map((sport) => <label key={sport.id} htmlFor={`${idPrefix}-${sport.id}`} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm hover:bg-muted/40"><input id={`${idPrefix}-${sport.id}`} type="checkbox" name="sportIds" value={sport.id} defaultChecked={selectedIds.includes(sport.id)} /><span className="font-medium text-foreground">{sport.name}</span></label>)}
    </div>
    {sports.length === 0 ? <p className="rounded-xl border border-dashed border-destructive/50 p-3 text-sm text-destructive">No active sports are available. Ask an administrator to restore or create one.</p> : null}
  </div>;
}
