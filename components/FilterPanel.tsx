'use client';

import { SlidersHorizontal } from 'lucide-react';
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
  return (
    <section className="space-y-3 border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <SlidersHorizontal className="h-4 w-4" />
        Penapis
      </div>

      <div className="flex gap-2">
        {viewModes.map((mode) => (
          <button
            key={mode.value}
            type="button"
            onClick={() => setViewMode(mode.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              viewMode === mode.value
                ? 'bg-brand-500 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <input
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        placeholder="Destinasi (optional)"
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:ring"
      />

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Brand minyak</p>
        <div className="flex flex-wrap gap-2">
          {brands.map((brand) => {
            const active = selectedBrands.includes(brand);
            return (
              <button
                key={brand}
                type="button"
                onClick={() => toggleBrand(brand)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  active
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                {brand}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Kemudahan R&R</p>
        <div className="flex flex-wrap gap-2">
          {(['surau', 'toilet', 'foodcourt', 'ev'] as Array<keyof FacilityFlags>).map((facility) => {
            const active = facilities[facility];
            return (
              <button
                key={facility}
                type="button"
                onClick={() => toggleFacility(facility)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  active
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                {facility.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>Corridor buffer</span>
          <span>{bufferMeters}m</span>
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
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="range">
          Fuel Range Mode (km)
        </label>
        <input
          id="range"
          type="number"
          min={0}
          value={rangeKm}
          onChange={(e) => setRangeKm(e.target.value)}
          placeholder="Contoh: 350"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:ring"
        />
      </div>
    </section>
  );
}

