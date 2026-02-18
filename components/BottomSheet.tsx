'use client';

import { AlertTriangle, Navigation } from 'lucide-react';
import { PlaceItem } from '@/types';
import ItemCard from '@/components/ItemCard';

type BottomSheetProps = {
  nearest: PlaceItem[];
  nextRnR: PlaceItem[];
  nextFuel: PlaceItem[];
  selected: PlaceItem | null;
  onSelect: (item: PlaceItem) => void;
  rangeKm: number | null;
};

export default function BottomSheet({
  nearest,
  nextRnR,
  nextFuel,
  selected,
  onSelect,
  rangeKm,
}: BottomSheetProps) {
  const noFuelInRange =
    rangeKm !== null &&
    rangeKm > 0 &&
    nextFuel.length > 0 &&
    nextFuel.every((item) => (item.distanceKm ?? 0) > rangeKm);

  return (
    <section className="max-h-[55vh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-sheet">
      {selected ? (
        <div className="mb-4 rounded-2xl border border-brand-100 bg-brand-50 p-3">
          <p className="text-sm font-bold text-brand-900">{selected.name}</p>
          <p className="text-xs text-brand-900/80">
            {selected.highwayId} • {selected.direction} • {(selected.distanceKm ?? 0).toFixed(1)} km • ETA{' '}
            {selected.etaMinutes ?? 0} min
          </p>
          {selected.facilities ? (
            <p className="mt-2 text-xs text-brand-900/80">
              Kemudahan: {Object.entries(selected.facilities)
                .filter(([, value]) => value)
                .map(([key]) => key)
                .join(', ') || 'Tiada'}
            </p>
          ) : null}
          {selected.kind === 'FUEL' && selected.brand ? (
            <p className="mt-1 text-xs text-brand-900/80">Brand: {selected.brand}</p>
          ) : null}
        </div>
      ) : null}

      {noFuelInRange ? (
        <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="inline-flex items-center gap-1 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Tiada stesen minyak dalam range.
          </p>
          <p className="mt-1">Cadangan: singgah R&R terdekat dahulu.</p>
        </div>
      ) : null}

      <div>
        <h2 className="mb-2 text-sm font-bold text-slate-900">Terdekat dari anda (Top 10)</h2>
        <div className="space-y-2">
          {nearest.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onSelect={onSelect}
              disabled={rangeKm !== null && rangeKm > 0 && (item.distanceKm ?? 0) > rangeKm}
            />
          ))}
          {nearest.length === 0 ? <p className="text-xs text-slate-500">Tiada data untuk dipaparkan.</p> : null}
        </div>
      </div>

      <div className="mt-4">
        <h2 className="mb-2 text-sm font-bold text-slate-900">Seterusnya ikut arah - R&R</h2>
        <div className="space-y-2">
          {nextRnR.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onSelect={onSelect}
              disabled={rangeKm !== null && rangeKm > 0 && (item.distanceKm ?? 0) > rangeKm}
            />
          ))}
          {nextRnR.length === 0 ? <p className="text-xs text-slate-500">Tiada R&R seterusnya.</p> : null}
        </div>
      </div>

      <div className="mt-4">
        <h2 className="mb-2 text-sm font-bold text-slate-900">Seterusnya ikut arah - Minyak</h2>
        <div className="space-y-2">
          {nextFuel.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onSelect={onSelect}
              disabled={rangeKm !== null && rangeKm > 0 && (item.distanceKm ?? 0) > rangeKm}
            />
          ))}
          {nextFuel.length === 0 ? (
            <p className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Navigation className="h-3.5 w-3.5" />
              Tiada stesen minyak seterusnya.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
