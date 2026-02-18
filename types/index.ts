export type LatLng = {
  lat: number;
  lng: number;
};

export type Highway = {
  id: string;
  name: string;
  code: string;
  polyline: LatLng[];
};

export type Direction = 'NORTHBOUND' | 'SOUTHBOUND' | 'EASTBOUND' | 'WESTBOUND';

export type FacilityFlags = {
  surau: boolean;
  toilet: boolean;
  foodcourt: boolean;
  ev: boolean;
};

export type Rnr = {
  id: string;
  name: string;
  highwayId: string;
  direction: Direction;
  lat: number;
  lng: number;
  facilities: FacilityFlags;
  hasFuel: boolean;
  fuelBrands: string[];
};

export type StationType = 'RNR_STATION' | 'HIGHWAY_STATION';

export type Station = {
  id: string;
  name: string;
  brand: string;
  type: StationType;
  highwayId: string;
  direction: Direction;
  lat: number;
  lng: number;
  rnrId: string | null;
};

export type ViewMode = 'ALL' | 'RNR' | 'FUEL';

export type PlaceKind = 'RNR' | 'FUEL';

export type PlaceItem = {
  id: string;
  name: string;
  highwayId: string;
  direction: Direction;
  lat: number;
  lng: number;
  kind: PlaceKind;
  distanceKm?: number;
  etaMinutes?: number;
  facilities?: FacilityFlags;
  fuelBrands?: string[];
  brand?: string;
  sourceId: string;
};
