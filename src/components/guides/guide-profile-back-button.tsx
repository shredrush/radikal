"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function GuideProfileBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      back
    </button>
  );
}
