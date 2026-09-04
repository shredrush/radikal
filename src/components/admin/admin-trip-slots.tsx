"use client";

import { useState, useTransition } from "react";
import { Ban, CalendarDays, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";

import {
  createSlotAction,
  cancelSlotAction,
  updateSlotAction,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FORM_FIELD_BORDER } from "@/lib/boundary-styles";
import { parseSlotInteger } from "@/lib/validations/slots";
import type { SlotItem } from "@/lib/slot-item";
import { pluralize, formatShortDate } from "@/lib/format";

export type { SlotItem };

const inputClassName =
  `flex h-10 w-full rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`;

const MAX_SLOT_CAPACITY = 100;

type SlotActions = {
  create: (formData: FormData) => Promise<void>;
  update: (formData: FormData) => Promise<void>;
  remove: (slotId: string, reason?: string) => Promise<void>;
};

function readSlotNumber(formData: FormData, field: string) {
  return parseSlotInteger(String(formData.get(field) ?? ""));
}

export function SlotsManager({
  tripId,
  slots,
  actions = {
    create: createSlotAction,
    update: updateSlotAction,
    remove: cancelSlotAction,
  },
}: {
  tripId: string;
  slots: SlotItem[];
  actions?: SlotActions;
}) {
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(new Set());
  const visibleSlots = slots.filter((slot) => !removedIds.has(slot.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Dates &amp; availability</h3>
        <span className="text-xs text-muted-foreground">
          {pluralize(visibleSlots.length, "date")}
        </span>
      </div>

      <AddSlotForm tripId={tripId} createAction={actions.create} />

      {visibleSlots.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
          No dates yet. Add a date above so travellers can book this trip.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visibleSlots.map((slot) => (
            <SlotRow
              key={slot.id}
              slot={slot}
              updateAction={actions.update}
              cancelAction={actions.remove}
              onCancelled={(slotId) =>
                setRemovedIds((prev) => new Set(prev).add(slotId))
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AddSlotForm({
  tripId,
  createAction,
}: {
  tripId: string;
  createAction: SlotActions["create"];
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("tripId", tripId);

    if (!String(formData.get("date") ?? "")) {
      toast.error("Please choose a date.");
      return;
    }
    const capacity = readSlotNumber(formData, "capacity");
    const reserved = readSlotNumber(formData, "reserved");
    if (capacity === null || capacity < 1) {
      toast.error("Please enter a valid capacity.");
      return;
    }
    if (reserved === null) {
      toast.error("Reserved must be a whole number of 0 or more.");
      return;
    }
    if (reserved > capacity) {
      toast.error("Reserved cannot be greater than the slot capacity.");
      return;
    }

    startTransition(async () => {
      try {
        await createAction(formData);
        form.reset();
        toast.success("Date added.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not add date.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/20 p-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="new-slot-date">New date</Label>
        <input id="new-slot-date" name="date" type="date" required className={inputClassName} />
      </div>
      <div className="w-full space-y-1.5 sm:w-40">
        <Label htmlFor="new-slot-reserved">Reserved</Label>
        <input id="new-slot-reserved" name="reserved" type="number" min="0" max={MAX_SLOT_CAPACITY} defaultValue="0" required className={inputClassName} />
      </div>
      <div className="w-full space-y-1.5 sm:w-40">
        <Label htmlFor="new-slot-capacity">Capacity</Label>
        <input id="new-slot-capacity" name="capacity" type="number" min="1" max={MAX_SLOT_CAPACITY} required className={inputClassName} />
      </div>
      <Button type="submit" size="sm" className="rounded-full" disabled={isPending}>
        <Plus className="h-3.5 w-3.5" />
        {isPending ? "Adding…" : "Add date"}
      </Button>
    </form>
  );
}

function SlotRow({
  slot,
  updateAction,
  cancelAction,
  onCancelled,
}: {
  slot: SlotItem;
  updateAction: SlotActions["update"];
  cancelAction: SlotActions["remove"];
  onCancelled: (slotId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const needsReason = slot.bookingCount > 0;

  function handleEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("slotId", slot.id);

    const dateValue = String(formData.get("date") ?? "");
    if (!dateValue) {
      toast.error("Please choose a date.");
      return;
    }
    const capacity = readSlotNumber(formData, "capacity");
    const reserved = readSlotNumber(formData, "reserved");
    if (capacity === null || capacity < 1) {
      toast.error("Please enter a valid capacity.");
      return;
    }
    if (reserved === null) {
      toast.error("Reserved must be a whole number of 0 or more.");
      return;
    }
    if (reserved > capacity - slot.booked) {
      toast.error(`Reserved cannot exceed the ${capacity - slot.booked} places remaining after booked spots.`);
      return;
    }

    const changes: string[] = [];
    if (dateValue !== slot.dateInput) {
      changes.push(`date changed to ${formatShortDate(`${dateValue}T12:00:00`)}`);
    }
    if (capacity !== slot.capacity) {
      changes.push(`capacity changed from ${slot.capacity} to ${capacity}`);
    }
    if (reserved !== slot.reserved) {
      changes.push(`reserved changed from ${slot.reserved} to ${reserved}`);
    }

    startTransition(async () => {
      try {
        await updateAction(formData);
        setEditing(false);
        if (changes.length > 0) {
          toast.success(`Slot updated: ${changes.join(", ")}.`);
        } else {
          toast.success("No changes to this slot.");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update date.");
      }
    });
  }

  function handleCancel() {
    setConfirmOpen(true);
  }

  function handleConfirmCancel() {
    const cleanReason = reason.trim();
    if (needsReason && !cleanReason) return;

    startTransition(async () => {
      try {
        await cancelAction(slot.id, needsReason ? cleanReason : undefined);
        onCancelled(slot.id);
        toast.success(`Date ${slot.dateLabel} cancelled.`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not cancel date.");
      }
    });
  }

  if (editing) {
    return (
      <li className="rounded-xl border border-border/70 bg-background/90 p-3">
        <form onSubmit={handleEdit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor={`slot-date-${slot.id}`}>Date</Label>
            <input id={`slot-date-${slot.id}`} name="date" type="date" defaultValue={slot.dateInput} required className={inputClassName} />
          </div>
          <div className="w-full space-y-1.5 sm:w-40">
            <Label htmlFor={`slot-reserved-${slot.id}`}>Reserved</Label>
            <input
              id={`slot-reserved-${slot.id}`}
              name="reserved"
              type="number"
              min="0"
              max={MAX_SLOT_CAPACITY}
              defaultValue={slot.reserved}
              required
              className={inputClassName}
            />
          </div>
          <div className="w-full space-y-1.5 sm:w-40">
            <Label htmlFor={`slot-capacity-${slot.id}`}>Capacity</Label>
            <input id={`slot-capacity-${slot.id}`} name="capacity" type="number" min={slot.booked + slot.reserved} max={MAX_SLOT_CAPACITY} defaultValue={slot.capacity} required className={inputClassName} />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" className="rounded-full" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              disabled={isPending}
              onClick={() => setEditing(false)}
              aria-label="Cancel editing"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border/70 bg-background/90 px-3 py-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-sm font-medium text-foreground">{slot.dateLabel}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium",
              slot.spotsLeft === 0
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
            )}
          >
            {slot.spotsLeft === 0
              ? "Full"
              : `${pluralize(slot.spotsLeft, "spot")} left`}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {slot.booked} booked{slot.reserved > 0 ? ` · ${slot.reserved} reserved` : ""} / {slot.capacity}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="rounded-full"
              onClick={() => setEditing(true)}
              aria-label={`Edit ${slot.dateLabel}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="rounded-full text-destructive hover:bg-destructive/10"
              disabled={isPending}
              onClick={handleCancel}
              aria-label={`Cancel ${slot.dateLabel}`}
            >
              <Ban className="h-3 w-3" />
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {confirmOpen ? (
        <div className="flex w-full flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          <p className="text-sm font-medium text-destructive">
            Cancel the date {slot.dateLabel}?
          </p>
          <p className="text-xs text-muted-foreground">
            {needsReason
              ? `${pluralize(slot.bookingCount, "booking")} ${slot.bookingCount === 1 ? "is" : "are"} on this date and will be notified by email. Travellers will no longer be able to book this date.`
              : "Travellers will no longer be able to book this date."}
          </p>
          {needsReason ? (
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Tell us why you're cancelling this date…"
              rows={2}
              autoFocus
              className={`w-full resize-none rounded-xl border ${FORM_FIELD_BORDER} bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-destructive/40 focus:ring-2 focus:ring-destructive/20`}
            />
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="rounded-full"
              disabled={isPending || (needsReason && !reason.trim())}
              onClick={handleConfirmCancel}
            >
              <Ban className="h-3.5 w-3.5" />
              {isPending ? "Cancelling…" : "Cancel date"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full border-2 border-black text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={isPending}
              onClick={() => {
                setConfirmOpen(false);
                setReason("");
              }}
            >
              <X className="h-3.5 w-3.5" />
              Back
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
