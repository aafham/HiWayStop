'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ChevronDown, ChevronUp, Compass, LocateFixed, MapPinOff, Navigation, ShieldAlert } from 'lucide-react';
import BottomSheet from '@/components/BottomSheet';
import FilterPanel from '@/components/FilterPanel';
import TopBar from '@/components/TopBar';
import { allBrands, highways, rnrs, stations } from '@/lib/data';
import { bearingDegrees, bearingToCardinal, detectClosestHighway, filterHighwayOnlyStations, getETA, getNearestItems, getNextAlongHighway, haversineKm, runGeoSelfCheck } from '@/lib/geo';
import { buildSpatialGrid, querySpatialGrid } from '@/lib/spatial';
import { rnrToPlace, stationToPlace } from '@/lib/transform';
import { buildNavigationUrl } from '@/lib/navigation';
import { Direction, FacilityFlags, LatLng, PlaceItem, SortMode, ViewMode } from '@/types';

const HighwayMap = dynamic(() => import('@/components/HighwayMap'), {
  ssr: false,
  loading: () => <div className="h-[45vh] animate-pulse bg-slate-200" />,
});

const defaultFacilities: FacilityFlags = { surau: false, toilet: false, foodcourt: false, ev: false };

function directionMatches(itemDirection: Direction, cardinal: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST'): boolean {
  if (cardinal === 'NORTH') return itemDirection === 'NORTHBOUND';
  if (cardinal === 'SOUTH') return itemDirection === 'SOUTHBOUND';
  if (cardinal === 'EAST') return itemDirection === 'EASTBOUND';
  return itemDirection === 'WESTBOUND';
}

