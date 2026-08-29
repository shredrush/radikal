"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdminGuideForm } from "@/components/admin/admin-guide-form";

export function AddGuideForm() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        className="rounded-full bg-orange-100 text-orange-800 hover:bg-orange-200"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        Add a guide
      </Button>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => setOpen(false)}>
          <X className="h-3.5 w-3.5" />
          Close
        </Button>
      </div>
      <div className="rounded-[1.25rem] border border-border/70 bg-muted/20 p-4">
        <AdminGuideForm />
      </div>
    </div>
  );
}
