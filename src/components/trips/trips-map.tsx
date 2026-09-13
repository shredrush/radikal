"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";

import type { TripsExplorerMapTrip } from "@/components/trips/trips-explorer";
import { getTripCardImage } from "@/lib/trip-card-image";

type TripsMapProps = { hasTrips: boolean; search: string; styleUrl: string };

const DEFAULT_CENTER: [number, number] = [77.22247, 32.23607];
// The configured OpenFreeMap tiles stop rendering beyond zoom level 14.
const MAX_MAP_ZOOM = 14;

function toFeatureCollection(trips: TripsExplorerMapTrip[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: trips.flatMap((trip) => {
      if (
        trip.latitude === null ||
        trip.longitude === null ||
        !Number.isFinite(trip.latitude) ||
        !Number.isFinite(trip.longitude)
      ) return [];
      return [{
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [trip.longitude, trip.latitude] },
        properties: {
          title: trip.title,
          slug: trip.slug,
          location: trip.location,
          price: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(trip.priceInRupees),
          image: getTripCardImage(trip),
        },
      }];
    }),
  };
}

function fitMapToTrips(map: MapLibreMap, data: GeoJSON.FeatureCollection<GeoJSON.Point>) {
  if (data.features.length === 0) return;

  const bounds = new maplibregl.LngLatBounds();
  data.features.forEach((feature) => bounds.extend(feature.geometry.coordinates as [number, number]));
  map.fitBounds(bounds, { padding: 56, duration: 0 });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

function getPopupHtml({ title, location, price, slug, image }: { title: string; location: string; price: string; slug: string; image: string }) {
  return `<a class="trip-map-popup" href="/trips/${encodeURIComponent(slug)}"><img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" /><span class="trip-map-popup-content"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(location)}</span><b>${escapeHtml(price)}</b><em>View trip</em></span></a>`;
}

function addTripMarkers(map: MapLibreMap, trips: TripsExplorerMapTrip[]) {
  return trips.flatMap((trip) => {
    if (
      trip.latitude === null ||
      trip.longitude === null ||
      !Number.isFinite(trip.latitude) ||
      !Number.isFinite(trip.longitude)
    ) return [];

    const marker = new maplibregl.Marker({ color: "#111111", scale: 1.1 })
      .setLngLat([trip.longitude, trip.latitude])
      .setPopup(
        new maplibregl.Popup({ offset: 18 }).setHTML(
          getPopupHtml({
            title: trip.title,
            location: trip.location,
            price: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(trip.priceInRupees),
            slug: trip.slug,
            image: getTripCardImage(trip),
          }),
        ),
      )
      .addTo(map);
    marker.getElement().setAttribute("aria-label", `View ${trip.title}`);
    return [marker];
  });
}

export function TripsMap({ hasTrips, search, styleUrl }: TripsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);
  const hasFittedTripsRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [trips, setTrips] = useState<TripsExplorerMapTrip[]>([]);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !hasTrips) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: DEFAULT_CENTER,
      zoom: 4,
      maxZoom: MAX_MAP_ZOOM,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;
    hasFittedTripsRef.current = false;
    setTrips([]);
    setTruncated(false);
    setError(null);

    let active = true;
    let controller: AbortController | null = null;
    let moveTimer: ReturnType<typeof setTimeout> | null = null;
    let latestRequest = 0;
    const loadViewport = async (includeAll = false) => {
      controller?.abort();
      controller = new AbortController();
      const requestId = ++latestRequest;
      const bounds = map.getBounds();
      const params = new URLSearchParams(search);
      params.set("west", String(bounds.getWest()));
      params.set("east", String(bounds.getEast()));
      params.set("south", String(bounds.getSouth()));
      params.set("north", String(bounds.getNorth()));
      if (includeAll) params.set("initial", "1");

      try {
        const response = await fetch(`/api/trips/map?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Map data request failed");
        const payload = await response.json() as { trips?: TripsExplorerMapTrip[]; truncated?: boolean };
        if (!active || requestId !== latestRequest || !Array.isArray(payload.trips)) return;
        setTrips(payload.trips);
        setTruncated(Boolean(payload.truncated));
        setError(null);
      } catch (fetchError) {
        if (!active || requestId !== latestRequest || (fetchError instanceof DOMException && fetchError.name === "AbortError")) return;
        if (active) setError("Trip locations could not be loaded. Please try again later.");
      }
    };
    const handleMoveEnd = () => {
      if (moveTimer) clearTimeout(moveTimer);
      moveTimer = setTimeout(() => void loadViewport(), 250);
    };
    const handleError = () => {
      // Tile and glyph requests can fail independently after the basemap is
      // rendered; only treat an error before style load as a fatal map failure.
      if (!map.isStyleLoaded()) {
        setError("The map could not be loaded. Please try again later.");
      }
    };
    const handleLoad = () => {
      // The map is mounted after a client-side view transition. Resize on the
      // next frame so MapLibre measures the final, visible container bounds.
      requestAnimationFrame(() => map.resize());
      map.addSource("trips", {
        type: "geojson",
        data: toFeatureCollection([]),
        cluster: true,
        clusterRadius: 48,
      });
      map.addLayer({
        id: "trip-clusters",
        type: "circle",
        source: "trips",
        filter: ["has", "point_count"],
        paint: { "circle-color": "#111111", "circle-radius": ["step", ["get", "point_count"], 18, 10, 23, 30, 28], "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" },
      });
      map.addLayer({
        id: "trip-cluster-count",
        type: "symbol",
        source: "trips",
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Regular"], "text-size": 12 },
        paint: { "text-color": "#ffffff" },
      });
      map.addLayer({
        id: "trip-points",
        type: "circle",
        source: "trips",
        filter: ["!", ["has", "point_count"]],
        paint: { "circle-color": "#111111", "circle-radius": 9, "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" },
      });
      map.on("click", "trip-clusters", (event) => {
        const feature = map.queryRenderedFeatures(event.point, { layers: ["trip-clusters"] })[0];
        const clusterId = feature?.properties?.cluster_id;
        if (typeof clusterId !== "number") return;
        const source = map.getSource("trips") as maplibregl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId).then((zoom) => {
          const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
          map.easeTo({ center: coordinates, zoom });
        }).catch(() => undefined);
      });
      map.on("click", "trip-points", (event) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;
        const properties = feature.properties ?? {};
        const coordinates = feature.geometry.coordinates as [number, number];
        const title = String(properties.title ?? "Trip");
        const location = String(properties.location ?? "");
        const price = String(properties.price ?? "");
        const slug = String(properties.slug ?? "");
        const image = String(properties.image ?? "");
        new maplibregl.Popup({ offset: 12 })
          .setLngLat(coordinates)
          .setHTML(getPopupHtml({ title, location, price, slug, image }))
          .addTo(map);
      });
      void loadViewport(true);
    };

    map.once("load", handleLoad);
    map.on("error", handleError);
    map.on("moveend", handleMoveEnd);

    return () => {
      active = false;
      controller?.abort();
      if (moveTimer) clearTimeout(moveTimer);
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [hasTrips, retryToken, search, styleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const data = toFeatureCollection(trips);
    const source = map.getSource("trips") as maplibregl.GeoJSONSource | undefined;
    source?.setData(data);
    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = addTripMarkers(map, trips);

    if (!hasFittedTripsRef.current && data.features.length > 0) {
      hasFittedTripsRef.current = true;
      fitMapToTrips(map, data);
    }
  }, [trips]);

  if (!hasTrips) {
    return <MapMessage message="No matching trips have approved public map coordinates yet." />;
  }

  return (
    <section className="space-y-3" aria-label="Map of matching trips">
      <div className="relative overflow-hidden rounded-[1.5rem] border border-border/80 bg-muted/20">
        <div ref={containerRef} className="relative h-[60svh] min-h-80 w-full overflow-hidden sm:h-[32rem]" />
        <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-background/80 px-2 py-1 text-[10px] text-muted-foreground shadow-sm">Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://openfreemap.org/">OpenFreeMap</a></div>
        {truncated ? <div className="absolute inset-x-4 top-4 rounded-xl border border-border/70 bg-background/95 p-3 text-center text-xs text-muted-foreground shadow">Showing the newest 250 trips in this area. Zoom in for more detail.</div> : null}
        {error ? <div role="alert" className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-background/95 p-3 text-sm text-destructive shadow"><span>{error}</span><button type="button" onClick={() => setRetryToken((value) => value + 1)} className="font-semibold underline underline-offset-4">Retry</button></div> : null}
      </div>
    </section>
  );
}

function MapMessage({ message }: { message: string }) {
  return <div className="rounded-[1.5rem] border border-dashed border-border/80 bg-muted/20 p-8 text-center text-sm text-muted-foreground">{message}</div>;
}