function parseFacilities(raw: string | null): FacilityFlags {
  if (!raw) return defaultFacilities;
  const set = new Set(raw.split(',').map((v) => v.trim().toLowerCase()));
  return { surau: set.has('surau'), toilet: set.has('toilet'), foodcourt: set.has('foodcourt'), ev: set.has('ev') };
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

function HomePageContent() {
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

  const [showMap, setShowMap] = useState(true);
  const [showList, setShowList] = useState(true);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [filterFlash, setFilterFlash] = useState(false);
  const [showMapPeek, setShowMapPeek] = useState(false);

  useEffect(() => runGeoSelfCheck(), []);

  useEffect(() => {
    const onScroll = () => setShowMapPeek(window.scrollY > 1100 && showList);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [showList]);

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
    if (sort === 'DISTANCE' || sort === 'ETA' || sort === 'ALPHA' || sort === 'CONFIDENCE') setSortMode(sort);
    initializedFromQueryRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!initializedFromQueryRef.current) return;
    const p = new URLSearchParams();
    if (viewMode !== 'ALL') p.set('mode', viewMode);
    if (destination.trim()) p.set('dest', destination.trim());
    if (selectedBrands.length > 0) p.set('brands', selectedBrands.join(','));
    const facilityActive = Object.entries(facilityFilter).filter(([, value]) => value).map(([key]) => key);
    if (facilityActive.length > 0) p.set('fac', facilityActive.join(','));
    if (bufferMeters !== 400) p.set('buffer', String(bufferMeters));
    if (rangeKmInput.trim()) p.set('range', rangeKmInput.trim());
    if (sortMode !== 'DISTANCE') p.set('sort', sortMode);
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [bufferMeters, destination, facilityFilter, pathname, rangeKmInput, router, selectedBrands, sortMode, viewMode]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }
    setLocationLoading(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLoc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setPreviousLoc(userLoc);
        setUserLoc(nextLoc);
        if (typeof position.coords.heading === 'number' && !Number.isNaN(position.coords.heading) && position.coords.heading >= 0) setHeading(position.coords.heading);
        setLocationLoading(false);
      },
      (error) => {
        setLocationError(error.message || 'Location access denied.');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const direction = useMemo(() => {
    if (manualDirection) return manualDirection;
    if (heading !== null) return bearingToCardinal(heading);
    if (previousLoc && userLoc) return bearingToCardinal(bearingDegrees(previousLoc, userLoc));
    return null;
  }, [heading, manualDirection, previousLoc, userLoc]);

  const closestHighway = useMemo(() => {
    if (!userLoc) return { highwayId: null, nearestHighwayId: null, distanceMeters: Number.POSITIVE_INFINITY };
    return detectClosestHighway(userLoc, highways);
  }, [userLoc]);

  const currentHighway = useMemo(() => highways.find((h) => h.id === closestHighway.highwayId) ?? null, [closestHighway.highwayId]);
  const highwayOnlyStations = useMemo(() => filterHighwayOnlyStations(stations, highways, bufferMeters), [bufferMeters]);

  const rnrPlaces = useMemo(() => rnrs.map(rnrToPlace), []);
  const fuelPlaces = useMemo(() => highwayOnlyStations.map(stationToPlace), [highwayOnlyStations]);

  const places = useMemo(() => {
    let merged: PlaceItem[] = [];
    if (viewMode === 'ALL' || viewMode === 'RNR') merged = merged.concat(rnrPlaces);
    if (viewMode === 'ALL' || viewMode === 'FUEL') merged = merged.concat(fuelPlaces);
    if (selectedBrands.length > 0) merged = merged.filter((item) => item.kind !== 'FUEL' || (item.brand ? selectedBrands.includes(item.brand) : false));
    const activeFacilitiesRaw = Object.entries(facilityFilter).filter(([, value]) => value);
    if (activeFacilitiesRaw.length > 0) {
      merged = merged.filter((item) => {
        if (item.kind !== 'RNR' || !item.facilities) return false;
        return activeFacilitiesRaw.every(([key]) => item.facilities?.[key as keyof FacilityFlags]);
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
      if (sortMode === 'CONFIDENCE') {
        const rank = (item: PlaceItem) => item.onRouteConfidence === 'RNR_LINKED' ? 0 : item.onRouteConfidence === 'RNR_SITE' ? 1 : 2;
        return rank(a) - rank(b) || (a.distanceKm ?? 0) - (b.distanceKm ?? 0);
      }
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
    if (!userLoc || !currentHighway || !direction) return { rnr: [] as PlaceItem[], fuel: [] as PlaceItem[] };
    const sameHighwayItems = places.filter((item) => item.highwayId === currentHighway.id && directionMatches(item.direction, direction));
    const nextRnr = getNextAlongHighway(userLoc, currentHighway.polyline, direction, sameHighwayItems.filter((item) => item.kind === 'RNR'), 3).map((item) => ({ ...item, etaMinutes: getETA(item.distanceKm) }));
    const nextFuel = getNextAlongHighway(userLoc, currentHighway.polyline, direction, sameHighwayItems.filter((item) => item.kind === 'FUEL'), 3).map((item) => ({ ...item, etaMinutes: getETA(item.distanceKm) }));
    return { rnr: nextRnr, fuel: nextFuel };
  }, [currentHighway, direction, places, userLoc]);

  const rangeKm = useMemo(() => {
    const parsed = Number(rangeKmInput);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  }, [rangeKmInput]);

  const locationStatus = useMemo(() => {
    if (locationLoading) return 'Detecting location...';
    if (locationError) return `Location error: ${locationError}`;
    if (!userLoc) return 'Location not selected yet';
    if (!currentHighway) {
      const near = highways.find((h) => h.id === closestHighway.nearestHighwayId);
      if (near && Number.isFinite(closestHighway.distanceMeters)) return `Current highway: Uncertain (~${(closestHighway.distanceMeters / 1000).toFixed(1)}km from ${near.code})`;
      return 'Current highway: Uncertain (likely far from highway corridor)';
    }
    return `Current highway: ${currentHighway.code}`;
  }, [closestHighway.distanceMeters, closestHighway.nearestHighwayId, currentHighway, locationError, locationLoading, userLoc]);

  const toggleBrand = (brand: string) => setSelectedBrands((prev) => (prev.includes(brand) ? prev.filter((x) => x !== brand) : [...prev, brand]));
  const toggleFacility = (key: keyof FacilityFlags) => setFacilityFilter((prev) => ({ ...prev, [key]: !prev[key] }));
  const selectAllBrands = () => setSelectedBrands(allBrands);
  const clearBrands = () => setSelectedBrands([]);
  const selectAllFacilities = () => setFacilityFilter({ surau: true, toilet: true, foodcourt: true, ev: true });
  const clearFacilities = () => setFacilityFilter(defaultFacilities);

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

  const totalFuelCount = useMemo(() => fuelPlaces.filter((item) => selectedBrands.length === 0 || (item.brand ? selectedBrands.includes(item.brand) : false)).length, [fuelPlaces, selectedBrands]);

  const activeFacilities = Object.entries(facilityFilter).filter(([, value]) => value).map(([key]) => key.toUpperCase());
  const summarizeSelected = (items: string[], limit = 3): string => items.length <= limit ? items.join(', ') : `${items.slice(0, limit).join(', ')} +${items.length - limit} more`;
  const activeFiltersCount = (destination.trim() ? 1 : 0) + (viewMode !== 'ALL' ? 1 : 0) + (selectedBrands.length > 0 ? 1 : 0) + (activeFacilities.length > 0 ? 1 : 0) + (bufferMeters !== 400 ? 1 : 0) + (rangeKm !== null ? 1 : 0);
  const isHighwayUncertain = Boolean(userLoc && !currentHighway && !locationLoading && !locationError);
  const activeFilterTags = [
    viewMode !== 'ALL' ? `Mode: ${viewMode}` : null,
    selectedBrands.length > 0 ? `Brands: ${summarizeSelected(selectedBrands, 2)}` : null,
    activeFacilities.length > 0 ? `Facilities: ${summarizeSelected(activeFacilities, 2)}` : null,
    bufferMeters !== 400 ? `Buffer: ${bufferMeters}m` : null,
    rangeKm !== null ? `Range: ${rangeKm}km` : null,
    destination.trim() ? `Destination: ${destination.trim()}` : null,
  ].filter(Boolean) as string[];
  const visibleFilterTags = activeFilterTags.slice(0, 2);
  const hiddenFilterTagCount = Math.max(0, activeFilterTags.length - visibleFilterTags.length);

  useEffect(() => {
    setFilterFlash(true);
    const id = window.setTimeout(() => setFilterFlash(false), 220);
    return () => window.clearTimeout(id);
  }, [activeFiltersCount]);

  const emptyReason = useMemo(() => {
    if (places.length > 0) return '';
    const parts: string[] = [];
    if (selectedBrands.length > 0) parts.push(`brand ${selectedBrands.join(', ')}`);
    if (activeFacilities.length > 0) parts.push(`facilities ${activeFacilities.join(', ')}`);
    if (bufferMeters < 400) parts.push(`strict buffer ${bufferMeters}m`);
    return parts.length > 0 ? `No results for ${parts.join(' + ')}.` : 'No results for the current filters.';
  }, [activeFacilities, bufferMeters, places.length, selectedBrands]);

  const priorityNextStop = useMemo(() => {
    const candidates = [...nextByDirection.rnr, ...nextByDirection.fuel];
    if (candidates.length === 0) return null;
    return [...candidates].sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))[0];
  }, [nextByDirection.fuel, nextByDirection.rnr]);

  const tripStats = useMemo(() => {
    const nextStopKm = priorityNextStop?.distanceKm ?? null;
    const averageSpeedKmh = 90;
    const restAdviceMinutes = 120;
    return {
      nextStopKm,
      nextStopEta: nextStopKm !== null ? Math.round((nextStopKm / averageSpeedKmh) * 60) : null,
      fuelInRange: fuelInRangeCount ?? totalFuelCount,
      totalFuel: totalFuelCount,
      restAdviceMinutes,
    };
  }, [fuelInRangeCount, priorityNextStop?.distanceKm, totalFuelCount]);

  return (
    <main className="mx-auto min-h-screen max-w-5xl overflow-hidden bg-white/70 shadow-[0_18px_60px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/80 backdrop-blur">
      <TopBar locationStatus={locationStatus} isHighwayUncertain={isHighwayUncertain} onUseLocation={useCurrentLocation} loading={locationLoading} />

      <section className="border-b border-amber-200/80 bg-amber-50/90 px-4 py-2 text-[11px] font-semibold text-amber-900">
        <p className="inline-flex items-center gap-1"><ShieldAlert className="h-3.5 w-3.5" />For safety, do not use this app while driving. Use it only when stopped.</p>
      </section>

      <section className="grid gap-2 border-b border-slate-200/70 bg-slate-50/70 px-4 py-3 sm:grid-cols-2">
        {locationLoading ? (
          <>
            <div className="h-16 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
            <div className="h-16 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
          </>
        ) : (
          <>
            <div className="rounded-xl border border-slate-200/80 bg-white/95 p-3.5 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Nearest R&R</p>
              {nearestRnr ? <><p className="mt-1 text-sm font-semibold text-slate-900">{nearestRnr.name}</p><p className="text-xs text-slate-600">{nearestRnr.distanceKm.toFixed(1)} km - ETA {nearestRnr.etaMinutes} min</p></> : <p className="mt-1 text-xs text-slate-500">Enable location to see nearest R&R.</p>}
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white/95 p-3.5 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Nearest Fuel Station</p>
              {nearestFuel ? <><p className="mt-1 text-sm font-semibold text-slate-900">{nearestFuel.name}</p><p className="text-xs text-slate-600">{nearestFuel.distanceKm.toFixed(1)} km - ETA {nearestFuel.etaMinutes} min{nearestFuel.brand ? ` - ${nearestFuel.brand}` : ''}</p></> : <p className="mt-1 text-xs text-slate-500">Enable location to see nearest fuel station.</p>}
            </div>
          </>
        )}
      </section>

      <section className="border-b border-slate-200/70 bg-white/90 px-4 py-3">
        <div className="mb-2 inline-flex rounded-full bg-slate-100 p-1">
          <button type="button" onClick={() => { setShowMap(true); setShowList(false); }} className={`rounded-full px-3 py-1 text-xs font-semibold ${showMap && !showList ? 'bg-brand-500 text-white' : 'text-slate-700'}`}>Map</button>
          <button type="button" onClick={() => { setShowMap(false); setShowList(true); }} className={`rounded-full px-3 py-1 text-xs font-semibold ${!showMap && showList ? 'bg-brand-500 text-white' : 'text-slate-700'}`}>List</button>
          <button type="button" onClick={() => { setShowMap(true); setShowList(true); }} className={`rounded-full px-3 py-1 text-xs font-semibold ${showMap && showList ? 'bg-brand-500 text-white' : 'text-slate-700'}`}>Map + List</button>
        </div>
        {!userLoc ? (
          <div className="flex h-[34vh] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 text-center">
            {locationLoading ? <div className="h-24 w-full max-w-md animate-pulse rounded-2xl bg-slate-200" /> : <LocateFixed className="h-8 w-8 text-slate-500" />}
            <p className="text-sm font-semibold text-slate-700">Tap "Use my location" to start.</p>
            <p className="text-xs text-slate-500">Only highway data and highway-only fuel stations are shown.</p>
          </div>
        ) : showMap ? (
          <section id="map-section"><HighwayMap userLoc={userLoc} highways={highways} places={places} onSelect={setSelectedPlace} rangeKm={rangeKm} /></section>
        ) : null}
      </section>

      <section className="border-b border-slate-200/70 bg-slate-50/70 px-4 py-2.5">
        <button
          type="button"
          onClick={() => setIsFilterExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm"
        >
          <span className={`inline-flex items-center gap-2 rounded-full px-2 py-1 ${filterFlash ? 'filter-pop bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-700'}`}>
            {activeFiltersCount} active filters
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
            {isFilterExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {isFilterExpanded ? 'Hide Filters' : 'Show Filters'}
          </span>
        </button>
      </section>

      {isFilterExpanded ? (
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
          selectAllBrands={selectAllBrands}
          clearBrands={clearBrands}
          selectAllFacilities={selectAllFacilities}
          clearFacilities={clearFacilities}
        />
      ) : null}

      {activeFiltersCount > 0 && !isFilterExpanded ? (
        <section className="sticky top-[106px] z-20 border-b border-slate-200/60 bg-white/75 px-4 py-2 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className={`rounded-full px-2 py-0.5 font-semibold text-white ${filterFlash ? 'filter-pop bg-brand-500' : 'bg-slate-900'}`}>{activeFiltersCount} active filters</span>
            {visibleFilterTags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{tag}</span>)}
            {hiddenFilterTagCount > 0 ? <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">+{hiddenFilterTagCount} more</span> : null}
          </div>
        </section>
      ) : null}

      {priorityNextStop ? (
        <section className="border-b border-slate-200/70 bg-white/80 px-4 py-3">
          <div className="rounded-2xl border border-brand-200/80 bg-gradient-to-br from-brand-50 to-white p-3.5 shadow-[0_10px_28px_rgba(21,149,112,0.12)]">
            <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700">Next Stop On Route</p>
            <p className="mt-1 text-sm font-bold text-brand-900">{priorityNextStop.name}</p>
            <p className="text-xs text-brand-900/80">{(priorityNextStop.distanceKm ?? 0).toFixed(1)} km - ETA {priorityNextStop.etaMinutes ?? 0} min</p>
          </div>
        </section>
      ) : null}

      <section className="border-b border-slate-200/70 bg-slate-50/70 px-4 py-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Current Trip</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700">
            <div className="rounded-lg bg-slate-50 p-2"><p className="font-semibold">Next Stop</p><p>{tripStats.nextStopKm !== null ? `${tripStats.nextStopKm.toFixed(1)} km` : 'Not available'}</p></div>
            <div className="rounded-lg bg-slate-50 p-2"><p className="font-semibold">Next ETA</p><p>{tripStats.nextStopEta !== null ? `${tripStats.nextStopEta} min` : 'Not available'}</p></div>
            <div className="rounded-lg bg-slate-50 p-2"><p className="font-semibold">Fuel In Range</p><p>{tripStats.fuelInRange}/{tripStats.totalFuel}</p></div>
            <div className="rounded-lg bg-slate-50 p-2"><p className="font-semibold">Rest Suggestion</p><p>Every {tripStats.restAdviceMinutes} min</p></div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => { if (priorityNextStop) setSelectedPlace(priorityNextStop); }} className="rounded-full bg-brand-500 px-3 py-1 text-[11px] font-semibold text-white shadow-[0_8px_20px_rgba(21,149,112,0.25)] hover:-translate-y-[1px]">Set next stop</button>
            <button type="button" onClick={() => { setViewMode('FUEL'); setShowList(true); setShowMap(true); }} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">Find fuel in range</button>
          </div>
        </div>
      </section>

      {userLoc && !direction ? (
        <section className="border-b border-slate-200/70 bg-amber-50/70 px-4 py-3">
          <p className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-900"><Compass className="h-4 w-4" />Travel direction could not be detected. Please choose manually.</p>
          <div className="flex flex-wrap gap-2">
            {(['NORTH', 'SOUTH', 'EAST', 'WEST'] as const).map((value) => (
              <button key={value} type="button" onClick={() => setManualDirection(value)} className={`rounded-full px-3 py-1 text-xs font-semibold ${manualDirection === value ? 'bg-brand-500 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-300'}`}>{value}</button>
            ))}
          </div>
        </section>
      ) : null}

      {userLoc && places.length === 0 ? (
        <section className="space-y-2 border-b border-slate-200/70 bg-slate-50/70 px-4 py-3 text-xs text-slate-700">
          <p className="inline-flex items-center gap-2 font-semibold"><MapPinOff className="h-4 w-4" />{emptyReason}</p>
          <div className="flex flex-wrap gap-2">
            {selectedBrands.length > 0 ? <button type="button" onClick={() => setSelectedBrands([])} className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-300">Reset brands</button> : null}
            {activeFacilities.length > 0 ? <button type="button" onClick={() => setFacilityFilter(defaultFacilities)} className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-300">Reset facilities</button> : null}
            {bufferMeters < 800 ? <button type="button" onClick={() => setBufferMeters((prev) => Math.min(800, prev + 100))} className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-300">Increase buffer +100m</button> : null}
            {destination.trim() ? <button type="button" onClick={() => setDestination('')} className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-300">Clear destination</button> : null}
          </div>
          <p className="text-[11px] text-slate-500">Tip: try mode "All" or set buffer to 500m for wider coverage.</p>
        </section>
      ) : null}

      {showList ? (
        <BottomSheet nearest={nearestTop10} nextRnR={nextByDirection.rnr} nextFuel={nextByDirection.fuel} selected={selectedPlace} onSelect={setSelectedPlace} rangeKm={rangeKm} sortMode={sortMode} onSortModeChange={setSortMode} loading={locationLoading} />
      ) : (
        <section className="border-t border-slate-200/70 bg-white/80 px-4 py-6 text-center text-sm text-slate-600">List is hidden. Switch to "List" or "Map + List" to view stop suggestions.</section>
      )}

      {showMapPeek && showList ? (
        <button type="button" onClick={() => { setShowMap(true); document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="fixed bottom-24 right-4 z-40 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(21,149,112,0.35)] hover:-translate-y-[1px]">View map</button>
      ) : null}

      {selectedPlace ? (
        <section className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2 rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-[0_18px_44px_rgba(15,23,42,0.22)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-slate-900">Selected: {selectedPlace.name}</p>
              <p className="text-[11px] text-slate-600">{(selectedPlace.distanceKm ?? 0).toFixed(1)} km - ETA {selectedPlace.etaMinutes ?? 0} min</p>
            </div>
            <a href={buildNavigationUrl({ lat: selectedPlace.lat, lng: selectedPlace.lng })} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-brand-500 px-3 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(21,149,112,0.25)] hover:-translate-y-[1px]"><Navigation className="h-3.5 w-3.5" />Navigate</a>
          </div>
        </section>
      ) : null}

      <section className="px-4 pb-24 pt-2 text-[11px] text-slate-500">
        <p className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />Data is filtered as highway-only. Always verify road signs before taking an exit.</p>
      </section>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-[45vh] animate-pulse bg-slate-100" />}>
      <HomePageContent />
    </Suspense>
  );
}

