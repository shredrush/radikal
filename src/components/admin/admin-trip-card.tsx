"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdminTripForm } from "@/components/admin/admin-trip-form";
import { toSlotItem } from "@/lib/slot-item";
import { formatDurationDays } from "@/lib/trip-dates";
import type { TripSportOption } from "@/components/trips/trip-sport-selector";
import { TripActiveToggle } from "@/components/trips/trip-active-toggle";

type AdminTripCardProps = {
  trip: {
    id: string;
    active: boolean;
    title: string;
    slug: string;
    type: string;
    location: string;
    latitude: number | null;
    longitude: number | null;
    mapVisible: boolean;
    description: string;
    itinerary: string;
    priceInRupees: number;
    durationDays: number;
    maxGroupSize: number;
    categories: string[];
    images: string[];
    videos: string[];
    mediaOrder: string[];
    guideId: string | null;
    sportLinks: Array<{ sport: TripSportOption }>;
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
  guides: Array<{ id: string; name: string }>;
  sports: TripSportOption[];
};

export function AdminTripCard({ trip, guides, sports }: AdminTripCardProps) {
  const [editing, setEditing] = useState(false);

  return (
    <li className="rounded-[1.25rem] border border-border/70 bg-background/95 p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate font-semibold text-foreground">{trip.title}</p>
            {trip.active ? (
              <Link
                href={`/trips/${trip.slug}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${trip.title}`}
                title="Open trip"
                className="inline-flex text-primary transition hover:text-primary/75"
              >
                <ExternalLink className="size-3" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {trip.location} · {formatDurationDays(trip.durationDays)}
            {trip.guide ? ` · ${trip.guide.name}` : " · No guide linked"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TripActiveToggle tripId={trip.id} active={trip.active} />
          <Button
            type="button"
            variant={editing ? "default" : "outline"}
            size="sm"
            className={editing
              ? "shrink-0 rounded-full border-2 border-black bg-transparent text-destructive hover:bg-destructive/10 hover:text-destructive"
              : "shrink-0 rounded-full"}
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
      </div>

      {editing ? (
        <div className="mt-4 border-t border-border/70 pt-4">
          <AdminTripForm
            trip={trip}
            guides={guides}
            sports={sports}
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
