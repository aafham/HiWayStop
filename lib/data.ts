import highwaysData from '@/data/highways.json';
import rnrData from '@/data/rnr.json';
import stationsData from '@/data/stations.json';
import { Highway, Rnr, Station } from '@/types';

export const highways = highwaysData as Highway[];
export const rnrs = rnrData as Rnr[];
export const stations = stationsData as Station[];

export const allBrands = Array.from(new Set(stations.map((s) => s.brand))).sort();

