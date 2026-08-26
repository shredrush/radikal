"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdminTripForm } from "@/components/admin/admin-trip-form";

export function AddTripForm({
  guides,
}: {
  guides: Array<{ id: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button className="self-start rounded-full" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        Add a trip
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => setOpen(false)}>
          <X className="h-3.5 w-3.5" />
          Close
        </Button>
      </div>
      <AdminTripForm guides={guides} />
    </div>
  );
}
