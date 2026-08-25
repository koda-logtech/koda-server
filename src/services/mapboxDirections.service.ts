export type LineStringGeometry = {
  type: 'LineString';
  coordinates: [number, number][];
};

export type DirectionsResult = {
  geometry: LineStringGeometry;
  durationSeconds: number;
  distanceMeters: number;
};

function parseCoord(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

export function coordsAvailable(
  latOrig: unknown,
  lngOrig: unknown,
  latDest: unknown,
  lngDest: unknown,
): boolean {
  const lo = parseCoord(latOrig);
  const go = parseCoord(lngOrig);
  const ld = parseCoord(latDest);
  const gd = parseCoord(lngDest);
  if (lo === null || go === null || ld === null || gd === null) return false;
  const valid = Math.abs(lo) <= 90
    && Math.abs(ld) <= 90
    && Math.abs(go) <= 180
    && Math.abs(gd) <= 180;
  return valid;
}

export async function fetchDrivingDirections(
  token: string,
  originLng: number,
  originLat: number,
  destLng: number,
  destLat: number,
): Promise<DirectionsResult> {
  const coords = `${originLng},${originLat};${destLng},${destLat}`;
  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${encodeURIComponent(coords)}`,
  );
  url.searchParams.set('access_token', token);
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('overview', 'full');

  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mapbox Directions: ${res.status} ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    routes?: Array<{
      geometry?: LineStringGeometry;
      duration?: number;
      distance?: number;
    }>;
  };

  const route = data.routes?.[0];
  const geom = route?.geometry;
  if (
    !geom
    || geom.type !== 'LineString'
    || !Array.isArray(geom.coordinates)
    || geom.coordinates.length === 0
  ) {
    throw new Error('Mapbox Directions: rota vazia ou inválida');
  }

  return {
    geometry: {
      type: 'LineString',
      coordinates: geom.coordinates as [number, number][],
    },
    durationSeconds: typeof route.duration === 'number' ? route.duration : 0,
    distanceMeters: typeof route.distance === 'number' ? route.distance : 0,
  };
}
