# HiWayStop

Tagline: **Find R&R and fuel stops exclusively on Malaysian highways.**

HiWayStop is a highway-only web app for highway users in Malaysia.
It focuses on R&R areas and fuel stations along highways only, with a corridor-based filter that removes off-highway stations.

## Overview

- Framework: Next.js App Router + TypeScript
- UI: Tailwind CSS (mobile-first)
- Map: Leaflet + OpenStreetMap
- Location: Browser Geolocation API
- Data: Local JSON (`/data`) + optional generated full dataset (`/data/generated`)

## Core Features

### 1) Home & Location
- `Use my location` button
- Current location status + current highway (closest polyline)
- Safety banner
- Quick cards:
  - `Nearest R&R`
  - `Nearest Fuel Station`

### 2) Filters
- View toggle: `All`, `R&R`, `Fuel`
- Optional destination input + quick suggestions
- Fuel brand multi-select
- R&R facility multi-select (`surau`, `toilet`, `foodcourt`, `ev`)
- Corridor slider `200m - 800m`
- Fuel range mode + quick range chips
- Quick presets (`Fuel First`, `Family Stop`, `EV Only`)
- 1-tap reset, select all, clear all
- Sticky active-filter summary
- Compact filter mode on scroll

### 3) Map + List UX
- View mode switch: `Map`, `List`, `Map + List`
- Clear current-location marker + auto recenter
- Range ring shown on map when fuel range is set
- Off-range markers dimmed
- Built-in map legend
- Scrollable bottom sheet list + loading skeletons

### 4) Nearest / Next / Priority
- `Nearest to you (Top 10)`
- `Next along direction` for both R&R and fuel
- Priority card: `Next Stop On Route`
- Trip panel:
  - next stop distance
  - next ETA
  - fuel in range
  - rest suggestion

### 5) Decision Aids
- Sort list by:
  - nearest distance
  - fastest ETA
  - A-Z
  - route confidence
- ETA urgency colors (green/yellow/gray)
- Route confidence badges (`R&R Site`, `R&R-linked`, `On Corridor`)
- Direct `Navigate` action from cards/detail

### 6) Smart Empty State
- Context-aware empty reason
- One-tap fixes:
  - reset brands
  - reset facilities
  - increase buffer
  - clear destination

## Highway-only Rule (Core Logic)

Fuel stations are shown only if:
1. they are within the highway corridor buffer, or
2. `type = "RNR_STATION"`.

Stations outside the corridor are excluded even if they are physically near.

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

## Data Model

### `data/highways.json`
- `id`, `name`, `code`, `polyline[]`

### `data/rnr.json`
- `id`, `name`, `highwayId`, `direction`, `lat`, `lng`
- `facilities`, `hasFuel`, `fuelBrands[]`

### `data/stations.json`
- `id`, `name`, `brand`, `type`
- `highwayId`, `direction`, `lat`, `lng`, `rnrId`

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
- Lightweight spatial grid indexing for faster nearest queries on large datasets.

### `lib/navigation.ts`
- Generates external driving navigation links.

### `lib/data.ts`
- Automatic fallback strategy:
  - use `data/generated/*.full.json` if populated
  - fallback to sample `data/*.json` if not

## Run Locally

1. Install dependencies:
```bash
npm install
```

2. Start dev server:
```bash
npm run dev
```

3. Open:
```text
http://localhost:3000
```

## Generate Full Malaysia Dataset

```bash
npm run data:import:my
```

Generated files:
- `data/generated/highways.full.json`
- `data/generated/rnr.full.json`
- `data/generated/stations.full.json`

## Deploy on Vercel

1. Push repo to GitHub
2. Import project in Vercel (`Next.js`, root `./`)
3. Remove any dummy env vars (if present)
4. Deploy
5. Future updates: `git push` triggers auto redeploy

## Quick Troubleshooting

- JSON error `Unexpected token 'ï»¿'`
  - Cause: UTF-8 BOM
  - Fix: save files as UTF-8 without BOM

- Error `useSearchParams should be wrapped in suspense`
  - Already handled: page is wrapped in a `Suspense` boundary

## Notes

- No paid APIs are used.
- Data is local JSON by default.
- For production with large OSM imports, add manual validation for tagging consistency.
