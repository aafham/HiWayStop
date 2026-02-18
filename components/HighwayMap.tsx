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

  return (
    <div className="relative h-[45vh] w-full overflow-hidden border-b border-slate-200">
      <MapContainer center={[center.lat, center.lng]} zoom={8} scrollWheelZoom className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        <RecenterMap userLoc={userLoc} />

        {polylines.map((polyline, idx) => (
          <Polyline key={highways[idx].id} positions={polyline} color="#334155" weight={3} opacity={0.7} />
        ))}

        {userLoc ? (
          <>
            <Circle
              center={[userLoc.lat, userLoc.lng]}
              radius={250}
              pathOptions={{ color: '#0f6d53', fillColor: '#0f6d53', fillOpacity: 0.12, weight: 1 }}
            />
            {rangeKm !== null && rangeKm > 0 ? (
              <Circle
                center={[userLoc.lat, userLoc.lng]}
                radius={rangeKm * 1000}
                pathOptions={{ color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.06, weight: 2, dashArray: '6 5' }}
              />
            ) : null}
            <Marker position={[userLoc.lat, userLoc.lng]} icon={userIcon}>
              <Popup>Lokasi semasa anda</Popup>
            </Marker>
          </>
        ) : null}

        {places.map((place) => {
          const inRange = !userLoc || !rangeKm || rangeKm <= 0 || haversineKm(userLoc, { lat: place.lat, lng: place.lng }) <= rangeKm;
          return (
            <Marker
              key={place.id}
              position={[place.lat, place.lng]}
              icon={placeIcon(place.kind, inRange)}
              eventHandlers={{ click: () => onSelect(place) }}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-semibold">{place.name}</p>
                  <p>{place.highwayId}</p>
                  {!inRange ? <p className="text-slate-500">Luar fuel range</p> : null}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="absolute bottom-3 left-3 rounded-xl bg-white/95 p-2 text-[10px] font-semibold text-slate-700 shadow">
        <p className="mb-1">Legenda</p>
        <div className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#159570]" />R&R</div>
        <div className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#0ea5e9]" />Minyak</div>
        <div className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#0f6d53]" />Lokasi anda</div>
        <div className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#94a3b8]" />Off-range</div>
      </div>
    </div>
  );
}
