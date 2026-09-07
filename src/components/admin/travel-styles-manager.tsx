"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ImageIcon, Link2, Pencil, Plus, Power, Search, Trash2, Unlink, X } from "lucide-react";
import { toast } from "sonner";

import {
  createTravelStyleAction,
  deleteTravelStyleAction,
  linkTripsToTravelStyleAction,
  renameTravelStyleAction,
  searchUnlinkedTripsForTravelStyleAction,
  setTravelStyleActiveAction,
  unlinkTripFromTravelStyleAction,
  updateTravelStyleImageAction,
} from "@/lib/actions/travel-styles";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MediaUploader } from "@/components/media/media-uploader";
import { FORM_FIELD_BORDER } from "@/lib/boundary-styles";

type TravelStyle = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  active: boolean;
  trips: Array<{ id: string; title: string; location: string; guideName: string | null }>;
  tripCount: number;
};

type AvailableTrip = { id: string; title: string; location: string; guideName: string | null };

const inputClassName = `flex h-10 w-full rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`;

export function TravelStylesManager({ styles, availableTrips }: { styles: TravelStyle[]; availableTrips: AvailableTrip[] }) {
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">Travel styles</h2>
          <p className="text-sm text-muted-foreground">Link styles to active trips without changing the trip itself.</p>
        </div>
        <Button type="button" className="rounded-full" onClick={() => setIsCreating((open) => !open)}>
          {isCreating ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {isCreating ? "Close" : "Create style"}
        </Button>
      </div>

      {isCreating ? <CreateStyleForm onSaved={() => setIsCreating(false)} /> : null}

      {styles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">No travel styles yet. Create one to start tagging trips.</p>
      ) : (
        <ul className="space-y-3">
          {styles.map((style) => <StyleRow key={style.id} style={style} availableTrips={availableTrips} />)}
        </ul>
      )}
    </div>
  );
}

function CreateStyleForm({ onSaved }: { onSaved: () => void }) {
  const [isPending, startTransition] = useTransition();
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    startTransition(async () => {
      try {
        await createTravelStyleAction(new FormData(form));
        toast.success("Travel style created.");
        onSaved();
      } catch (error) { toast.error(error instanceof Error ? error.message : "Could not create travel style."); }
    });
  }
  return <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 sm:flex-row sm:items-end">
    <div className="space-y-1.5"><Label htmlFor="style-name">Style name</Label><input id="style-name" name="name" required minLength={2} maxLength={80} autoFocus className={inputClassName} placeholder="e.g. Weekend escapes" /></div>
    <Button type="submit" size="sm" className="rounded-full" disabled={isPending}>{isPending ? "Creating..." : "Create"}</Button>
  </form>;
}

