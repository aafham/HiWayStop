'use client';

import { LocateFixed } from 'lucide-react';

type TopBarProps = {
  locationStatus: string;
  onUseLocation: () => void;
  loading: boolean;
};

export default function TopBar({ locationStatus, onUseLocation, loading }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">HiWayStop</h1>
          <p className="text-xs text-slate-600">Cari R&R & minyak-khusus di lebuh raya.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 sm:inline">
            {locationStatus}
          </span>
          <button
            type="button"
            onClick={onUseLocation}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <LocateFixed className="h-4 w-4" />
            {loading ? 'Mengesan...' : 'Guna lokasi saya'}
          </button>
        </div>
      </div>
      <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-600 sm:hidden">{locationStatus}</div>
    </header>
  );
}

