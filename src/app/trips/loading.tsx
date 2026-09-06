import { TripsCatalogSkeleton, TripsPageTemplate } from "@/components/trips/trips-page-template";

export default function TripsLoading() {
  return (
    <TripsPageTemplate>
      <TripsCatalogSkeleton />
    </TripsPageTemplate>
  );
}
