import highwaysData from '@/data/highways.json';
import rnrData from '@/data/rnr.json';
import stationsData from '@/data/stations.json';
import highwaysFullData from '@/data/generated/highways.full.json';
import rnrFullData from '@/data/generated/rnr.full.json';
import stationsFullData from '@/data/generated/stations.full.json';
import { Highway, Rnr, Station } from '@/types';

const sampledHighways = highwaysData as Highway[];
const sampledRnrs = rnrData as Rnr[];
const sampledStations = stationsData as Station[];

const fullHighways = highwaysFullData as Highway[];
const fullRnrs = rnrFullData as Rnr[];
const fullStations = stationsFullData as Station[];

export const highways = fullHighways.length > 0 ? fullHighways : sampledHighways;
export const rnrs = fullRnrs.length > 0 ? fullRnrs : sampledRnrs;
export const stations = fullStations.length > 0 ? fullStations : sampledStations;

export const allBrands = Array.from(new Set(stations.map((s) => s.brand))).sort();

