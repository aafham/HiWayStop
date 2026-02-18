import { LatLng } from '@/types';

export type SpatialGrid<T extends LatLng> = {
  cellSizeDeg: number;
  buckets: Map<string, T[]>;
};

function cellKey(lat: number, lng: number, cellSizeDeg: number): string {
  const y = Math.floor(lat / cellSizeDeg);
  const x = Math.floor(lng / cellSizeDeg);
  return `${y}:${x}`;
}

export function buildSpatialGrid<T extends LatLng>(items: T[], cellSizeDeg = 0.25): SpatialGrid<T> {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = cellKey(item.lat, item.lng, cellSizeDeg);
    const list = buckets.get(key);
    if (list) list.push(item);
    else buckets.set(key, [item]);
  }
  return { cellSizeDeg, buckets };
}

export function querySpatialGrid<T extends LatLng>(grid: SpatialGrid<T>, center: LatLng, radiusKm: number): T[] {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.max(Math.cos((center.lat * Math.PI) / 180), 0.1));

  const minLat = center.lat - latDelta;
  const maxLat = center.lat + latDelta;
  const minLng = center.lng - lngDelta;
  const maxLng = center.lng + lngDelta;

  const minY = Math.floor(minLat / grid.cellSizeDeg);
  const maxY = Math.floor(maxLat / grid.cellSizeDeg);
  const minX = Math.floor(minLng / grid.cellSizeDeg);
  const maxX = Math.floor(maxLng / grid.cellSizeDeg);

  const out: T[] = [];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const bucket = grid.buckets.get(`${y}:${x}`);
      if (bucket && bucket.length > 0) out.push(...bucket);
    }
  }
  return out;
}
