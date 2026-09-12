"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { FORM_FIELD_BORDER } from "@/lib/boundary-styles";

export function AdminUserSearch({ initialQuery, role }: { initialQuery: string; role?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    const normalizedQuery = query.trim().slice(0, 100);
    if (normalizedQuery === initialQuery) return;

    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (role) params.set("role", role);
      if (normalizedQuery) params.set("q", normalizedQuery);
      const nextQuery = params.toString();
      startTransition(() => {
        router.replace(`/admin/users${nextQuery ? `?${nextQuery}` : ""}`, { scroll: false });
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [initialQuery, query, role, router]);

  return (
    <div className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search name, email, or username"
        aria-label="Search users"
        className={`h-10 w-full rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 pl-9 pr-3 text-sm shadow-sm outline-none transition focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`}
      />
    </div>
  );
}
