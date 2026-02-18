import { writeFile } from 'node:fs/promises';

const OVERPASS = 'https://overpass-api.de/api/interpreter';

function overpassQuery(query) {
  return fetch(OVERPASS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: `data=${encodeURIComponent(query)}`,
  }).then(async (res) => {
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Overpass error ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json();
  });
}

function toDirection(raw) {
  const value = String(raw || '').toLowerCase();
  if (value.includes('north') || value === 'nb') return 'NORTHBOUND';
  if (value.includes('south') || value === 'sb') return 'SOUTHBOUND';
  if (value.includes('east') || value === 'eb') return 'EASTBOUND';
  if (value.includes('west') || value === 'wb') return 'WESTBOUND';
  return 'NORTHBOUND';
}

function guessBrand(tags = {}) {
  const b = tags.brand || tags.operator || '';
  const up = String(b).toUpperCase();
  if (up.includes('PETRONAS')) return 'PETRONAS';
  if (up.includes('SHELL')) return 'SHELL';
  if (up.includes('BHP')) return 'BHP';
  if (up.includes('CALTEX')) return 'CALTEX';
  if (up.includes('PETRON')) return 'PETRON';
  if (up.includes('RON95') || up.includes('RON97')) return 'UNKNOWN';
  return up || 'UNKNOWN';
}

function coordsFromElement(el) {
  if (typeof el.lat === 'number' && typeof el.lon === 'number') {
    return { lat: Number(el.lat.toFixed(6)), lng: Number(el.lon.toFixed(6)) };
  }
  if (el.center && typeof el.center.lat === 'number' && typeof el.center.lon === 'number') {
    return { lat: Number(el.center.lat.toFixed(6)), lng: Number(el.center.lon.toFixed(6)) };
  }
  return null;
}

function normalizeHighwayRef(tags = {}) {
  const ref = tags.ref || tags.int_ref || tags['name:en'] || tags.name || '';
  if (!ref) return null;
  return String(ref).split(';')[0].trim();
}

const highwaysQuery = `
[out:json][timeout:240];
{{geocodeArea:Malaysia}}->.my;
(
  way["highway"="motorway"](area.my);
  way["highway"="motorway_link"](area.my);
);
out tags geom;
`;

const rnrQuery = `
[out:json][timeout:240];
{{geocodeArea:Malaysia}}->.my;
(
  node["highway"="rest_area"](area.my);
  node["amenity"="rest_area"](area.my);
  way["highway"="rest_area"](area.my);
  way["amenity"="rest_area"](area.my);
);
out center tags;
`;

const fuelQuery = `
[out:json][timeout:240];
{{geocodeArea:Malaysia}}->.my;
(
  node["amenity"="fuel"](area.my);
  way["amenity"="fuel"](area.my);
);
out center tags;
`;

function dedupeById(items) {
  const map = new Map();
  for (const item of items) map.set(item.id, item);
  return [...map.values()];
}

function mapHighways(elements) {
  const grouped = new Map();

  for (const el of elements) {
    const ref = normalizeHighwayRef(el.tags);
    if (!ref) continue;
    const key = ref;
    const polyline = (el.geometry || [])
      .map((g) => ({ lat: Number(g.lat.toFixed(6)), lng: Number(g.lon.toFixed(6)) }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

    if (polyline.length < 2) continue;

    const current = grouped.get(key) || {
      id: key.replace(/[^A-Za-z0-9]/g, '_'),
      name: el.tags.name || ref,
      code: ref,
      polyline: [],
    };

    if (current.polyline.length === 0 || polyline.length > current.polyline.length) {
      current.polyline = polyline;
    }

    grouped.set(key, current);
  }

  return [...grouped.values()];
}

function mapRnR(elements) {
  return dedupeById(
    elements
      .map((el) => {
        const coords = coordsFromElement(el);
        if (!coords) return null;
        const tags = el.tags || {};
        const name = tags.name || tags['name:en'] || `R&R ${el.type}/${el.id}`;
        const ref = normalizeHighwayRef(tags) || 'UNKNOWN';
        const fuel = String(tags.fuel || '').toLowerCase() === 'yes';
        return {
          id: `rnr_${el.type}_${el.id}`,
          name,
          highwayId: ref.replace(/[^A-Za-z0-9]/g, '_') || 'UNKNOWN',
          direction: toDirection(tags.direction),
          lat: coords.lat,
          lng: coords.lng,
          facilities: {
            surau: Boolean(tags.religion === 'muslim' || tags.prayer_room === 'yes'),
            toilet: tags.toilets !== 'no',
            foodcourt: Boolean(tags.restaurant === 'yes' || tags.fast_food === 'yes' || tags.food_court === 'yes'),
            ev: Boolean(tags['socket:type2'] || tags.charging_station === 'yes' || tags.amenity === 'charging_station'),
          },
          hasFuel: fuel,
          fuelBrands: [],
        };
      })
      .filter(Boolean),
  );
}

function mapStations(elements) {
  return dedupeById(
    elements
      .map((el) => {
        const coords = coordsFromElement(el);
        if (!coords) return null;
        const tags = el.tags || {};
        const ref = normalizeHighwayRef(tags) || 'UNKNOWN';
        return {
          id: `st_${el.type}_${el.id}`,
          name: tags.name || tags.operator || `Fuel ${el.type}/${el.id}`,
          brand: guessBrand(tags),
          type: tags.highway === 'rest_area' ? 'RNR_STATION' : 'HIGHWAY_STATION',
          highwayId: ref.replace(/[^A-Za-z0-9]/g, '_') || 'UNKNOWN',
          direction: toDirection(tags.direction),
          lat: coords.lat,
          lng: coords.lng,
          rnrId: null,
        };
      })
      .filter(Boolean),
  );
}

async function main() {
  console.log('Fetching highways from OSM...');
  const highwaysRaw = await overpassQuery(highwaysQuery);
  console.log('Fetching R&R from OSM...');
  const rnrRaw = await overpassQuery(rnrQuery);
  console.log('Fetching fuel stations from OSM...');
  const stationsRaw = await overpassQuery(fuelQuery);

  const highways = mapHighways(highwaysRaw.elements || []);
  const rnrs = mapRnR(rnrRaw.elements || []);
  const stations = mapStations(stationsRaw.elements || []);

  await writeFile('data/generated/highways.full.json', JSON.stringify(highways, null, 2) + '\n', 'utf8');
  await writeFile('data/generated/rnr.full.json', JSON.stringify(rnrs, null, 2) + '\n', 'utf8');
  await writeFile('data/generated/stations.full.json', JSON.stringify(stations, null, 2) + '\n', 'utf8');

  console.log(`Done. highways=${highways.length}, rnr=${rnrs.length}, stations=${stations.length}`);
  console.log('Generated files in data/generated/*.full.json');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
