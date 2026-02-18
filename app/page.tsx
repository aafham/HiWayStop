'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Compass, LocateFixed, MapPinOff } from 'lucide-react';
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
  runGeoSelfCheck,
} from '@/lib/geo';
import { rnrToPlace, stationToPlace } from '@/lib/transform';
import { Direction, FacilityFlags, LatLng, PlaceItem, ViewMode } from '@/types';

const HighwayMap = dynamic(() => import('@/components/HighwayMap'), {
  ssr: false,
  loading: () => <div className="h-[45vh] animate-pulse bg-slate-200" />,
});

function directionMatches(itemDirection: Direction, cardinal: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST'): boolean {
  if (cardinal === 'NORTH') return itemDirection === 'NORTHBOUND';
  if (cardinal === 'SOUTH') return itemDirection === 'SOUTHBOUND';
  if (cardinal === 'EAST') return itemDirection === 'EASTBOUND';
  return itemDirection === 'WESTBOUND';
}

export default function HomePage() {
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);
  const [previousLoc, setPreviousLoc] = useState<LatLng | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [manualDirection, setManualDirection] = useState<'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('ALL');
  const [destination, setDestination] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [facilityFilter, setFacilityFilter] = useState<FacilityFlags>({
    surau: false,
    toilet: false,
    foodcourt: false,
    ev: false,
  });
  const [bufferMeters, setBufferMeters] = useState(400);
  const [rangeKmInput, setRangeKmInput] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);

  useEffect(() => {
    runGeoSelfCheck();
    console.info('[HiWayStop] geo self-check complete');
  }, []);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Browser tidak menyokong geolocation.');
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLoc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

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
      const bearing = bearingDegrees(previousLoc, userLoc);
      return bearingToCardinal(bearing);
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

  const places = useMemo(() => {
    const rnrPlaces = rnrs.map(rnrToPlace);
    const fuelPlaces = highwayOnlyStations.map(stationToPlace);

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
  }, [facilityFilter, highwayOnlyStations, selectedBrands, viewMode]);

  const nearestTop10 = useMemo(() => {
    if (!userLoc) return [];
    return getNearestItems(userLoc, places, 10).map((item) => ({
      ...item,
      etaMinutes: getETA(item.distanceKm),
    }));
  }, [places, userLoc]);

  const nearestRnr = useMemo(() => {
    if (!userLoc) return null;
    const nearest = getNearestItems(
      userLoc,
      rnrs.map(rnrToPlace),
      1,
    )[0];
    if (!nearest) return null;
    return { ...nearest, etaMinutes: getETA(nearest.distanceKm) };
  }, [userLoc]);

  const nearestFuel = useMemo(() => {
    if (!userLoc) return null;
    const nearest = getNearestItems(
      userLoc,
      highwayOnlyStations.map(stationToPlace),
      1,
    )[0];
    if (!nearest) return null;
    return { ...nearest, etaMinutes: getETA(nearest.distanceKm) };
  }, [highwayOnlyStations, userLoc]);

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

  return (
    <main className="mx-auto min-h-screen max-w-5xl bg-white shadow-sm">
      <TopBar locationStatus={locationStatus} onUseLocation={useCurrentLocation} loading={locationLoading} />

      <section className="grid gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">R&R terdekat</p>
          {nearestRnr ? (
            <>
              <p className="mt-1 text-sm font-semibold text-slate-900">{nearestRnr.name}</p>
              <p className="text-xs text-slate-600">
                {nearestRnr.distanceKm.toFixed(1)} km • ETA {nearestRnr.etaMinutes} min
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
                {nearestFuel.distanceKm.toFixed(1)} km • ETA {nearestFuel.etaMinutes} min
                {nearestFuel.brand ? ` • ${nearestFuel.brand}` : ''}
              </p>
            </>
          ) : (
            <p className="mt-1 text-xs text-slate-500">Aktifkan lokasi untuk lihat stesen terdekat.</p>
          )}
        </div>
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
      />

      {!userLoc ? (
        <section className="flex h-[45vh] flex-col items-center justify-center gap-3 border-b border-slate-200 bg-slate-50 px-4 text-center">
          <LocateFixed className="h-8 w-8 text-slate-500" />
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
                  manualDirection === value
                    ? 'bg-brand-500 text-white'
                    : 'bg-white text-slate-700 ring-1 ring-slate-300'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {userLoc && places.length === 0 ? (
        <section className="flex items-center gap-2 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <MapPinOff className="h-4 w-4" />
          Tiada hasil sepadan dengan filter semasa.
        </section>
      ) : null}

      <BottomSheet
        nearest={nearestTop10}
        nextRnR={nextByDirection.rnr}
        nextFuel={nextByDirection.fuel}
        selected={selectedPlace}
        onSelect={setSelectedPlace}
        rangeKm={rangeKm}
      />
    </main>
  );
}

