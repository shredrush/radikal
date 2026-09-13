"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";

import type { TripsExplorerMapTrip } from "@/components/trips/trips-explorer";

type TripsMapProps = { hasTrips: boolean; search: string; styleUrl: string };

const DEFAULT_CENTER: [number, number] = [77.22247, 32.23607];

function toFeatureCollection(trips: TripsExplorerMapTrip[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: trips.flatMap((trip) => {
      if (trip.latitude === null || trip.longitude === null) return [];
      return [{
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [trip.longitude, trip.latitude] },
        properties: {
          title: trip.title,
          slug: trip.slug,
          location: trip.location,
          price: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(trip.priceInRupees),
        },
      }];
    }),
  };
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

export function TripsMap({ hasTrips, search, styleUrl }: TripsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
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
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;
    setTrips([]);
    setTruncated(false);
    setError(null);

    let active = true;
    let controller: AbortController | null = null;
    let moveTimer: ReturnType<typeof setTimeout> | null = null;
    const loadViewport = async () => {
      controller?.abort();
      controller = new AbortController();
      const bounds = map.getBounds();
      const params = new URLSearchParams(search);
      params.set("west", String(bounds.getWest()));
      params.set("east", String(bounds.getEast()));
      params.set("south", String(bounds.getSouth()));
      params.set("north", String(bounds.getNorth()));

      try {
        const response = await fetch(`/api/trips/map?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Map data request failed");
        const payload = await response.json() as { trips?: TripsExplorerMapTrip[]; truncated?: boolean };
        if (!active || !Array.isArray(payload.trips)) return;
        setTrips(payload.trips);
        setTruncated(Boolean(payload.truncated));
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
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
        clusterMaxZoom: 13,
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
        paint: { "circle-color": "#d97706", "circle-radius": 9, "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" },
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
        const slug = encodeURIComponent(String(properties.slug ?? ""));
        new maplibregl.Popup({ offset: 12 })
          .setLngLat(coordinates)
          .setHTML(`<div class="trip-map-popup"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(location)}</span><span>${escapeHtml(price)}</span><a href="/trips/${slug}">View trip</a></div>`)
          .addTo(map);
      });
      void loadViewport();
    };

    map.once("load", handleLoad);
    map.on("error", handleError);
    map.on("moveend", handleMoveEnd);

    return () => {
      active = false;
      controller?.abort();
      if (moveTimer) clearTimeout(moveTimer);
      map.remove();
      mapRef.current = null;
    };
  }, [hasTrips, retryToken, search, styleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource("trips")) return;
    (map.getSource("trips") as maplibregl.GeoJSONSource).setData(toFeatureCollection(trips));
  }, [trips]);

  if (!hasTrips) {
    return <MapMessage message="No matching trips have approved public map coordinates yet." />;
  }

  return (
    <section className="space-y-3" aria-label="Map of matching trips">
      <div className="relative overflow-hidden rounded-[1.5rem] border border-border/80 bg-muted/20">
        <div ref={containerRef} className="relative h-[60svh] min-h-80 w-full overflow-hidden sm:h-[32rem]" />
        {truncated ? <div className="absolute inset-x-4 top-4 rounded-xl border border-border/70 bg-background/95 p-3 text-center text-xs text-muted-foreground shadow">Showing the newest 250 trips in this area. Zoom in for more detail.</div> : null}
        {error ? <div role="alert" className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-background/95 p-3 text-sm text-destructive shadow"><span>{error}</span><button type="button" onClick={() => setRetryToken((value) => value + 1)} className="font-semibold underline underline-offset-4">Retry</button></div> : null}
      </div>
      <details className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm">
        <summary className="cursor-pointer font-semibold text-foreground">Trip locations in this area ({trips.length})</summary>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {trips.map((trip) => <li key={trip.id}><a className="underline underline-offset-4" href={`/trips/${trip.slug}`}>{trip.title} <span className="text-muted-foreground">({trip.location})</span></a></li>)}
        </ul>
      </details>
    </section>
  );
}

function MapMessage({ message }: { message: string }) {
  return <div className="rounded-[1.5rem] border border-dashed border-border/80 bg-muted/20 p-8 text-center text-sm text-muted-foreground">{message}</div>;
}
