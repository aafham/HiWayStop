'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Compass, LocateFixed, MapPinOff, ShieldAlert } from 'lucide-react';
import BottomSheet from '@/components/BottomSheet';
import FilterPanel from '@/components/FilterPanel';
import TopBar from '@/components/TopBar';
import { allBrands, highways, rnrs, stations } from '@/lib/data';
import {
  bearingDegrees,
  bearingToCardinal,
  detectClosestHighway,
  filterHighwayOnlyStations,
  getETA,
  getNearestItems,
  getNextAlongHighway,
  haversineKm,
  runGeoSelfCheck,
} from '@/lib/geo';
import { buildSpatialGrid, querySpatialGrid } from '@/lib/spatial';
import { rnrToPlace, stationToPlace } from '@/lib/transform';
import { Direction, FacilityFlags, LatLng, PlaceItem, SortMode, ViewMode } from '@/types';

const HighwayMap = dynamic(() => import('@/components/HighwayMap'), {
  ssr: false,
  loading: () => <div className="h-[45vh] animate-pulse bg-slate-200" />,
});

const defaultFacilities: FacilityFlags = {
  surau: false,
  toilet: false,
  foodcourt: false,
  ev: false,
};

function directionMatches(itemDirection: Direction, cardinal: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST'): boolean {
  if (cardinal === 'NORTH') return itemDirection === 'NORTHBOUND';
  if (cardinal === 'SOUTH') return itemDirection === 'SOUTHBOUND';
  if (cardinal === 'EAST') return itemDirection === 'EASTBOUND';
  return itemDirection === 'WESTBOUND';
}

function parseFacilities(raw: string | null): FacilityFlags {
  if (!raw) return defaultFacilities;
  const set = new Set(raw.split(',').map((v) => v.trim().toLowerCase()));
  return {
    surau: set.has('surau'),
    toilet: set.has('toilet'),
    foodcourt: set.has('foodcourt'),
    ev: set.has('ev'),
  };
}

function uniqueById(items: PlaceItem[]): PlaceItem[] {
  const map = new Map<string, PlaceItem>();
  for (const item of items) map.set(item.id, item);
  return [...map.values()];
}

function nearestCandidates(userLoc: LatLng, items: PlaceItem[], grid = buildSpatialGrid(items, 0.25)): PlaceItem[] {
  const radii = [80, 180, 350, 700];

  for (const radius of radii) {
    const hit = uniqueById(querySpatialGrid(grid, userLoc, radius));
    if (hit.length >= 50) return hit;
  }

  return items;
}

