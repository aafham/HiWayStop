'use client';

import { useEffect, useMemo } from 'react';
import { Circle, MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { haversineKm } from '@/lib/geo';
import { Highway, LatLng, PlaceItem } from '@/types';

type HighwayMapProps = {
  userLoc: LatLng | null;
  highways: Highway[];
  places: PlaceItem[];
  onSelect: (item: PlaceItem) => void;
  rangeKm: number | null;
};

const userIcon = new L.DivIcon({
  html: '<div style="width:18px;height:18px;border-radius:999px;background:#0f6d53;border:3px solid white;box-shadow:0 0 0 5px rgba(15,109,83,0.22)"></div>',
  className: '',
  iconSize: [18, 18],
});

function pinColor(kind: PlaceItem['kind'], inRange: boolean): string {
  if (!inRange) return '#94a3b8';
  return kind === 'RNR' ? '#159570' : '#0ea5e9';
}

function placeIcon(kind: PlaceItem['kind'], inRange: boolean): L.DivIcon {
  const color = pinColor(kind, inRange);
  return new L.DivIcon({
    html: `<div style="width:12px;height:12px;border-radius:999px;background:${color};border:2px solid white;box-shadow:0 0 0 2px rgba(15,23,42,0.2)"></div>`,
    className: '',
    iconSize: [12, 12],
  });
}

function RecenterMap({ userLoc }: { userLoc: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (!userLoc) return;
    map.setView([userLoc.lat, userLoc.lng], Math.max(map.getZoom(), 11), { animate: true });
  }, [map, userLoc]);
  return null;
}

export default function HighwayMap({ userLoc, highways, places, onSelect, rangeKm }: HighwayMapProps) {
  const center = userLoc ?? { lat: 3.139, lng: 101.6869 };
  const polylines = useMemo(() => highways.map((h) => h.polyline.map((p) => [p.lat, p.lng] as [number, number])), [highways]);
  const hasPlaces = places.length > 0;

  return (
    <div className="relative h-[36vh] w-full overflow-hidden rounded-2xl border border-slate-200/80">
      <MapContainer center={[center.lat, center.lng]} zoom={8} scrollWheelZoom className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        <RecenterMap userLoc={userLoc} />

        {polylines.map((polyline, idx) => (
          <Polyline key={highways[idx].id} positions={polyline} color="#334155" weight={3} opacity={0.7} />
        ))}

        {userLoc ? (
          <>
            <Circle center={[userLoc.lat, userLoc.lng]} radius={250} pathOptions={{ color: '#0f6d53', fillColor: '#0f6d53', fillOpacity: 0.12, weight: 1 }} />
            {rangeKm !== null && rangeKm > 0 ? <Circle center={[userLoc.lat, userLoc.lng]} radius={rangeKm * 1000} pathOptions={{ color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.06, weight: 2, dashArray: '6 5' }} /> : null}
            <Marker position={[userLoc.lat, userLoc.lng]} icon={userIcon}><Popup>Your current location</Popup></Marker>
          </>
        ) : null}

        {places.map((place) => {
          const inRange = !userLoc || !rangeKm || rangeKm <= 0 || haversineKm(userLoc, { lat: place.lat, lng: place.lng }) <= rangeKm;
          return (
            <Marker key={place.id} position={[place.lat, place.lng]} icon={placeIcon(place.kind, inRange)} eventHandlers={{ click: () => onSelect(place) }}>
              <Popup>
                <div className="text-xs">
                  <p className="font-semibold">{place.name}</p>
                  <p>{place.highwayId}</p>
                  {!inRange ? <p className="text-slate-500">Out of fuel range</p> : null}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {!hasPlaces ? (
        <div className="absolute left-1/2 top-3 z-[500] w-[88%] max-w-sm -translate-x-1/2 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-lg">
          No map pins for current filters. Try increasing corridor buffer or reset filters.
        </div>
      ) : null}

      <div className="absolute bottom-3 left-3 rounded-xl border border-slate-200/80 bg-white/95 px-2.5 py-2 text-[10px] font-semibold text-slate-700 shadow-lg backdrop-blur">
        <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Legend</p>
        <div className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#159570]" />R&R</div>
        <div className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#0ea5e9]" />Fuel</div>
        <div className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#0f6d53]" />Your location</div>
        <div className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#94a3b8]" />Off-range</div>
      </div>
    </div>
  );
}
