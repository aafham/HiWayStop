'use client';

import { useEffect, useState } from 'react';
import { LocateFixed } from 'lucide-react';

type TopBarProps = {
  locationStatus: string;
  isHighwayUncertain: boolean;
  onUseLocation: () => void;
  loading: boolean;
  hasLocation?: boolean;
  showStatus?: boolean;
};

export default function TopBar({ locationStatus, isHighwayUncertain, onUseLocation, loading, hasLocation = false, showStatus = true }: TopBarProps) {
  const [compact, setCompact] = useState(false);
  const locationClass = isHighwayUncertain
    ? 'border-amber-300 bg-amber-50 text-amber-900'
    : 'border-slate-200 bg-white text-slate-600';

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 backdrop-blur-xl">
      <div className={`mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 ${compact ? 'py-2.5' : 'py-3.5'}`}>
        <div>
          <h1 className={`${compact ? 'text-lg' : 'text-xl'} font-bold tracking-tight text-slate-900`}>HiWayStop</h1>
          {!compact ? <p className="text-xs font-medium text-slate-500">Highway-only R&R & fuel in Malaysia.</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {showStatus ? <span className={`hidden rounded-full border px-3 py-1 text-xs shadow-sm sm:inline ${locationClass}`}>
            {locationStatus}
          </span> : null}
          <button
            type="button"
            onClick={onUseLocation}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-full bg-brand-500 ${compact ? 'px-3 py-1.5' : 'px-3.5 py-2'} text-xs font-semibold text-white shadow-[0_6px_20px_rgba(21,149,112,0.25)] hover:-translate-y-[1px] hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70`}
          >
            <LocateFixed className="h-4 w-4" />
            {loading ? 'Locating...' : hasLocation ? 'Refresh location' : 'Use my location'}
          </button>
        </div>
      </div>
      {showStatus ? <div className={`border-t px-4 py-2 text-xs sm:hidden ${isHighwayUncertain ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-100/80 bg-white/70 text-slate-600'}`}>{locationStatus}</div> : null}
    </header>
  );
}
