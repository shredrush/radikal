"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";

import type { TripsExplorerMapTrip } from "@/components/trips/trips-explorer";

type TripsMapProps = { trips: TripsExplorerMapTrip[] };

const DEFAULT_CENTER: [number, number] = [32.23607, 77.22247];
const PROTOMAPS_STYLE_URL = "https://api.protomaps.com/styles/v4/light/en.json";

function publicCoordinate(value: number) {
  // Generalize stored trailhead coordinates to approximately 110m before public delivery.
  return Math.round(value * 1_000) / 1_000;
}

function toFeatureCollection(trips: TripsExplorerMapTrip[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: trips.flatMap((trip) => {
      if (
        trip.latitude === null || trip.latitude === undefined ||
        trip.longitude === null || trip.longitude === undefined ||
        !Number.isFinite(trip.latitude) || !Number.isFinite(trip.longitude)
      ) return [];

      return [{
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [publicCoordinate(trip.longitude), publicCoordinate(trip.latitude)],
        },
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

function fitMapToTrips(map: MapLibreMap, data: GeoJSON.FeatureCollection<GeoJSON.Point>) {
  if (data.features.length === 0) return;
  const bounds = new maplibregl.LngLatBounds();
  data.features.forEach((feature) => bounds.extend(feature.geometry.coordinates as [number, number]));
  map.fitBounds(bounds, { padding: 56, maxZoom: 11, duration: 0 });
}

export function TripsMap({ trips }: TripsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const dataRef = useRef(toFeatureCollection(trips));
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const apiKey = process.env.PROTOMAPS_API_KEY;

  useEffect(() => {
    if (!containerRef.current || !apiKey) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `${PROTOMAPS_STYLE_URL}?key=${encodeURIComponent(apiKey)}`,
      center: DEFAULT_CENTER,
      zoom: 4,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    const handleLoad = () => {
      const data = dataRef.current;
      setError(null);
      map.addSource("trips", { type: "geojson", data, cluster: true, clusterMaxZoom: 13, clusterRadius: 48 });
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
      fitMapToTrips(map, data);
    };

    const handleError = () => setError("The map could not be loaded. Please try again later.");
    map.once("load", handleLoad);
    map.on("error", handleError);
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

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [apiKey, retryToken]);

  useEffect(() => {
    const data = toFeatureCollection(trips);
    dataRef.current = data;
    const map = mapRef.current;
    if (!map || !map.getSource("trips")) return;
    (map.getSource("trips") as maplibregl.GeoJSONSource).setData(data);
    fitMapToTrips(map, data);
  }, [trips]);

  if (!apiKey) {
    return <MapMessage message="Map view is not configured yet. Add PROTOMAPS_API_KEY to enable it." />;
  }

  return (
    <section className="space-y-3" aria-label="Map of matching trips">
      <div className="relative overflow-hidden rounded-[1.5rem] border border-border/80 bg-muted/20">
        <div ref={containerRef} className="h-[60svh] min-h-80 w-full sm:h-[32rem]" />
        {trips.length === 0 ? <MapMessage message="No matching trips have approved public map coordinates yet." overlay /> : null}
        {error ? (
          <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-background/95 p-3 text-sm text-destructive shadow">
            <span>{error}</span>
            <button type="button" onClick={() => setRetryToken((value) => value + 1)} className="font-semibold underline underline-offset-4">Retry</button>
          </div>
        ) : null}
      </div>
      <details className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm">
        <summary className="cursor-pointer font-semibold text-foreground">Trip locations ({trips.length})</summary>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {trips.map((trip) => <li key={trip.id}><a className="underline underline-offset-4" href={`/trips/${trip.slug}`}>{trip.title} <span className="text-muted-foreground">({trip.location})</span></a></li>)}
        </ul>
      </details>
    </section>
  );
}

function MapMessage({ message, overlay = false }: { message: string; overlay?: boolean }) {
  return <div className={overlay ? "absolute inset-4 flex items-center justify-center rounded-xl border border-dashed border-border/80 bg-background/90 p-8 text-center text-sm text-muted-foreground" : "rounded-[1.5rem] border border-dashed border-border/80 bg-muted/20 p-8 text-center text-sm text-muted-foreground"}>{message}</div>;
}
