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
    sourceId: station.id,
  };
}

