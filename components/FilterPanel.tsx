'use client';

import { Fuel, Route, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { FacilityFlags, ViewMode } from '@/types';

type FilterPanelProps = {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  destination: string;
  setDestination: (value: string) => void;
  selectedBrands: string[];
  toggleBrand: (brand: string) => void;
  brands: string[];
  facilities: FacilityFlags;
  toggleFacility: (key: keyof FacilityFlags) => void;
  bufferMeters: number;
  setBufferMeters: (value: number) => void;
  rangeKm: string;
  setRangeKm: (value: string) => void;
};

const viewModes: Array<{ label: string; value: ViewMode }> = [
  { label: 'Semua', value: 'ALL' },
  { label: 'R&R', value: 'RNR' },
  { label: 'Minyak', value: 'FUEL' },
];

export default function FilterPanel({
  viewMode,
  setViewMode,
  destination,
  setDestination,
  selectedBrands,
  toggleBrand,
  brands,
  facilities,
  toggleFacility,
  bufferMeters,
  setBufferMeters,
  rangeKm,
  setRangeKm,
}: FilterPanelProps) {
  const activeFacilitiesCount = Object.values(facilities).filter(Boolean).length;

  return (
    <section className="space-y-4 border-b border-slate-200 bg-gradient-to-b from-white to-slate-50 px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <SlidersHorizontal className="h-4 w-4" />
          Penapis
        </div>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
          Corridor {bufferMeters}m
        </span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="grid grid-cols-3 gap-2">
          {viewModes.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => setViewMode(mode.value)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                viewMode === mode.value
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Destinasi (optional)
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Contoh: Ipoh / Kuantan"
            className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:bg-white focus:ring"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Fuel className="h-3.5 w-3.5" />
            Brand Minyak
          </p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {selectedBrands.length} dipilih
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {brands.map((brand) => {
            const active = selectedBrands.includes(brand);
            return (
              <button
                key={brand}
                type="button"
                onClick={() => toggleBrand(brand)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                {brand}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Sparkles className="h-3.5 w-3.5" />
            Kemudahan R&R
          </p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {activeFacilitiesCount} dipilih
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['surau', 'toilet', 'foodcourt', 'ev'] as Array<keyof FacilityFlags>).map((facility) => {
            const active = facilities[facility];
            return (
              <button
                key={facility}
                type="button"
                onClick={() => toggleFacility(facility)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                {facility.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600">
          <span className="inline-flex items-center gap-1">
            <Route className="h-3.5 w-3.5" />
            Corridor buffer
          </span>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">{bufferMeters}m</span>
        </div>
        <input
          type="range"
          min={200}
          max={800}
          step={50}
          value={bufferMeters}
          onChange={(e) => setBufferMeters(Number(e.target.value))}
          className="w-full"
        />
        <div className="mt-1 flex justify-between text-[11px] font-medium text-slate-500">
          <span>200m</span>
          <span>800m</span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="range">
          Fuel Range Mode (km)
        </label>
        <div className="relative">
          <input
            id="range"
            type="number"
            min={0}
            value={rangeKm}
            onChange={(e) => setRangeKm(e.target.value)}
            placeholder="Contoh: 350"
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 pr-12 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:bg-white focus:ring"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
            km
          </span>
        </div>
      </div>
    </section>
  );
}

