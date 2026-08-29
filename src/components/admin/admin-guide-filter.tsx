"use client";

import { useRouter } from "next/navigation";
import { Users } from "lucide-react";

import { FORM_FIELD_BORDER } from "@/lib/boundary-styles";
import { Label } from "@/components/ui/label";

export function AdminGuideFilter({
  guides,
  selectedGuideId,
  type,
}: {
  guides: Array<{ id: string; name: string }>;
  selectedGuideId: string;
  type?: string;
}) {
  const router = useRouter();

  return (
    <div className="space-y-1.5">
      <Label htmlFor="guide-filter" className="flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        Filter by guide
      </Label>
      <select
        id="guide-filter"
        value={selectedGuideId}
        onChange={(event) => {
          const params = new URLSearchParams();
          if (type) params.set("type", type);
          const guideId = event.target.value;
          if (guideId) params.set("guide", guideId);
          const query = params.toString();
          router.push(`/admin/trips${query ? `?${query}` : ""}`);
        }}
        className={`h-10 min-w-56 rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`}
      >
        <option value="">All guides</option>
        {guides.map((guide) => (
          <option key={guide.id} value={guide.id}>
            {guide.name}
          </option>
        ))}
      </select>
    </div>
  );
}
