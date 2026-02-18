'use client';

import { Clock3, Fuel, MapPinned } from 'lucide-react';
import { PlaceItem } from '@/types';

type ItemCardProps = {
  item: PlaceItem;
  onSelect: (item: PlaceItem) => void;
  disabled: boolean;
};

export default function ItemCard({ item, onSelect, disabled }: ItemCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      disabled={disabled}
      className={`w-full rounded-2xl border p-3 text-left transition ${
        disabled
          ? 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-60'
          : 'border-slate-200 bg-white hover:border-brand-500 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">{item.name}</p>
          <p className="mt-1 text-xs text-slate-600">
            {item.highwayId} • {item.direction}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">
          {item.kind === 'RNR' ? 'R&R' : 'MINYAK'}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-700">
        <span className="inline-flex items-center gap-1">
          <MapPinned className="h-3.5 w-3.5" />
          {(item.distanceKm ?? 0).toFixed(1)} km
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock3 className="h-3.5 w-3.5" />
          {item.etaMinutes ?? 0} min
        </span>
        {item.kind === 'FUEL' && item.brand ? (
          <span className="inline-flex items-center gap-1">
            <Fuel className="h-3.5 w-3.5" />
            {item.brand}
          </span>
        ) : null}
      </div>
    </button>
  );
}
