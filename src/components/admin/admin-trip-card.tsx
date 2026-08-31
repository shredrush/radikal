"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdminTripForm } from "@/components/admin/admin-trip-form";
import { toSlotItem } from "@/lib/slot-item";
import { formatDurationDays } from "@/lib/trip-dates";

type AdminTripCardProps = {
  trip: {
    id: string;
    title: string;
    slug: string;
    type: string;
    location: string;
    description: string;
    priceInRupees: number;
    durationDays: number;
    maxGroupSize: number;
    categories: string[];
    images: string[];
    videos: string[];
    mediaOrder: string[];
    guidePhoto: string | null;
    guideId: string | null;
    guide: { id: string; name: string } | null;
    tripLocation: { pickup: string; drop: string } | null;
    inclusions: Array<{ included: boolean; item: string }>;
    highlights: Array<{ text: string }>;
    slots: Array<{
      id: string;
      date: Date | string;
      capacity: number;
      booked: number;
      reserved: number;
      _count: { bookings: number };
    }>;
  };
  guides: Array<{ id: string; name: string; photo: string | null; photos: string[]; videos: string[] }>;
};

export function AdminTripCard({ trip, guides }: AdminTripCardProps) {
  const [editing, setEditing] = useState(false);

  return (
    <li className="rounded-[1.25rem] border border-border/70 bg-background/95 p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{trip.title}</p>
          <p className="truncate text-sm text-muted-foreground">
            {trip.location} · {formatDurationDays(trip.durationDays)}
            {trip.guide ? ` · ${trip.guide.name}` : " · No guide linked"}
          </p>
        </div>
        <Button
          type="button"
          variant={editing ? "default" : "outline"}
          size="sm"
          className="shrink-0 rounded-full"
          onClick={() => setEditing((value) => !value)}
        >
          {editing ? (
            <>
              <X className="h-3.5 w-3.5" />
              Close
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              Edit trip
            </>
          )}
        </Button>
      </div>

      {editing ? (
        <div className="mt-4 border-t border-border/70 pt-4">
          <AdminTripForm
            trip={trip}
            guides={guides}
            slots={trip.slots.map(toSlotItem)}
            supplemental={{
              pickup: trip.tripLocation?.pickup ?? "",
              drop: trip.tripLocation?.drop ?? "",
              inclusions: trip.inclusions.filter((item) => item.included).map((item) => item.item),
              exclusions: trip.inclusions.filter((item) => !item.included).map((item) => item.item),
              highlights: trip.highlights.map((item) => item.text),
            }}
            onSaved={() => setEditing(false)}
          />
        </div>
      ) : null}
    </li>
  );
}
