"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp } from "lucide-react";

import { SlotsManager, type SlotItem } from "@/components/admin/admin-trip-slots";
import { Button } from "@/components/ui/button";
import {
  createGuideSlotAction,
  cancelGuideSlotAction,
  updateGuideSlotAction,
} from "@/lib/actions/trip-changes";

export function GuideTripSlotsToggle({
  tripId,
  slots,
}: {
  tripId: string;
  slots: SlotItem[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={open ? "flex w-full flex-col items-end gap-3" : "flex flex-col items-end gap-3"}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <CalendarDays className="h-3.5 w-3.5" />
        {open ? "Hide slots" : "Edit slots"}
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </Button>

      {open ? (
        <div className="w-full min-w-0 border-t border-border/70 pt-3">
          <SlotsManager
            tripId={tripId}
            slots={slots}
            actions={{
              create: createGuideSlotAction,
              update: updateGuideSlotAction,
              remove: cancelGuideSlotAction,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}