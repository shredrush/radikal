"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ImageIcon, Link2, Pencil, Plus, Power, Search, Trash2, Unlink, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FORM_FIELD_BORDER } from "@/lib/boundary-styles";
import { createSportAction, linkTripsToSportAction, moveSportAction, setSportActiveAction, setSportDeletedAction, unlinkTripFromSportAction, updateSportAction } from "@/lib/actions/sports";

const icons = ["hike", "bicycle", "snowboard", "ski", "climb", "mountain", "yoga", "moon", "paddle", "run"];
const inputClassName = `flex h-10 w-full rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`;
type Trip = { id: string; title: string; location: string };
type Sport = { id: string; name: string; icon: string; active: boolean; deletedAt: string | null; trips: Trip[] };

export function SportsManager({ sports, trips }: { sports: Sport[]; trips: Trip[] }) {
  const [isCreating, setIsCreating] = useState(false);

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-heading text-lg font-semibold text-foreground">Sports</h2><p className="text-sm text-muted-foreground">Link sports to active trips without changing the trip itself.</p></div>
      <Button type="button" className="rounded-full" onClick={() => setIsCreating((open) => !open)}>{isCreating ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}{isCreating ? "Close" : "Create sport"}</Button>
    </div>
    {isCreating ? <SportEditor onSaved={() => setIsCreating(false)} /> : null}
    {sports.length === 0 ? <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">No sports yet. Create one to start tagging trips.</p> : <ul className="space-y-3">{sports.map((sport) => { const group = sports.filter((item) => item.active === sport.active && Boolean(item.deletedAt) === Boolean(sport.deletedAt)); const position = group.findIndex((item) => item.id === sport.id); return <SportRow key={sport.id} sport={sport} trips={trips} canMoveUp={position > 0} canMoveDown={position < group.length - 1} />; })}</ul>}
  </div>;
}

function SportEditor({ sport, onSaved }: { sport?: Sport; onSaved: () => void }) {
  const [isPending, startTransition] = useTransition();
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); if (sport) form.set("sportId", sport.id);
    startTransition(async () => { try { await (sport ? updateSportAction(form) : createSportAction(form)); toast.success(sport ? "Sport updated." : "Sport created."); onSaved(); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save sport."); } });
  }
  return <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 sm:flex-row sm:items-end">
    <div className="space-y-1.5"><Label htmlFor={sport ? `sport-name-${sport.id}` : "sport-name"}>Sport name</Label><input id={sport ? `sport-name-${sport.id}` : "sport-name"} name="name" required minLength={2} maxLength={80} defaultValue={sport?.name} autoFocus={!sport} className={inputClassName} placeholder="e.g. Trail running" /></div>
    <div className="space-y-1.5"><Label htmlFor={sport ? `sport-icon-${sport.id}` : "sport-icon"}>Icon</Label><select id={sport ? `sport-icon-${sport.id}` : "sport-icon"} name="icon" defaultValue={sport?.icon ?? "mountain"} className={inputClassName}>{icons.map((icon) => <option key={icon} value={icon}>{icon}</option>)}</select></div>
    <Button type="submit" size="sm" className="rounded-full" disabled={isPending}>{isPending ? "Saving..." : sport ? "Save" : "Create"}</Button>
  </form>;
}

function SportRow({ sport, trips, canMoveUp, canMoveDown }: { sport: Sport; trips: Trip[]; canMoveUp: boolean; canMoveDown: boolean }) {
  const [expanded, setExpanded] = useState(false); const [editing, setEditing] = useState(false); const [editingIcon, setEditingIcon] = useState(false); const [linking, setLinking] = useState(false); const [isPending, startTransition] = useTransition();
  const linkedIds = new Set(sport.trips.map((trip) => trip.id)); const candidates = trips.filter((trip) => !linkedIds.has(trip.id));
  function remove() { if (!window.confirm(`${sport.deletedAt ? "Restore" : "Soft delete"} “${sport.name}”?`)) return; startTransition(async () => { try { await setSportDeletedAction(sport.id, !sport.deletedAt); toast.success(sport.deletedAt ? "Sport restored." : "Sport soft deleted."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update sport."); } }); }
  function unlink(tripId: string) { startTransition(async () => { try { await unlinkTripFromSportAction(sport.id, tripId); toast.success("Trip unlinked."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not unlink trip."); } }); }
  function move(direction: "up" | "down") { startTransition(async () => { try { await moveSportAction(sport.id, direction); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not reorder sport."); } }); }
  function toggleActive() { startTransition(async () => { try { await setSportActiveAction(sport.id, !sport.active); toast.success(sport.active ? "Sport hidden from travellers." : "Sport is live for travellers."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update sport visibility."); } }); }
  return <li className="rounded-[1.25rem] border border-border/70 bg-background/95 p-4 shadow-sm">
    <div className="flex min-w-0 items-start gap-3"><div className="flex shrink-0 flex-col gap-1 pt-0.5"><Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${sport.name} up`} className="rounded-full" disabled={isPending || !canMoveUp} onClick={() => move("up")}><ArrowUp className="h-3.5 w-3.5" /></Button><Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${sport.name} down`} className="rounded-full" disabled={isPending || !canMoveDown} onClick={() => move("down")}><ArrowDown className="h-3.5 w-3.5" /></Button></div><div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
      {editing || editingIcon ? <div className="w-full"><SportEditor sport={sport} onSaved={() => { setEditing(false); setEditingIcon(false); }} /></div> : <><div className="min-w-0 flex-1"><p className="font-semibold text-foreground">{sport.name}</p><p className="text-xs text-muted-foreground">{sport.trips.length} linked trip{sport.trips.length === 1 ? "" : "s"} · {sport.deletedAt ? "Soft deleted" : sport.active ? "Live" : "Hidden"}</p></div>{!sport.deletedAt ? <><Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setEditingIcon(true)}><ImageIcon className="h-3.5 w-3.5" />Icon</Button><Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" />Rename</Button><Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => { setExpanded((value) => !value); setLinking(false); }}><ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />Trips</Button><Button type="button" variant="outline" size="sm" className={`rounded-full ${sport.active ? "border-2 border-black bg-white text-black hover:bg-muted hover:text-black dark:border-white dark:bg-black dark:text-white dark:hover:bg-white/10 dark:hover:text-white" : "border-border bg-background"}`} disabled={isPending} onClick={toggleActive}><Power className="h-3.5 w-3.5" />{sport.active ? "Active" : "Inactive"}</Button></> : null}<Button type="button" variant="outline" size="icon-sm" aria-label={`${sport.deletedAt ? "Restore" : "Soft delete"} ${sport.name}`} title={sport.deletedAt ? "Restore sport" : "Soft delete sport"} className="rounded-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={isPending} onClick={remove}><Trash2 className="h-3.5 w-3.5" /></Button></>}
    </div></div>
    {expanded ? <div className="mt-4 border-t border-border/70 pt-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium text-foreground">Associated trips</p><Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => setLinking((value) => !value)}><Link2 className="h-3.5 w-3.5" />{linking ? "Close" : "Link trips"}</Button></div>{linking ? <LinkTripsForm sportId={sport.id} candidates={candidates} onSaved={() => setLinking(false)} /> : null}{sport.trips.length === 0 ? <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">No trips linked to this sport.</p> : <ul className="space-y-2">{sport.trips.map((trip) => <li key={trip.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-foreground">{trip.title}</p><p className="truncate text-xs text-muted-foreground">{trip.location}</p></div><Button type="button" variant="ghost" size="sm" className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={isPending} onClick={() => unlink(trip.id)}><Unlink className="h-3.5 w-3.5" />Unlink</Button></li>)}</ul>}</div> : null}
  </li>;
}

function LinkTripsForm({ sportId, candidates, onSaved }: { sportId: string; candidates: Trip[]; onSaved: () => void }) {
  const [query, setQuery] = useState(""); const [isPending, startTransition] = useTransition();
  const visible = useMemo(() => candidates.filter((trip) => `${trip.title} ${trip.location}`.toLowerCase().includes(query.trim().toLowerCase())), [candidates, query]);
  function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); form.set("sportId", sportId); startTransition(async () => { try { await linkTripsToSportAction(form); toast.success("Trips linked."); onSaved(); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not link trips."); } }); }
  return <form onSubmit={submit} className="mb-4 space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3"><div className="flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClassName} placeholder="Search available trips" aria-label="Search available trips" /><Search className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" /></div>{visible.length === 0 ? <p className="text-sm text-muted-foreground">No matching unlinked trips.</p> : <div className="max-h-56 space-y-1 overflow-y-auto pr-1">{visible.map((trip) => <label key={trip.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-background"><input type="checkbox" name="tripIds" value={trip.id} /><span className="min-w-0 truncate">{trip.title} <span className="text-muted-foreground">· {trip.location}</span></span></label>)}</div>}<Button type="submit" size="sm" className="rounded-full" disabled={isPending || visible.length === 0}>{isPending ? "Linking..." : "Link selected"}</Button></form>;
}