export default function HomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initializedFromQueryRef = useRef(false);

  const [userLoc, setUserLoc] = useState<LatLng | null>(null);
  const [previousLoc, setPreviousLoc] = useState<LatLng | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [manualDirection, setManualDirection] = useState<'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('ALL');
  const [destination, setDestination] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [facilityFilter, setFacilityFilter] = useState<FacilityFlags>(defaultFacilities);
  const [bufferMeters, setBufferMeters] = useState(400);
  const [rangeKmInput, setRangeKmInput] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('DISTANCE');
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);

  useEffect(() => {
    runGeoSelfCheck();
  }, []);

  useEffect(() => {
    if (initializedFromQueryRef.current) return;

    const mode = searchParams.get('mode');
    if (mode === 'ALL' || mode === 'RNR' || mode === 'FUEL') setViewMode(mode);

    const dest = searchParams.get('dest');
    if (dest) setDestination(dest);

    const brands = searchParams.get('brands');
    if (brands) setSelectedBrands(brands.split(',').filter(Boolean));

    setFacilityFilter(parseFacilities(searchParams.get('fac')));

    const buffer = Number(searchParams.get('buffer'));
    if (Number.isFinite(buffer) && buffer >= 200 && buffer <= 800) setBufferMeters(buffer);

    const range = searchParams.get('range');
    if (range) setRangeKmInput(range);

    const sort = searchParams.get('sort');
    if (sort === 'DISTANCE' || sort === 'ETA' || sort === 'ALPHA') setSortMode(sort);

    initializedFromQueryRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!initializedFromQueryRef.current) return;

    const p = new URLSearchParams();
    if (viewMode !== 'ALL') p.set('mode', viewMode);
    if (destination.trim()) p.set('dest', destination.trim());
    if (selectedBrands.length > 0) p.set('brands', selectedBrands.join(','));

    const facilityActive = Object.entries(facilityFilter)
      .filter(([, value]) => value)
      .map(([key]) => key);
    if (facilityActive.length > 0) p.set('fac', facilityActive.join(','));

    if (bufferMeters !== 400) p.set('buffer', String(bufferMeters));
    if (rangeKmInput.trim()) p.set('range', rangeKmInput.trim());
    if (sortMode !== 'DISTANCE') p.set('sort', sortMode);

    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [bufferMeters, destination, facilityFilter, pathname, rangeKmInput, router, selectedBrands, sortMode, viewMode]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Browser tidak menyokong geolocation.');
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLoc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setPreviousLoc(userLoc);
        setUserLoc(nextLoc);

        if (typeof position.coords.heading === 'number' && !Number.isNaN(position.coords.heading) && position.coords.heading >= 0) {
          setHeading(position.coords.heading);
        }

        setLocationLoading(false);
      },
      (error) => {
        setLocationError(error.message || 'Akses lokasi ditolak.');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const direction = useMemo(() => {
    if (manualDirection) return manualDirection;
    if (heading !== null) return bearingToCardinal(heading);
    if (previousLoc && userLoc) {
      return bearingToCardinal(bearingDegrees(previousLoc, userLoc));
    }
    return null;
  }, [heading, manualDirection, previousLoc, userLoc]);

  const closestHighway = useMemo(() => {
    if (!userLoc) return { highwayId: null, distanceMeters: Number.POSITIVE_INFINITY };
    return detectClosestHighway(userLoc, highways);
  }, [userLoc]);

  const currentHighway = useMemo(
    () => highways.find((h) => h.id === closestHighway.highwayId) ?? null,
    [closestHighway.highwayId],
  );

  const highwayOnlyStations = useMemo(
    () => filterHighwayOnlyStations(stations, highways, bufferMeters),
    [bufferMeters],
  );

  const rnrPlaces = useMemo(() => rnrs.map(rnrToPlace), []);
  const fuelPlaces = useMemo(() => highwayOnlyStations.map(stationToPlace), [highwayOnlyStations]);

  const places = useMemo(() => {
    let merged: PlaceItem[] = [];
    if (viewMode === 'ALL' || viewMode === 'RNR') merged = merged.concat(rnrPlaces);
    if (viewMode === 'ALL' || viewMode === 'FUEL') merged = merged.concat(fuelPlaces);

    if (selectedBrands.length > 0) {
      merged = merged.filter((item) => item.kind !== 'FUEL' || (item.brand ? selectedBrands.includes(item.brand) : false));
    }

    const activeFacilities = Object.entries(facilityFilter).filter(([, value]) => value);
    if (activeFacilities.length > 0) {
      merged = merged.filter((item) => {
        if (item.kind !== 'RNR' || !item.facilities) return false;
        return activeFacilities.every(([key]) => item.facilities?.[key as keyof FacilityFlags]);
      });
    }

    return merged;
  }, [facilityFilter, fuelPlaces, rnrPlaces, selectedBrands, viewMode]);

  const placesGrid = useMemo(() => buildSpatialGrid(places, 0.25), [places]);
  const rnrGrid = useMemo(() => buildSpatialGrid(rnrPlaces, 0.25), [rnrPlaces]);
  const fuelGrid = useMemo(() => buildSpatialGrid(fuelPlaces, 0.25), [fuelPlaces]);

  const nearestTop10 = useMemo(() => {
    if (!userLoc) return [];

    const candidates = nearestCandidates(userLoc, places, placesGrid);
    const base = getNearestItems(userLoc, candidates, 30).map((item) => ({ ...item, etaMinutes: getETA(item.distanceKm) }));

    const sorted = [...base].sort((a, b) => {
      if (sortMode === 'ALPHA') return a.name.localeCompare(b.name);
      if (sortMode === 'ETA') return (a.etaMinutes ?? 0) - (b.etaMinutes ?? 0);
      return (a.distanceKm ?? 0) - (b.distanceKm ?? 0);
    });

    return sorted.slice(0, 10);
  }, [places, placesGrid, sortMode, userLoc]);

  const nearestRnr = useMemo(() => {
    if (!userLoc) return null;
    const nearest = getNearestItems(userLoc, nearestCandidates(userLoc, rnrPlaces, rnrGrid), 1)[0];
    if (!nearest) return null;
    return { ...nearest, etaMinutes: getETA(nearest.distanceKm) };
  }, [rnrGrid, rnrPlaces, userLoc]);

  const nearestFuel = useMemo(() => {
    if (!userLoc) return null;
    const nearest = getNearestItems(userLoc, nearestCandidates(userLoc, fuelPlaces, fuelGrid), 1)[0];
    if (!nearest) return null;
    return { ...nearest, etaMinutes: getETA(nearest.distanceKm) };
  }, [fuelGrid, fuelPlaces, userLoc]);

  const nextByDirection = useMemo(() => {
    if (!userLoc || !currentHighway || !direction) {
      return { rnr: [] as PlaceItem[], fuel: [] as PlaceItem[] };
    }

    const sameHighwayItems = places.filter((item) => item.highwayId === currentHighway.id && directionMatches(item.direction, direction));

    const nextRnr = getNextAlongHighway(
      userLoc,
      currentHighway.polyline,
      direction,
      sameHighwayItems.filter((item) => item.kind === 'RNR'),
      3,
    ).map((item) => ({ ...item, etaMinutes: getETA(item.distanceKm) }));

    const nextFuel = getNextAlongHighway(
      userLoc,
      currentHighway.polyline,
      direction,
      sameHighwayItems.filter((item) => item.kind === 'FUEL'),
      3,
    ).map((item) => ({ ...item, etaMinutes: getETA(item.distanceKm) }));

    return { rnr: nextRnr, fuel: nextFuel };
  }, [currentHighway, direction, places, userLoc]);

  const rangeKm = useMemo(() => {
    const parsed = Number(rangeKmInput);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  }, [rangeKmInput]);

  const locationStatus = useMemo(() => {
    if (locationLoading) return 'Sedang mengesan lokasi...';
    if (locationError) return `Ralat lokasi: ${locationError}`;
    if (!userLoc) return 'Lokasi belum dipilih';
    if (!currentHighway) return 'Highway semasa: Tidak pasti';
    return `Highway semasa: ${currentHighway.code}`;
  }, [currentHighway, locationError, locationLoading, userLoc]);

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) => (prev.includes(brand) ? prev.filter((x) => x !== brand) : [...prev, brand]));
  };

  const toggleFacility = (key: keyof FacilityFlags) => {
    setFacilityFilter((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resetFilters = () => {
    setViewMode('ALL');
    setDestination('');
    setSelectedBrands([]);
    setFacilityFilter(defaultFacilities);
    setBufferMeters(400);
    setRangeKmInput('');
    setSortMode('DISTANCE');
  };

  const applyPreset = (preset: 'FUEL_FIRST' | 'FAMILY_STOP' | 'EV_ONLY') => {
    if (preset === 'FUEL_FIRST') {
      setViewMode('FUEL');
      setSelectedBrands([]);
      setFacilityFilter(defaultFacilities);
      return;
    }
    if (preset === 'FAMILY_STOP') {
      setViewMode('RNR');
      setFacilityFilter({ surau: true, toilet: true, foodcourt: true, ev: false });
      return;
    }
    setViewMode('ALL');
    setFacilityFilter({ surau: false, toilet: false, foodcourt: false, ev: true });
  };

  const fuelInRangeCount = useMemo(() => {
    if (!userLoc || !rangeKm || rangeKm <= 0) return null;
    const eligibleFuel = fuelPlaces.filter((item) => selectedBrands.length === 0 || (item.brand ? selectedBrands.includes(item.brand) : false));
    return eligibleFuel.filter((item) => haversineKm(userLoc, { lat: item.lat, lng: item.lng }) <= rangeKm).length;
  }, [fuelPlaces, rangeKm, selectedBrands, userLoc]);

  const totalFuelCount = useMemo(
    () => fuelPlaces.filter((item) => selectedBrands.length === 0 || (item.brand ? selectedBrands.includes(item.brand) : false)).length,
    [fuelPlaces, selectedBrands],
  );

  const activeFacilities = Object.entries(facilityFilter)
    .filter(([, value]) => value)
    .map(([key]) => key.toUpperCase());
  const activeFiltersCount =
    (destination.trim() ? 1 : 0) +
    (viewMode !== 'ALL' ? 1 : 0) +
    (selectedBrands.length > 0 ? 1 : 0) +
    (activeFacilities.length > 0 ? 1 : 0) +
    (bufferMeters !== 400 ? 1 : 0) +
    (rangeKm !== null ? 1 : 0);

  const emptyReason = useMemo(() => {
    if (places.length > 0) return '';
    const parts: string[] = [];
    if (selectedBrands.length > 0) parts.push(`brand ${selectedBrands.join(', ')}`);
    if (activeFacilities.length > 0) parts.push(`kemudahan ${activeFacilities.join(', ')}`);
    if (bufferMeters < 400) parts.push(`buffer ketat ${bufferMeters}m`);
    return parts.length > 0 ? `Tiada hasil untuk ${parts.join(' + ')}.` : 'Tiada hasil untuk penapis semasa.';
  }, [activeFacilities, bufferMeters, places.length, selectedBrands]);

  return (
    <main className="mx-auto min-h-screen max-w-5xl bg-white shadow-sm">
      <TopBar locationStatus={locationStatus} onUseLocation={useCurrentLocation} loading={locationLoading} />

      <section className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-[11px] font-semibold text-amber-900">
        <p className="inline-flex items-center gap-1">
          <ShieldAlert className="h-3.5 w-3.5" />
          Demi keselamatan, jangan guna aplikasi ini semasa memandu. Gunakan ketika berhenti.
        </p>
      </section>

      <section className="grid gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:grid-cols-2">
        {locationLoading ? (
          <>
            <div className="h-16 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
            <div className="h-16 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
          </>
        ) : (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">R&R terdekat</p>
              {nearestRnr ? (
                <>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{nearestRnr.name}</p>
                  <p className="text-xs text-slate-600">
                    {nearestRnr.distanceKm.toFixed(1)} km - ETA {nearestRnr.etaMinutes} min
                  </p>
                </>
              ) : (
                <p className="mt-1 text-xs text-slate-500">Aktifkan lokasi untuk lihat R&R terdekat.</p>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Stesen minyak terdekat</p>
              {nearestFuel ? (
                <>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{nearestFuel.name}</p>
                  <p className="text-xs text-slate-600">
                    {nearestFuel.distanceKm.toFixed(1)} km - ETA {nearestFuel.etaMinutes} min
                    {nearestFuel.brand ? ` - ${nearestFuel.brand}` : ''}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-xs text-slate-500">Aktifkan lokasi untuk lihat stesen terdekat.</p>
              )}
            </div>
          </>
        )}
      </section>

      <FilterPanel
        viewMode={viewMode}
        setViewMode={setViewMode}
        destination={destination}
        setDestination={setDestination}
        selectedBrands={selectedBrands}
        toggleBrand={toggleBrand}
        brands={allBrands}
        facilities={facilityFilter}
        toggleFacility={toggleFacility}
        bufferMeters={bufferMeters}
        setBufferMeters={setBufferMeters}
        rangeKm={rangeKmInput}
        setRangeKm={setRangeKmInput}
        onResetFilters={resetFilters}
        onApplyPreset={applyPreset}
        fuelInRangeCount={fuelInRangeCount}
        totalFuelCount={totalFuelCount}
      />

      {activeFiltersCount > 0 ? (
        <section className="sticky top-[65px] z-30 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full bg-slate-900 px-2 py-0.5 font-semibold text-white">{activeFiltersCount} penapis aktif</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">Mode: {viewMode}</span>
            {selectedBrands.length > 0 ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">Brand: {selectedBrands.length}</span>
            ) : null}
            {activeFacilities.length > 0 ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">Kemudahan: {activeFacilities.length}</span>
            ) : null}
            {bufferMeters !== 400 ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">Buffer: {bufferMeters}m</span>
            ) : null}
            {rangeKm !== null ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">Range: {rangeKm}km</span>
            ) : null}
          </div>
        </section>
      ) : null}

      {!userLoc ? (
        <section className="flex h-[45vh] flex-col items-center justify-center gap-3 border-b border-slate-200 bg-slate-50 px-4 text-center">
          {locationLoading ? <div className="h-24 w-full max-w-md animate-pulse rounded-2xl bg-slate-200" /> : <LocateFixed className="h-8 w-8 text-slate-500" />}
          <p className="text-sm font-semibold text-slate-700">Tekan "Guna lokasi saya" untuk mula.</p>
          <p className="text-xs text-slate-500">Data hanya lebuh raya dan stesen minyak highway-only.</p>
        </section>
      ) : (
        <HighwayMap userLoc={userLoc} highways={highways} places={places} onSelect={setSelectedPlace} />
      )}

      {userLoc && !direction ? (
        <section className="border-b border-slate-200 bg-amber-50 px-4 py-3">
          <p className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-900">
            <Compass className="h-4 w-4" />
            Arah perjalanan tidak dapat dikesan. Pilih arah manual.
          </p>
          <div className="flex flex-wrap gap-2">
            {(['NORTH', 'SOUTH', 'EAST', 'WEST'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setManualDirection(value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  manualDirection === value ? 'bg-brand-500 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-300'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {userLoc && places.length === 0 ? (
        <section className="space-y-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
          <p className="inline-flex items-center gap-2 font-semibold">
            <MapPinOff className="h-4 w-4" />
            {emptyReason}
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedBrands.length > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedBrands([])}
                className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-300"
              >
                Reset brand
              </button>
            ) : null}
            {activeFacilities.length > 0 ? (
              <button
                type="button"
                onClick={() => setFacilityFilter(defaultFacilities)}
                className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-300"
              >
                Reset kemudahan
              </button>
            ) : null}
            {bufferMeters < 800 ? (
              <button
                type="button"
                onClick={() => setBufferMeters((prev) => Math.min(800, prev + 100))}
                className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-300"
              >
                Naikkan buffer +100m
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <BottomSheet
        nearest={nearestTop10}
        nextRnR={nextByDirection.rnr}
        nextFuel={nextByDirection.fuel}
        selected={selectedPlace}
        onSelect={setSelectedPlace}
        rangeKm={rangeKm}
        sortMode={sortMode}
        onSortModeChange={setSortMode}
        loading={locationLoading}
      />

      <section className="px-4 pb-5 pt-2 text-[11px] text-slate-500">
        <p className="inline-flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5" />
          Data ditapis sebagai highway-only. Semak papan tanda jalan sebenar sebelum keluar simpang.
        </p>
      </section>
    </main>
  );
}
