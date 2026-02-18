'use client';

import { AlertTriangle, ArrowUpDown, Navigation } from 'lucide-react';
import { buildNavigationUrl } from '@/lib/navigation';
import { PlaceItem, SortMode } from '@/types';
import ItemCard from '@/components/ItemCard';

type BottomSheetProps = {
  nearest: PlaceItem[];
  nextRnR: PlaceItem[];
  nextFuel: PlaceItem[];
  selected: PlaceItem | null;
  onSelect: (item: PlaceItem) => void;
  rangeKm: number | null;
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
  loading: boolean;
  onSetDirection: () => void;
  onIncreaseBuffer: () => void;
  onShowNearestOnly: () => void;
};

export default function BottomSheet({
  nearest,
  nextRnR,
  nextFuel,
  selected,
  onSelect,
  rangeKm,
  sortMode,
  onSortModeChange,
  loading,
  onSetDirection,
  onIncreaseBuffer,
  onShowNearestOnly,
}: BottomSheetProps) {
  const selectedEta = selected?.etaMinutes ?? 0;
  const selectedEtaClass = selectedEta < 10 ? 'bg-emerald-100 text-emerald-700' : selectedEta <= 20 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700';
  const noFuelInRange = rangeKm !== null && rangeKm > 0 && nextFuel.length > 0 && nextFuel.every((item) => (item.distanceKm ?? 0) > rangeKm);

  const onRouteLabel =
    selected?.onRouteConfidence === 'RNR_LINKED' ? 'R&R-linked' : selected?.onRouteConfidence === 'CORRIDOR_VERIFIED' ? 'On Corridor' : 'R&R Site';
  const noUpcoming = nextRnR.length === 0 && nextFuel.length === 0;

  return (
    <section className="max-h-[58vh] overflow-y-auto rounded-t-3xl border-t border-slate-200/80 bg-white/95 p-4 shadow-sheet backdrop-blur">
      {!selected && nearest.length > 0 ? (
        <div className="mb-3 flex gap-1 overflow-x-auto rounded-full border border-slate-200 bg-slate-50 p-1">
          <button type="button" onClick={() => onSelect(nearest[0])} className="rounded-full bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white">Open nearest</button>
          <button type="button" onClick={() => {
            const nearestFuel = nearest.find((item) => item.kind === 'FUEL');
            if (nearestFuel) onSelect(nearestFuel);
          }} className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700">Open nearest fuel</button>
          <button type="button" onClick={() => {
            const nearestRnr = nearest.find((item) => item.kind === 'RNR');
            if (nearestRnr) onSelect(nearestRnr);
          }} className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700">Open nearest R&R</button>
        </div>
      ) : null}

      {selected ? (
        <div className="mb-4 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-3.5">
          <p className="text-sm font-bold text-brand-900">{selected.name}</p>
          <p className="text-xs text-brand-900/80">{selected.highwayId} - {selected.direction} - {(selected.distanceKm ?? 0).toFixed(1)} km</p>
          <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${selectedEtaClass}`}>ETA {selectedEta} min</span>
          <p className="mt-1 text-xs font-semibold text-brand-900/80">Route confidence: {onRouteLabel}</p>
          {selected.facilities ? <p className="mt-2 text-xs text-brand-900/80">Facilities: {Object.entries(selected.facilities).filter(([, value]) => value).map(([key]) => key).join(', ') || 'None'}</p> : null}
          {selected.kind === 'FUEL' && selected.brand ? <p className="mt-1 text-xs text-brand-900/80">Brand: {selected.brand}</p> : null}
          <a href={buildNavigationUrl({ lat: selected.lat, lng: selected.lng })} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(21,149,112,0.25)] hover:-translate-y-[1px] hover:bg-brand-700"><Navigation className="h-3.5 w-3.5" />Navigate here</a>
        </div>
      ) : null}

      {noFuelInRange ? (
        <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="inline-flex items-center gap-1 font-semibold"><AlertTriangle className="h-4 w-4" />No fuel stations in range.</p>
          <p className="mt-1">Suggestion: stop at the nearest R&R first.</p>
        </div>
      ) : null}

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">Nearest to you (Top 10)</h2>
          <label className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
            <ArrowUpDown className="h-3.5 w-3.5" />
            <select value={sortMode} onChange={(e) => onSortModeChange(e.target.value as SortMode)} className="bg-transparent outline-none">
              <option value="DISTANCE">Nearest</option>
              <option value="ETA">Fastest ETA</option>
              <option value="ALPHA">A-Z</option>
              <option value="CONFIDENCE">Route confidence</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, idx) => <div key={idx} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />)}</div>
        ) : (
          <div className="space-y-1.5">
            {nearest.map((item) => <ItemCard key={item.id} item={item} onSelect={onSelect} selected={selected?.id === item.id} disabled={rangeKm !== null && rangeKm > 0 && (item.distanceKm ?? 0) > rangeKm} />)}
            {nearest.length === 0 ? <p className="text-xs text-slate-500">No matching data to show.</p> : null}
          </div>
        )}
      </div>

      {noUpcoming ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
          <p className="text-sm font-semibold text-slate-800">No upcoming stops for current direction</p>
          <p className="mt-1 text-xs text-slate-600">Try setting direction, widening buffer, or focus nearest stops.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={onSetDirection} className="rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">Set direction</button>
            <button type="button" onClick={onIncreaseBuffer} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-300">Increase buffer</button>
            <button type="button" onClick={onShowNearestOnly} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-300">Show nearest only</button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4">
            <h2 className="mb-2 text-sm font-bold text-slate-900">Next along direction - R&R</h2>
            <div className="space-y-1.5">
              {nextRnR.map((item) => <ItemCard key={item.id} item={item} onSelect={onSelect} selected={selected?.id === item.id} disabled={rangeKm !== null && rangeKm > 0 && (item.distanceKm ?? 0) > rangeKm} />)}
              {nextRnR.length === 0 ? <p className="text-xs text-slate-500">No upcoming R&R found.</p> : null}
            </div>
          </div>

          <div className="mt-4">
            <h2 className="mb-2 text-sm font-bold text-slate-900">Next along direction - Fuel</h2>
            <div className="space-y-1.5">
              {nextFuel.map((item) => <ItemCard key={item.id} item={item} onSelect={onSelect} selected={selected?.id === item.id} disabled={rangeKm !== null && rangeKm > 0 && (item.distanceKm ?? 0) > rangeKm} />)}
              {nextFuel.length === 0 ? <p className="inline-flex items-center gap-1 text-xs text-slate-500"><Navigation className="h-3.5 w-3.5" />No upcoming fuel stations found.</p> : null}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
