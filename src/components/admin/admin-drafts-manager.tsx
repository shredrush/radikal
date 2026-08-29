"use client";

import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ACTIVITY_TYPE_LABELS, TRIP_CATEGORY_LABELS } from "@/lib/trip-metadata";
import { cn } from "@/lib/utils";

export type AdminDraftData = {
  id: string;
  guideName: string;
  title: string | null;
  type: string;
  location: string | null;
  description: string | null;
  priceInRupees: number;
  durationDays: number;
  maxGroupSize: number;
  categories: string[];
  images: string[];
  pickup: string | null;
  drop: string | null;
  inclusions: string[];
  exclusions: string[];
  highlights: string[];
  updatedAt: string;
};

function groupByGuide(drafts: AdminDraftData[]) {
  const map = new Map<string, AdminDraftData[]>();
  for (const draft of drafts) {
    const list = map.get(draft.guideName) ?? [];
    list.push(draft);
    map.set(draft.guideName, list);
  }
  return Array.from(map.entries())
    .map(([guideName, items]) => ({ guideName, items }))
    .sort((a, b) => a.guideName.localeCompare(b.guideName));
}

function DraftReadOnly({ draft }: { draft: AdminDraftData }) {
  const rows: { label: string; value: string }[] = [];
  if (draft.title) rows.push({ label: "Title", value: draft.title });
  rows.push({ label: "Type", value: ACTIVITY_TYPE_LABELS[draft.type] ?? draft.type });
  if (draft.location) rows.push({ label: "Location", value: draft.location });
  if (draft.description) rows.push({ label: "Description", value: draft.description });
  rows.push({ label: "Price", value: `₹${draft.priceInRupees}` });
  rows.push({ label: "Duration", value: `${draft.durationDays} ${draft.durationDays === 1 ? "day" : "days"}` });
  rows.push({ label: "Max group size", value: String(draft.maxGroupSize) });
  if (draft.categories.length > 0) {
    rows.push({
      label: "Categories",
      value: draft.categories.map((c) => TRIP_CATEGORY_LABELS[c] ?? c).join(", "),
    });
  }
  if (draft.images.length > 0) rows.push({ label: "Images", value: draft.images.join(", ") });
  if (draft.pickup) rows.push({ label: "Pickup", value: draft.pickup });
  if (draft.drop) rows.push({ label: "Drop", value: draft.drop });
  if (draft.inclusions.length > 0) rows.push({ label: "Included", value: draft.inclusions.join(", ") });
  if (draft.exclusions.length > 0) rows.push({ label: "Not included", value: draft.exclusions.join(", ") });
  if (draft.highlights.length > 0) rows.push({ label: "Highlights", value: draft.highlights.join(", ") });
  rows.push({ label: "Last updated", value: draft.updatedAt });

  return (
    <dl className="grid gap-2 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex items-start justify-between gap-4">
          <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
          <dd className="max-w-[70%] text-right text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AdminDraftsManager({ drafts }: { drafts: AdminDraftData[] }) {
  const [open, setOpen] = useState(false);
  const [openGuides, setOpenGuides] = useState<Record<string, boolean>>({});
  const [openDrafts, setOpenDrafts] = useState<Record<string, boolean>>({});

  const groups = groupByGuide(drafts);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-500/10"
        onClick={() => setOpen((value) => !value)}
      >
        <FileText className="h-3.5 w-3.5" />
        Drafts ({drafts.length})
      </Button>

      {open ? (
        <div className="w-full basis-full">
          {groups.length === 0 ? (
            <p className="rounded-[1.25rem] border border-dashed border-border/80 bg-muted/20 px-6 py-8 text-center text-sm text-muted-foreground">
              No drafts yet.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map((group) => {
                const guideOpen = openGuides[group.guideName] ?? true;
                return (
                  <section
                    key={group.guideName}
                    className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-background/95"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenGuides((prev) => ({
                          ...prev,
                          [group.guideName]: !guideOpen,
                        }))
                      }
                      aria-expanded={guideOpen}
                      className="flex w-full items-center justify-between gap-4 border-b border-border/70 bg-muted/20 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                    >
                      <span className="font-heading text-base font-semibold text-foreground">
                        {group.guideName}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                          {group.items.length}
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-5 w-5 text-muted-foreground transition-transform duration-200",
                            guideOpen && "rotate-180",
                          )}
                        />
                      </span>
                    </button>

                    {guideOpen ? (
                      <ul className="flex flex-col gap-3 p-4">
                        {group.items.map((draft) => {
                          const draftOpen = openDrafts[draft.id] ?? false;
                          return (
                            <li
                              key={draft.id}
                              className="overflow-hidden rounded-xl border border-border/70 bg-background/70"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenDrafts((prev) => ({
                                    ...prev,
                                    [draft.id]: !draftOpen,
                                  }))
                                }
                                aria-expanded={draftOpen}
                                className="flex w-full items-center gap-2 px-4 py-3 text-left"
                              >
                                <ChevronDown
                                  className={cn(
                                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                                    draftOpen && "rotate-180",
                                  )}
                                />
                                <span className="truncate text-sm font-semibold text-foreground">
                                  {draft.title || "Untitled draft"}
                                </span>
                              </button>
                              {draftOpen ? (
                                <div className="border-t border-border/60 bg-muted/10 px-4 py-3">
                                  <DraftReadOnly draft={draft} />
                                </div>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
