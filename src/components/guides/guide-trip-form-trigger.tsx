"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  GuideDraftData,
  GuideTripData,
} from "@/components/guides/guide-trip-form";
import type { GuideMediaItem } from "@/components/guides/guide-media-picker";
import type { TripSportOption } from "@/components/trips/trip-sport-selector";

const GuideTripForm = dynamic(
  () => import("@/components/guides/guide-trip-form").then((module) => module.GuideTripForm),
  { ssr: false, loading: () => null },
);

export function GuideTripFormTrigger({
  guideId,
  guideMedia,
  sports,
  trip,
  draft,
}: {
  guideId: string;
  guideMedia: GuideMediaItem[];
  sports: TripSportOption[];
  trip?: GuideTripData | null;
  draft?: GuideDraftData | null;
}) {
  const [open, setOpen] = useState(false);
  const isEditing = Boolean(trip);

  if (open) {
    return (
      <GuideTripForm
        guideId={guideId}
        guideMedia={guideMedia}
        sports={sports}
        trip={trip}
        draft={draft}
        initialOpen
        onClose={() => setOpen(false)}
      />
    );
  }

  return (
    <Button
      type="button"
      variant={isEditing ? "outline" : "default"}
      size="sm"
      className="rounded-full"
      onClick={() => setOpen(true)}
    >
      <Plus className="h-3.5 w-3.5" />
      {isEditing ? "Edit trip" : "Add a trip"}
    </Button>
  );
}
