import { Highway, LatLng, PlaceItem, Station } from '@/types';

const EARTH_RADIUS_M = 6371000;

export function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return (2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))) / 1000;
}

export function getETA(distanceKm: number, speedKmh = 100): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  return Math.round((distanceKm / speedKmh) * 60);
}

export function bearingDegrees(from: LatLng, to: LatLng): number {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

export function bearingToCardinal(bearing: number): 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' {
  const normalized = ((bearing % 360) + 360) % 360;
  if (normalized >= 45 && normalized < 135) return 'EAST';
  if (normalized >= 135 && normalized < 225) return 'SOUTH';
  if (normalized >= 225 && normalized < 315) return 'WEST';
  return 'NORTH';
}

function latLngToLocalMeters(origin: LatLng, p: LatLng): { x: number; y: number } {
  const latFactor = 111320;
  const lngFactor = 111320 * Math.cos(toRad(origin.lat));
  return {
    x: (p.lng - origin.lng) * lngFactor,
    y: (p.lat - origin.lat) * latFactor,
  };
}

export function distanceToSegmentMeters(point: LatLng, start: LatLng, end: LatLng): number {
  const origin = {
    lat: (start.lat + end.lat) / 2,
    lng: (start.lng + end.lng) / 2,
  };

  const p = latLngToLocalMeters(origin, point);
  const a = latLngToLocalMeters(origin, start);
  const b = latLngToLocalMeters(origin, end);

  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const ab2 = abx * abx + aby * aby;

  if (ab2 === 0) {
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / ab2));
  const projX = a.x + t * abx;
  const projY = a.y + t * aby;

  const dx = p.x - projX;
  const dy = p.y - projY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isWithinHighwayCorridor(
  point: LatLng,
  highwayPolylines: Highway[],
  bufferMeters: number,
): boolean {
  for (const highway of highwayPolylines) {
    const polyline = highway.polyline;
    for (let i = 0; i < polyline.length - 1; i += 1) {
      const dist = distanceToSegmentMeters(point, polyline[i], polyline[i + 1]);
      if (dist <= bufferMeters) return true;
    }
  }
  return false;
}

export function filterHighwayOnlyStations(
  stations: Station[],
  highways: Highway[],
  bufferMeters: number,
): Station[] {
  const byId = new Map(highways.map((h) => [h.id, h]));
  return stations.filter((station) => {
    if (station.type === 'RNR_STATION') return true;
    const highway = byId.get(station.highwayId);
    if (!highway) return false;
    return isWithinHighwayCorridor({ lat: station.lat, lng: station.lng }, [highway], bufferMeters);
  });
}

export function getNearestItems<T extends { lat: number; lng: number }>(
  userLoc: LatLng,
  items: T[],
  limit: number,
): Array<T & { distanceKm: number }> {
  return items
    .map((item) => ({ ...item, distanceKm: haversineKm(userLoc, { lat: item.lat, lng: item.lng }) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

function distanceFromPolylineStart(target: LatLng, polyline: LatLng[]): number {
  let cumulative = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestAlong = 0;

  for (let i = 0; i < polyline.length - 1; i += 1) {
    const a = polyline[i];
    const b = polyline[i + 1];

    const origin = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
    const p = latLngToLocalMeters(origin, target);
    const aa = latLngToLocalMeters(origin, a);
    const bb = latLngToLocalMeters(origin, b);
    const abx = bb.x - aa.x;
    const aby = bb.y - aa.y;
    const ab2 = abx * abx + aby * aby;

    const segLenKm = haversineKm(a, b);

    if (ab2 === 0) {
      cumulative += segLenKm;
      continue;
    }

    const t = Math.max(0, Math.min(1, ((p.x - aa.x) * abx + (p.y - aa.y) * aby) / ab2));
    const proj = {
      lat: a.lat + (b.lat - a.lat) * t,
      lng: a.lng + (b.lng - a.lng) * t,
    };

    const d = haversineKm(target, proj);
    const along = cumulative + segLenKm * t;

    if (d < bestDistance) {
      bestDistance = d;
      bestAlong = along;
    }

    cumulative += segLenKm;
  }

  return bestAlong;
}

export function getNextAlongHighway<T extends { lat: number; lng: number }>(
  userLoc: LatLng,
  highwayPolyline: LatLng[],
  direction: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST',
  items: T[],
  limit: number,
): Array<T & { distanceKm: number }> {
  const userProgress = distanceFromPolylineStart(userLoc, highwayPolyline);
  type RankedItem = {
    item: T;
    itemProgress: number;
    distanceAlong: number;
    distanceKm: number;
  };

  const ranked: RankedItem[] = items
    .map((item): RankedItem => {
      const itemProgress = distanceFromPolylineStart({ lat: item.lat, lng: item.lng }, highwayPolyline);
      const distanceAlong = itemProgress - userProgress;
      return {
        item,
        itemProgress,
        distanceAlong,
        distanceKm: haversineKm(userLoc, { lat: item.lat, lng: item.lng }),
      };
    })
    .filter((item) => {
      const forward = direction === 'NORTH' || direction === 'EAST';
      return forward ? item.distanceAlong > 0 : item.distanceAlong < 0;
    })
    .sort((a, b) => Math.abs(a.distanceAlong) - Math.abs(b.distanceAlong))
    .slice(0, limit);

  return ranked.map((rankedItem) => ({
    ...rankedItem.item,
    distanceKm: rankedItem.distanceKm,
  }));
}

export function detectClosestHighway(userLoc: LatLng, highways: Highway[]): {
  highwayId: string | null;
  nearestHighwayId: string | null;
  distanceMeters: number;
} {
  let bestId: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const highway of highways) {
    for (let i = 0; i < highway.polyline.length - 1; i += 1) {
      const d = distanceToSegmentMeters(userLoc, highway.polyline[i], highway.polyline[i + 1]);
      if (d < bestDistance) {
        bestDistance = d;
        bestId = highway.id;
      }
    }
  }

  return {
    highwayId: bestDistance <= 2000 ? bestId : null,
    nearestHighwayId: bestId,
    distanceMeters: bestDistance,
  };
}

export function runGeoSelfCheck(): void {
  const a = { lat: 3.139, lng: 101.687 };
  const b = { lat: 3.147, lng: 101.695 };
  const km = haversineKm(a, b);
  const eta = getETA(km);

  if (km <= 0 || eta < 0) {
    console.warn('[geo-check] Invalid distance or ETA calculation');
  }
}

