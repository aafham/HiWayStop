'use client';

import { LocateFixed } from 'lucide-react';

type TopBarProps = {
  locationStatus: string;
  onUseLocation: () => void;
  loading: boolean;
};

export default function TopBar({ locationStatus, onUseLocation, loading }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3.5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">HiWayStop</h1>
          <p className="text-xs font-medium text-slate-500">Find R&R and fuel stops exclusively on highways.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 shadow-sm sm:inline">
            {locationStatus}
          </span>
          <button
            type="button"
            onClick={onUseLocation}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white shadow-[0_6px_20px_rgba(21,149,112,0.25)] hover:-translate-y-[1px] hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <LocateFixed className="h-4 w-4" />
            {loading ? 'Locating...' : 'Use my location'}
          </button>
        </div>
      </div>
      <div className="border-t border-slate-100/80 bg-white/70 px-4 py-2 text-xs text-slate-600 sm:hidden">{locationStatus}</div>
    </header>
  );
}
