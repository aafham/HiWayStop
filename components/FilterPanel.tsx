'use client';

import { useState } from 'react';
import { Check, Fuel, Route, Search, SlidersHorizontal, Sparkles, Undo2 } from 'lucide-react';
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
  onResetFilters: () => void;
  fuelInRangeCount: number | null;
  totalFuelCount: number;
  selectAllBrands: () => void;
  clearBrands: () => void;
  selectAllFacilities: () => void;
  clearFacilities: () => void;
};

const viewModes: Array<{ label: string; value: ViewMode }> = [
  { label: 'All', value: 'ALL' },
  { label: 'R&R', value: 'RNR' },
  { label: 'Fuel', value: 'FUEL' },
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
  onResetFilters,
  fuelInRangeCount,
  totalFuelCount,
  selectAllBrands,
  clearBrands,
  selectAllFacilities,
  clearFacilities,
}: FilterPanelProps) {
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [brandsOpen, setBrandsOpen] = useState(false);
  const [facilitiesOpen, setFacilitiesOpen] = useState(false);
  const activeFacilitiesCount = Object.values(facilities).filter(Boolean).length;
  const summarize = (items: string[], limit = 3) =>
    items.length <= limit ? items.join(', ') : `${items.slice(0, limit).join(', ')} +${items.length - limit} more`;
  const sliderLeftPct = ((bufferMeters - 200) / 600) * 100;
  const destinationSuggestions = ['Ipoh', 'Kuantan', 'Johor Bahru'];
  const rangeSuggestions = ['100', '200', '350', '500'];

  return (
    <section className="space-y-4 border-b border-slate-200/70 bg-gradient-to-b from-white/90 to-slate-50/70 px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
            Corridor {bufferMeters}m
          </span>
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-2 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
        <div className="grid grid-cols-3 gap-2">
          {viewModes.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => setViewMode(mode.value)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                viewMode === mode.value ? 'bg-brand-500 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-3.5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
        <button
          type="button"
          onClick={() => setDestinationOpen((prev) => !prev)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Destination (optional)</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {destination.trim() ? 'Set' : 'Off'}
          </span>
        </button>
        {destinationOpen ? (
          <>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Example: Ipoh / Kuantan" className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:bg-white focus:ring" />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {destinationSuggestions.map((item) => (
                <button key={item} type="button" onClick={() => setDestination(item)} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200">{item}</button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Full destination routing is not active yet. This field currently stores trip context.</p>
          </>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-3.5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
        <button
          type="button"
          onClick={() => setBrandsOpen((prev) => !prev)}
          className="mb-2 flex w-full items-center justify-between text-left"
        >
          <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500"><Fuel className="h-3.5 w-3.5" />Fuel Brands</p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{selectedBrands.length} selected</span>
        </button>
        {!brandsOpen && selectedBrands.length > 0 ? (
          <p className="text-[11px] text-slate-500">Selected: {summarize(selectedBrands)}</p>
        ) : null}
        {brandsOpen ? (
          <>
            <div className="mb-2 flex gap-2">
              <button type="button" onClick={selectAllBrands} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200">Select all</button>
              <button type="button" onClick={clearBrands} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200">Clear all</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {brands.map((brand) => {
                const active = selectedBrands.includes(brand);
                return (
                  <button key={brand} type="button" onClick={() => toggleBrand(brand)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'}`}>
                    {active ? <Check className="mr-1 inline h-3.5 w-3.5" /> : null}
                    {brand}
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-3.5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
        <button
          type="button"
          onClick={() => setFacilitiesOpen((prev) => !prev)}
          className="mb-2 flex w-full items-center justify-between text-left"
        >
          <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500"><Sparkles className="h-3.5 w-3.5" />R&R Facilities</p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{activeFacilitiesCount} selected</span>
        </button>
        {!facilitiesOpen && activeFacilitiesCount > 0 ? (
          <p className="text-[11px] text-slate-500">
            Selected: {summarize((['surau', 'toilet', 'foodcourt', 'ev'] as Array<keyof FacilityFlags>).filter((k) => facilities[k]).map((k) => k.toUpperCase()))}
          </p>
        ) : null}
        {facilitiesOpen ? (
          <>
            <div className="mb-2 flex gap-2">
              <button type="button" onClick={selectAllFacilities} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200">Select all</button>
              <button type="button" onClick={clearFacilities} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200">Clear all</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['surau', 'toilet', 'foodcourt', 'ev'] as Array<keyof FacilityFlags>).map((facility) => {
                const active = facilities[facility];
                return (
                  <button key={facility} type="button" onClick={() => toggleFacility(facility)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'}`}>
                    {active ? <Check className="mr-1 inline h-3.5 w-3.5" /> : null}
                    {facility.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-3.5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600">
          <span className="inline-flex items-center gap-1"><Route className="h-3.5 w-3.5" />Corridor buffer</span>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">{bufferMeters}m</span>
        </div>
        <div className="relative mb-1 h-5">
          <span className="absolute top-0 -translate-x-1/2 rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-semibold text-white" style={{ left: `${sliderLeftPct}%` }}>{bufferMeters}m</span>
        </div>
        <input type="range" min={200} max={800} step={50} value={bufferMeters} onChange={(e) => setBufferMeters(Number(e.target.value))} className="w-full" />
        <div className="mt-1 flex justify-between text-[11px] font-medium text-slate-500"><span>200m</span><span>800m</span></div>
        <p className="mt-1 text-[11px] text-slate-500">Larger buffer = more stations may pass the highway filter.</p>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-3.5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="range">Fuel Range Mode (km)</label>
        <div className="relative">
          <input id="range" type="number" min={0} value={rangeKm} onChange={(e) => setRangeKm(e.target.value)} placeholder="Example: 350" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 pr-12 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:bg-white focus:ring" />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">km</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {rangeSuggestions.map((value) => (
            <button key={value} type="button" onClick={() => setRangeKm(value)} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200">{value} km</button>
          ))}
        </div>
        {fuelInRangeCount !== null ? <p className="mt-2 text-[11px] font-medium text-slate-600">{fuelInRangeCount} / {totalFuelCount} fuel stations are within current range.</p> : null}
      </div>
    </section>
  );
}
