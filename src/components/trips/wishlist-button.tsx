"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";

import { toggleWishlist } from "@/lib/actions/wishlist";
import { cn } from "@/lib/utils";

export function WishlistButton({
  tripId,
  initialWishlisted,
  size = "md",
  className,
}: {
  tripId: string;
  initialWishlisted: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleWishlist(tripId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setWishlisted(result.inWishlist);
      toast.success(
        result.inWishlist ? "Added to wishlist." : "Removed from wishlist.",
      );
    });
  }

  return (
    <div className={cn("group/wishlist relative", className)}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        aria-pressed={wishlisted}
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
          size === "sm" ? "size-8" : "size-10",
          wishlisted
            ? "border-rose-200 bg-rose-50 text-rose-500 dark:border-rose-500/30 dark:bg-rose-500/10"
            : "border-border/70 bg-background/70 text-muted-foreground hover:border-rose-200 hover:text-rose-500",
        )}
      >
        <Heart
          className={cn(
            size === "sm" ? "size-4" : "size-5",
            wishlisted && "fill-current",
          )}
        />
      </button>
      <span className="pointer-events-none absolute right-0 top-full z-20 mt-1.5 hidden whitespace-nowrap rounded-md bg-black px-2 py-1 text-xs font-medium text-white shadow group-hover/wishlist:block dark:bg-white dark:text-black">
        {wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      </span>
    </div>
  );
}
