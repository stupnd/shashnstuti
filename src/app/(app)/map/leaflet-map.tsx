"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { MapPin } from "./page";

function pinIcon(url: string | null, milestone: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [44, 52],
    iconAnchor: [22, 52],
    popupAnchor: [0, -50],
    html: `<div class="map-pin ${milestone ? "map-pin-milestone" : ""}">${
      url ? `<img src="${url}" alt="" />` : `<span>·</span>`
    }</div>`,
  });
}

function FitAll({ pins }: { pins: MapPin[] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || pins.length === 0) return;
    done.current = true;
    const b = L.latLngBounds(pins.map((p) => [p.lat, p.lng]));
    map.fitBounds(b.pad(0.2), { maxZoom: 12 });
  }, [map, pins]);
  return null;
}

export default function LeafletMap({ pins }: { pins: MapPin[] }) {
  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      scrollWheelZoom
      className="h-full w-full"
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitAll pins={pins} />
      {pins.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(p.photos[0]?.url ?? null, p.milestone)}>
          <Popup minWidth={220}>
            <div className="map-popup">
              <div className="map-popup-photos">
                {p.photos.slice(0, 3).map((ph) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={ph.url} src={ph.url} alt="" />
                ))}
              </div>
              <p className="map-popup-title">{p.title ?? p.place ?? "a moment"}</p>
              <p className="map-popup-meta">{p.date}{p.place ? ` · ${p.place}` : ""}</p>
              <a href={`/entry/${p.id}`} className="map-popup-link">open →</a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