function StyleRow({ style, availableTrips }: { style: TravelStyle; availableTrips: AvailableTrip[] }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [linking, setLinking] = useState(false);
  const [editingImage, setEditingImage] = useState(false);
  const [isPending, startTransition] = useTransition();
  const linkedIds = new Set(style.trips.map((trip) => trip.id));
  const candidates = availableTrips.filter((trip) => !linkedIds.has(trip.id));

  function rename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget); form.set("styleId", style.id);
    startTransition(async () => { try { await renameTravelStyleAction(form); toast.success("Travel style renamed."); setEditing(false); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not rename travel style."); } });
  }
  function remove() {
    if (!window.confirm(`Delete “${style.name}”? It will be unlinked from ${style.tripCount} trip${style.tripCount === 1 ? "" : "s"}.`)) return;
    startTransition(async () => { try { await deleteTravelStyleAction(style.id); toast.success("Travel style deleted."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete travel style."); } });
  }
  function unlink(tripId: string) {
    startTransition(async () => { try { await unlinkTripFromTravelStyleAction(style.id, tripId); toast.success("Trip unlinked."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not unlink trip."); } });
  }
  function saveImage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget); form.set("styleId", style.id);
    startTransition(async () => { try { await updateTravelStyleImageAction(form); toast.success("Style image updated."); setEditingImage(false); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update style image."); } });
  }
  function toggleActive() {
    startTransition(async () => { try { await setTravelStyleActiveAction(style.id, !style.active); toast.success(style.active ? "Style hidden from travellers." : "Style is live for travellers."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update style visibility."); } });
  }

  return <li className="rounded-[1.25rem] border border-border/70 bg-background/95 p-4 shadow-sm">
    <div className="flex flex-wrap items-center gap-3">
      {editing ? <form onSubmit={rename} className="flex flex-1 items-center gap-2"><input name="name" defaultValue={style.name} required minLength={2} maxLength={80} className={inputClassName} /><Button type="submit" size="sm" className="rounded-full" disabled={isPending}>Save</Button><Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setEditing(false)}>Cancel</Button></form> : <><div className="min-w-0 flex-1"><p className="font-semibold text-foreground">{style.name}</p><p className="text-xs text-muted-foreground">{style.tripCount} linked trip{style.tripCount === 1 ? "" : "s"} · {style.active ? "Live" : "Hidden"}</p></div><Button type="button" variant={style.active ? "default" : "outline"} size="sm" className="rounded-full" disabled={isPending} onClick={toggleActive}><Power className="h-3.5 w-3.5" />{style.active ? "Active" : "Inactive"}</Button><Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setEditingImage((value) => !value)}><ImageIcon className="h-3.5 w-3.5" />Photo</Button><Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" />Rename</Button></>}
      <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => { setExpanded((value) => !value); setLinking(false); }}><ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />Trips</Button>
      <Button type="button" variant="outline" size="sm" className="rounded-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={isPending} onClick={remove}><Trash2 className="h-3.5 w-3.5" />Delete</Button>
    </div>
    {editingImage ? <form onSubmit={saveImage} className="mt-4 space-y-3 border-t border-border/70 pt-4"><MediaUploader entity="style" folderKey={style.id} initialImages={style.image ? [style.image] : []} imagesFieldName="image" videosFieldName="styleVideo" mediaOrderFieldName="styleMediaOrder" /><div className="flex justify-end"><Button type="submit" size="sm" className="rounded-full" disabled={isPending}>{isPending ? "Saving..." : "Save photo"}</Button></div></form> : null}
    {expanded ? <div className="mt-4 border-t border-border/70 pt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium text-foreground">Associated trips</p><Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => setLinking((value) => !value)}><Link2 className="h-3.5 w-3.5" />{linking ? "Close" : "Link trips"}</Button></div>
      {linking ? <LinkTripsForm styleId={style.id} candidates={candidates} onSaved={() => setLinking(false)} /> : null}
      {style.trips.length === 0 ? <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">No trips linked to this style.</p> : <ul className="space-y-2">{style.trips.map((trip) => <li key={trip.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-foreground">{trip.title}</p><p className="truncate text-xs text-muted-foreground">{trip.location}{trip.guideName ? ` · ${trip.guideName}` : ""}</p></div><Button type="button" variant="ghost" size="sm" className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={isPending} onClick={() => unlink(trip.id)}><Unlink className="h-3.5 w-3.5" />Unlink</Button></li>)}</ul>}
    </div> : null}
  </li>;
}

function LinkTripsForm({ styleId, candidates: initialCandidates, onSaved }: { styleId: string; candidates: AvailableTrip[]; onSaved: () => void }) {
  const [query, setQuery] = useState(""); const [candidates, setCandidates] = useState(initialCandidates); const [isPending, startTransition] = useTransition(); const [isSearching, startSearching] = useTransition();
  const visible = candidates.filter((trip) => `${trip.title} ${trip.location} ${trip.guideName ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  function search() { startSearching(async () => { try { setCandidates(await searchUnlinkedTripsForTravelStyleAction(styleId, query)); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not search trips."); } }); }
  function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); form.set("styleId", styleId); startTransition(async () => { try { await linkTripsToTravelStyleAction(form); toast.success("Trips linked."); onSaved(); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not link trips."); } }); }
  return <form onSubmit={submit} className="mb-4 space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3"><div className="flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClassName} placeholder="Search available trips" aria-label="Search available trips" /><Button type="button" variant="outline" size="sm" className="rounded-full" onClick={search} disabled={isSearching}><Search className="h-3.5 w-3.5" />{isSearching ? "Searching..." : "Search"}</Button></div>{visible.length === 0 ? <p className="text-sm text-muted-foreground">No matching unlinked trips.</p> : <div className="max-h-56 space-y-1 overflow-y-auto pr-1">{visible.map((trip) => <label key={trip.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-background"><input type="checkbox" name="tripIds" value={trip.id} /> <span className="min-w-0 truncate">{trip.title} <span className="text-muted-foreground">· {trip.location}</span></span></label>)}</div>}<Button type="submit" size="sm" className="rounded-full" disabled={isPending || visible.length === 0}>{isPending ? "Linking..." : "Link selected"}</Button></form>;
}
