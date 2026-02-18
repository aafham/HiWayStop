# HiWayStop

Tagline: **Cari R&R & minyak-khusus di lebuh raya.**

HiWayStop ialah web app highway-only untuk pengguna lebuh raya Malaysia.
Aplikasi ini hanya memaparkan R&R dan stesen minyak yang patuh peraturan corridor lebuh raya.

## Tech Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Leaflet (OpenStreetMap tiles)
- Browser Geolocation API
- Local JSON dataset (`/data`) tanpa DB

## Ciri MVP

1. Home
- Butang `Guna lokasi saya`
- Toggle `Semua / R&R / Minyak`
- Medan `Destinasi (optional)` (placeholder routing)
- Papar highway semasa berdasarkan polyline terdekat, atau `Tidak pasti`

2. Map + List
- Peta pin untuk R&R dan stesen minyak highway-only
- Bottom sheet list boleh scroll
- Tap card/pin: nama, highway, arah, jarak, ETA, kemudahan, brand

3. Nearest & Next
- `Terdekat dari anda` (Top 10)
- `Seterusnya ikut arah` (3 R&R + 3 stesen minyak)
- Arah dari:
  - heading geolocation/device jika ada
  - bearing lokasi lama -> lokasi semasa
  - fallback pilihan manual `NORTH/SOUTH/EAST/WEST`

4. Highway-only Rule
- Stesen minyak dipaparkan hanya jika:
  - dalam corridor buffer highway (default 400m), atau
  - `type = "RNR_STATION"`
- Stesen luar corridor disisihkan automatik

5. Filters
- Multi-select brand minyak
- Filter kemudahan R&R (`surau`, `toilet`, `foodcourt`, `ev`)
- Slider corridor buffer `200m - 800m`

6. Fuel Range Mode (bonus)
- Input range km
- Item luar range digraykan/disabled
- Warning jika tiada stesen minyak dalam range

## Struktur Folder

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
lib/
  data.ts
  geo.ts
  transform.ts
data/
  highways.json
  rnr.json
  stations.json
types/
  index.ts
```

## Data Model

### `data/highways.json`
- `id`, `name`, `code`
- `polyline: [{lat, lng}, ...]`
- Sample tersedia: `PLUS (E1)`, `LPT1 (E8)`

### `data/rnr.json`
- `id`, `name`, `highwayId`, `direction`, `lat`, `lng`
- `facilities: { surau, toilet, foodcourt, ev }`
- `hasFuel`, `fuelBrands[]`
- Sample: 8 R&R

### `data/stations.json`
- `id`, `name`, `brand`
- `type: "RNR_STATION" | "HIGHWAY_STATION"`
- `highwayId`, `direction`, `lat`, `lng`, `rnrId`
- Sample: 10 stesen (termasuk beberapa sengaja luar corridor untuk test)

## Fungsi Utama (lib/geo.ts)

- `haversineKm(a, b)`
  - Jarak geodesic dalam km

- `distanceToSegmentMeters(point, start, end)`
  - Jarak point -> segmen polyline (meter)

- `isWithinHighwayCorridor(point, highwayPolylines, bufferMeters)`
  - Semak point berada dalam buffer corridor

- `filterHighwayOnlyStations(stations, highways, bufferMeters)`
  - Terapkan peraturan highway-only:
    - lulus jika `RNR_STATION`
    - atau lulus corridor check untuk `HIGHWAY_STATION`

- `getNearestItems(userLoc, items, limit)`
  - Susun item mengikut jarak terdekat

- `getETA(distanceKm, speedKmh=100)`
  - Anggaran ETA ringkas (minit)

- `getNextAlongHighway(userLoc, highwayPolyline, direction, items, limit)`
  - Cari item seterusnya mengikut progress sepanjang polyline + arah

- `detectClosestHighway(userLoc, highways)`
  - Tentukan highway semasa berdasarkan segmen terdekat

- `runGeoSelfCheck()`
  - Self-check ringkas semasa app load

## Cara Run

1. Install dependency:
```bash
npm install
```

2. Jalankan development server:
```bash
npm run dev
```

3. Buka browser:
```text
http://localhost:3000
```

## Cara Guna

1. Tekan `Guna lokasi saya` dan benarkan permission.
2. Pilih mode `Semua`, `R&R`, atau `Minyak`.
3. Ubah filter brand, kemudahan, dan corridor buffer.
4. Semak seksyen:
- `Terdekat dari anda`
- `Seterusnya ikut arah`
5. Jika arah tidak dikesan, pilih arah manual.
6. Masukkan `Fuel Range Mode` untuk semak capaian range.

## Migrasi Ke DB (bila perlu)

Reka bentuk sekarang memudahkan migrasi:
- Kekalkan `types/index.ts` sebagai kontrak schema
- Ganti `lib/data.ts` (import JSON) kepada data access layer DB/API
- Reuse semua util geospatial di `lib/geo.ts`
- UI (`components/*`) tidak perlu perubahan besar

## Nota Penting

- Tiada API berbayar digunakan.
- Tiada data station luar highway dipaparkan jika gagal highway-only rule.
- Destinasi masih placeholder untuk fasa routing seterusnya.
