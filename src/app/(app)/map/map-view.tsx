"use client";

import dynamic from "next/dynamic";
import type { MapPin } from "./page";

// Leaflet touches `window` at import time, so it can only render client-side.
const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-ink-soft">unfolding the map…</div>,
});

export function MapView({ pins }: { pins: MapPin[] }) {
  return <LeafletMap pins={pins} />;
}
