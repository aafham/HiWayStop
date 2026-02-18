'use client';

import { Clock3, Fuel, MapPinned, Navigation } from 'lucide-react';
import { buildNavigationUrl } from '@/lib/navigation';
import { PlaceItem } from '@/types';

type ItemCardProps = {
  item: PlaceItem;
  onSelect: (item: PlaceItem) => void;
  disabled: boolean;
};

export default function ItemCard({ item, onSelect, disabled }: ItemCardProps) {
  const onRouteLabel =
    item.onRouteConfidence === 'RNR_LINKED'
      ? 'R&R-linked'
      : item.onRouteConfidence === 'CORRIDOR_VERIFIED'
        ? 'On Corridor'
        : 'R&R Site';

  return (
    <div
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
            {item.highwayId} - {item.direction}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">
            {item.kind === 'RNR' ? 'R&R' : 'MINYAK'}
          </span>
          <span className="rounded-full bg-brand-50 px-2 py-1 text-[10px] font-semibold text-brand-700">
            {onRouteLabel}
          </span>
        </div>
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

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onSelect(item)}
          disabled={disabled}
          className="flex-1 rounded-xl bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Lihat Detail
        </button>
        <a
          href={buildNavigationUrl({ lat: item.lat, lng: item.lng })}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400"
        >
          <Navigation className="h-3.5 w-3.5" />
          Navigasi
        </a>
      </div>
    </div>
  );
}
