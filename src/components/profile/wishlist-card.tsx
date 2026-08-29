import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";

import { Price } from "@/components/currency/price";
import { WishlistButton } from "@/components/trips/wishlist-button";
import { getTripCardImage, type TripCardImageTrip } from "@/lib/trip-card-image";
import { formatDurationDays } from "@/lib/trip-dates";

export type WishlistTrip = TripCardImageTrip & {
  id: string;
  slug: string;
  title: string;
  location: string;
  priceInRupees: number;
  durationDays: number;
};

export function WishlistCard({ trip }: { trip: WishlistTrip }) {
  return (
    <div className="overflow-hidden rounded-[1rem] border border-border/70 bg-background/60 transition-colors hover:border-border">
      <div className="flex gap-3">
        <Link
          href={`/trips/${trip.slug}`}
          className="relative h-28 w-28 shrink-0 overflow-hidden bg-muted/60 sm:w-36"
        >
          <Image
            src={getTripCardImage(trip)}
            alt={trip.title}
            fill
            className="object-cover"
            sizes="144px"
          />
        </Link>
        <div className="flex flex-1 flex-col justify-between gap-2 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={`/trips/${trip.slug}`} className="block">
                <h3 className="font-heading text-base font-semibold leading-snug text-foreground hover:underline hover:underline-offset-4">
                  {trip.title}
                </h3>
              </Link>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {trip.location}
              </p>
            </div>
            <WishlistButton tripId={trip.id} initialWishlisted size="sm" />
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
            <span className="text-xs text-muted-foreground">
              {formatDurationDays(trip.durationDays)}
            </span>
            <Price
              className="font-heading text-base font-semibold text-foreground"
              amount={trip.priceInRupees}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
