# HiWayStop

Tagline: **Find R&R and fuel stops exclusively on Malaysian highways.**

HiWayStop is a highway-only web app for Malaysian expressway users.
It shows only highway-relevant R&R areas and fuel stations using corridor-based filtering.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Leaflet + OpenStreetMap
- Browser Geolocation API
- Local JSON data (no DB yet)

## What The App Does

1. Detects current location and nearest highway
2. Shows nearest highway-only stops (R&R + fuel)
3. Filters fuel stations by corridor and R&R-linked station type
4. Supports range-based visibility (reachable vs out-of-range)
5. Provides next stops along travel direction
6. Provides direct navigation links for each stop

## Main Features

### Home & Location
- `Use my location`
- Current highway status (or nearest corridor estimate if uncertain)
- Safety notice
- Quick cards:
  - Nearest R&R
  - Nearest Fuel Station

### Filter Experience
- Global filter panel can be collapsed/expanded (default: collapsed)
- View mode: `All`, `R&R`, `Fuel`
- Destination input (context only for now)
- Fuel brand filters (multi-select)
- R&R facilities filters (multi-select)
- Corridor slider (`200m - 800m`)
- Fuel range input
- `Select all`, `Clear all`, `Reset`
- Compact active-filter tags shown under the filter toggle

### Map + List UX
- View mode switch: `Map`, `List`, `Map + List`
- Current-location marker + auto recenter
- Range ring on map when range is set
- Off-range markers dimmed
- Built-in legend
- Empty-map hint when filters hide all pins
- Bottom sheet list with skeleton loading
- Floating `View map` shortcut when deep in list
- Selected list item highlight + auto-scroll support

### Nearest, Next, Trip
- Nearest Top 10
- Next along direction for R&R + fuel
- Priority card: `Next Stop On Route`
- Trip panel:
  - auto next-stop selection (with fuel-priority logic when fuel range is low)
  - live next ETA from selected/priority stop
  - fuel-in-range ratio + warning when `0` in range
  - dynamic rest suggestion from ETA
  - collapsible trip panel UI
  - actionable buttons:
    - `Set next stop` selects and focuses the target item
    - `Find fuel in range` switches to fuel mode and focuses list
  - trip status badge:
    - `Ready`
    - `Needs direction`
    - `Fuel risk`

### Decision Aids
- Sort by:
  - Distance
  - ETA
  - A-Z
  - Route confidence
- ETA urgency colors
- Route confidence badges:
  - `R&R Site`
  - `R&R-linked`
  - `On Corridor`
- Sticky selected-stop action bar with `Navigate`
- Quick open actions in list:
  - `Open nearest`
  - `Open nearest fuel`
  - `Open nearest R&R`
- Selected stop persistence:
  - query param `sel=<itemId>`
  - localStorage fallback (`hiwaystop:selected-place-id`)

### Smart Empty State
- Context-aware "no result" reason
- One-tap fixes:
  - reset brands
  - reset facilities
  - increase buffer
  - clear destination

## Highway-only Rule

Fuel stations are shown only if:
1. They are inside the highway corridor buffer, or
2. `type = "RNR_STATION"`

Any station outside corridor is excluded, even if nearby.

## Project Structure

```text
app/
  globals.css
  layout.tsx
  page.tsx
components/
  BottomSheet.tsx
  FilterPanel.tsx
  HighwayMap.tsx
  ItemCard.tsx
  TopBar.tsx
scripts/
  import-malaysia-from-osm.mjs
lib/
  data.ts
  geo.ts
  navigation.ts
  spatial.ts
  transform.ts
data/
  highways.json
  rnr.json
  stations.json
  generated/
    highways.full.json
    rnr.full.json
    stations.full.json
types/
  index.ts
```

## Key Modules

### `lib/geo.ts`
- `haversineKm`
- `distanceToSegmentMeters`
- `isWithinHighwayCorridor`
- `filterHighwayOnlyStations`
- `getNearestItems`
- `getETA`
- `getNextAlongHighway`
- `detectClosestHighway`

### `lib/spatial.ts`
- Lightweight spatial indexing for faster nearest lookups on larger datasets.

### `lib/navigation.ts`
- Generates external driving navigation URLs.

### `lib/data.ts`
- Uses generated full datasets when available, otherwise falls back to sample JSON.

## Run Locally

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`

## Generate Full Malaysia Dataset

```bash
npm run data:import:my
```

Outputs:
- `data/generated/highways.full.json`
- `data/generated/rnr.full.json`
- `data/generated/stations.full.json`

## Deploy (Vercel)

1. Push repo to GitHub
2. Import project in Vercel (`Next.js`, root `./`)
3. Remove dummy env vars if any
4. Deploy
5. For later updates, push to `main` for auto redeploy

## Troubleshooting

- JSON parse error with hidden leading character in `package.json`
  - Cause: UTF-8 BOM
  - Fix: save files as UTF-8 without BOM

- `useSearchParams should be wrapped in suspense`
  - Fix already applied in `app/page.tsx` via `Suspense`

- `npm` command not found locally
  - Cause: Node.js/NPM is not installed or not in PATH
  - Fix: install Node.js LTS and verify with `node -v` and `npm -v`

## Update Log

### 2026-02-18
- Initial full MVP build (Next.js + TS + Tailwind + Leaflet)
- Added highway-only geo filtering and nearest/next logic
- Added map/list, filters, range mode, quick cards, route confidence
- Added Malaysia data importer script (`npm run data:import:my`)
- Added spatial index helper for large dataset performance
- Added UI/UX upgrades:
  - map/list toggle
  - sticky active-filter summary
  - map range ring + legend
  - selected-stop sticky navigation action
- Converted entire app copy to English
- Updated README to full English + architecture/feature coverage
- UI refinement update:
  - global filter collapse/expand control for cleaner layout
  - default collapsed filter state to reduce vertical clutter
  - simplified active filter chips for minimal look
  - improved uncertain highway status emphasis in top bar
  - map empty-state hint + polished legend card
  - quick open actions in list when no selection is active
  - removed quick preset block from filters for cleaner layout
  - merged top highway + safety message into one compact status card
  - removed duplicate highway status line in header
  - phase 1 current-trip logic activation:
    - auto next stop + live ETA + dynamic rest suggestion
    - actionable trip buttons (`Set next stop`, `Find fuel in range`)
    - fuel-range warning in trip card
  - phase 2 current-trip upgrade:
    - trip status badge (`Ready` / `Needs direction` / `Fuel risk`)
    - selected-stop persistence via query + localStorage
    - selected-item highlight and list auto-focus behavior

## Notes

- No paid APIs are used.
- Data is local JSON by default.
- For large OSM-based production data, validate tags and direction consistency before release.
