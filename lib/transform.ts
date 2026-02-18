import { PlaceItem, Rnr, Station } from '@/types';

export function rnrToPlace(rnr: Rnr): PlaceItem {
  return {
    id: `rnr:${rnr.id}`,
    name: rnr.name,
    highwayId: rnr.highwayId,
    direction: rnr.direction,
    lat: rnr.lat,
    lng: rnr.lng,
    kind: 'RNR',
    facilities: rnr.facilities,
    fuelBrands: rnr.fuelBrands,
    onRouteConfidence: 'RNR_SITE',
    sourceId: rnr.id,
  };
}

export function stationToPlace(station: Station): PlaceItem {
  return {
    id: `fuel:${station.id}`,
    name: station.name,
    highwayId: station.highwayId,
    direction: station.direction,
    lat: station.lat,
    lng: station.lng,
    kind: 'FUEL',
    brand: station.brand,
    onRouteConfidence: station.type === 'RNR_STATION' ? 'RNR_LINKED' : 'CORRIDOR_VERIFIED',
    sourceId: station.id,
  };
}

