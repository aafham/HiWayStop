'use client';

import { useMemo } from 'react';
import { MapContainer, Marker, Popup, Polyline, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Highway, LatLng, PlaceItem } from '@/types';

type HighwayMapProps = {
  userLoc: LatLng | null;
  highways: Highway[];
  places: PlaceItem[];
  onSelect: (item: PlaceItem) => void;
};

const userIcon = new L.DivIcon({
  html: '<div style="width:14px;height:14px;border-radius:999px;background:#0f6d53;border:2px solid white;box-shadow:0 0 0 3px rgba(15,109,83,0.25)"></div>',
  className: '',
  iconSize: [14, 14],
});

function pinColor(kind: PlaceItem['kind']): string {
  return kind === 'RNR' ? '#159570' : '#0ea5e9';
}

function placeIcon(kind: PlaceItem['kind']): L.DivIcon {
  const color = pinColor(kind);
  return new L.DivIcon({
    html: `<div style="width:12px;height:12px;border-radius:999px;background:${color};border:2px solid white;box-shadow:0 0 0 2px rgba(15,23,42,0.2)"></div>`,
    className: '',
    iconSize: [12, 12],
  });
}

export default function HighwayMap({ userLoc, highways, places, onSelect }: HighwayMapProps) {
  const center = userLoc ?? { lat: 3.139, lng: 101.6869 };

  const polylines = useMemo(() => highways.map((h) => h.polyline.map((p) => [p.lat, p.lng] as [number, number])), [highways]);

  return (
    <div className="h-[45vh] w-full overflow-hidden border-b border-slate-200">
      <MapContainer center={[center.lat, center.lng]} zoom={8} scrollWheelZoom className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />

        {polylines.map((polyline, idx) => (
          <Polyline key={highways[idx].id} positions={polyline} color="#334155" weight={3} opacity={0.7} />
        ))}

        {userLoc ? (
          <Marker position={[userLoc.lat, userLoc.lng]} icon={userIcon}>
            <Popup>Lokasi semasa anda</Popup>
          </Marker>
        ) : null}

        {places.map((place) => (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            icon={placeIcon(place.kind)}
            eventHandlers={{ click: () => onSelect(place) }}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-semibold">{place.name}</p>
                <p>{place.highwayId}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

