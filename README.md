# HiWayStop

Tagline: **Cari R&R & minyak-khusus di lebuh raya.**

HiWayStop ialah web app highway-only untuk pengguna lebuh raya Malaysia.
Aplikasi ini fokus kepada R&R dan stesen minyak sepanjang lebuh raya sahaja, dengan logik corridor untuk tapis station luar highway.

## Ringkasan

- Platform: Next.js App Router + TypeScript
- UI: Tailwind CSS (mobile-first)
- Peta: Leaflet + OpenStreetMap
- Lokasi: Browser Geolocation API
- Data: Local JSON (`/data`) + optional generated full dataset (`/data/generated`)

## Ciri Utama Website

### 1) Home & Lokasi
- Butang `Guna lokasi saya`
- Status lokasi + highway semasa (closest polyline)
- Banner keselamatan: jangan guna app semasa memandu
- Kad cepat:
  - `R&R terdekat`
  - `Stesen minyak terdekat`

### 2) Penapis (Filter UX)
- Toggle view: `Semua`, `R&R`, `Minyak`
- `Destinasi (optional)` + quick suggestion
- Brand minyak multi-select
- Kemudahan R&R multi-select (`surau`, `toilet`, `foodcourt`, `ev`)
- Slider corridor `200m - 800m`
- Fuel range mode + preset quick range chips
- Quick preset:
  - `Wajib Minyak`
  - `Family Stop`
  - `EV Sahaja`
- Reset filter 1-tap
- Sticky mini summary filter aktif
- Compact filter mode on scroll (boleh expand/collapse)

### 3) Map + List Experience
- Toggle paparan: `Map`, `List`, `Map + List`
- Marker lokasi semasa jelas + recenter automatik
- Range ring atas map bila range diisi
- Marker `off-range` dikelabukan
- Map legend (R&R / Minyak / Lokasi / Off-range)
- Bottom sheet list scrollable + skeleton loading

### 4) Nearest, Next, Priority
- `Terdekat dari anda` (Top 10)
- `Seterusnya ikut arah` (R&R + Minyak)
- Priority card: `Seterusnya dalam laluan`
- Trip panel:
  - Next stop km
  - ETA next
  - Fuel dalam range
  - Cadangan rehat

### 5) Sorting & Decision Support
- Sort list terdekat:
  - `Paling dekat`
  - `ETA terpantas`
  - `A-Z`
- ETA urgency color:
  - hijau (<10 min)
  - kuning (10-20 min)
  - kelabu (>20 min)

### 6) On-Route Confidence + Navigation
- Badge confidence:
  - `R&R Site`
  - `R&R-linked`
  - `On Corridor`
- Butang `Navigasi` (Google Maps directions URL)

### 7) Empty State Pintar
- Empty state ikut konteks filter aktif
- Suggestion tindakan cepat:
  - reset brand
  - reset kemudahan
  - naikkan buffer
  - kosongkan destinasi

## Highway-only Rule (Core)

Stesen minyak dipaparkan hanya jika:
1. berada dalam `highway corridor buffer`, atau
2. `type = "RNR_STATION"`.

Station luar corridor akan ditapis keluar walaupun jarak dekat.

## Struktur Projek

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

## Fungsi / Modul Penting

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
- Grid spatial index ringkas untuk percepat nearest query bila dataset besar.

### `lib/navigation.ts`
- Bina URL navigation terus ke destinasi.

### `lib/data.ts`
- Auto fallback:
  - guna `data/generated/*.full.json` jika ada data
  - fallback ke sample `data/*.json` jika tiada

## Cara Run (Local)

1. Install dependency:
```bash
npm install
```

2. Jalankan dev server:
```bash
npm run dev
```

3. Buka:
```text
http://localhost:3000
```

## Generate Data Malaysia Penuh

```bash
npm run data:import:my
```

Script akan jana:
- `data/generated/highways.full.json`
- `data/generated/rnr.full.json`
- `data/generated/stations.full.json`

## Deploy Vercel

1. Push repo ke GitHub
2. Import project di Vercel (`Next.js`, root `./`)
3. Remove dummy env vars (jika ada)
4. Deploy
5. Update seterusnya: `git push` -> auto redeploy

## Troubleshooting Ringkas

- Error JSON `Unexpected token '﻿'`
  - Punca: UTF-8 BOM
  - Fix: simpan fail sebagai UTF-8 without BOM

- Error `useSearchParams should be wrapped in suspense`
  - Sudah ditangani: page client dibalut dengan `Suspense`

## Update Log

### 2026-02-18 (v0.1.0 -> v0.3.0)
- Bina app penuh dari kosong (Next.js + TS + Tailwind + Leaflet)
- Tambah dataset sample highways/R&R/stations
- Implement highway-only corridor filtering
- Implement nearest + next-by-direction
- Tambah Fuel Range mode
- Tambah quick cards nearest bawah header
- Fix encoding issue (UTF-8 without BOM) untuk Vercel
- Fix type issue `getNextAlongHighway`
- Fix `useSearchParams` dengan `Suspense`
- Tambah import script data Malaysia dari OSM (generated JSON)
- Polish UI/UX besar:
  - quick preset
  - reset filter
  - sticky summary
  - map/list toggle
  - compact filter on scroll
  - map legend + range ring
  - urgency ETA colors
  - priority next stop card
  - trip summary panel
  - contextual empty state
  - on-route confidence badges
  - navigate button per card

## Nota

- Tiada API berbayar digunakan.
- Semua data daripada local JSON.
- Untuk production dengan data besar, disyorkan semakan manual dataset OSM (direction/tag consistency).
