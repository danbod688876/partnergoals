// Thin client for the classic Google Places API (Nearby Search + Place
// Details) plus Geocoding, used to resolve the partner's city/neighborhood
// into coordinates. All functions no-op (return empty/null) when
// GOOGLE_PLACES_API_KEY isn't set, and swallow fetch/parse errors rather
// than throwing, so a Places outage never breaks the rest of the daily cron.

export type LatLng = { lat: number; lng: number };

export type NearbyPlace = {
  placeId: string;
  name: string;
  rating: number | null;
  userRatingsTotal: number | null;
  priceLevel: number | null;
  location: LatLng | null;
  vicinity: string | null;
};

export type PlaceDetail = NearbyPlace & {
  website: string | null;
  mapsUrl: string | null;
  // Google's own short editorial blurb, when it has one — the closest thing
  // to an "AI-generated, what this place is known for" sentence without an
  // extra model call per place.
  editorialSummary: string | null;
};

function apiKey(): string | null {
  return process.env.GOOGLE_PLACES_API_KEY || null;
}

type RawLocation = { lat: number; lng: number };

type RawPlace = {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  vicinity?: string;
  geometry?: { location?: RawLocation };
  website?: string;
  url?: string;
  editorial_summary?: { overview?: string };
};

type GoogleApiResponse = {
  status?: string;
  error_message?: string;
  results?: RawPlace[];
  result?: RawPlace;
};

async function safeFetchJson(url: string): Promise<GoogleApiResponse | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json: GoogleApiResponse = await res.json();
    if (json.status && json.status !== "OK" && json.status !== "ZERO_RESULTS") {
      console.warn(`Google Places API returned status ${json.status}: ${json.error_message ?? ""}`);
      return null;
    }
    return json;
  } catch (err) {
    console.warn("Google Places API request failed:", err);
    return null;
  }
}

export async function geocode(address: string): Promise<LatLng | null> {
  const key = apiKey();
  if (!key || !address.trim()) return null;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;
  const json = await safeFetchJson(url);
  const location = json?.results?.[0]?.geometry?.location;
  if (!location) return null;

  return { lat: location.lat, lng: location.lng };
}

export async function nearbySearch(params: {
  location: LatLng;
  radiusMeters?: number;
  keyword?: string;
  type?: "restaurant" | "lodging";
}): Promise<NearbyPlace[]> {
  const key = apiKey();
  if (!key) return [];

  const { location, radiusMeters = 3200, keyword, type = "restaurant" } = params;
  const searchParams = new URLSearchParams({
    location: `${location.lat},${location.lng}`,
    radius: String(radiusMeters),
    type,
    key,
  });
  if (keyword) searchParams.set("keyword", keyword);

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${searchParams}`;
  const json = await safeFetchJson(url);
  const results = json?.results ?? [];

  return results.map((r: RawPlace) => ({
    placeId: r.place_id,
    name: r.name,
    rating: r.rating ?? null,
    userRatingsTotal: r.user_ratings_total ?? null,
    priceLevel: r.price_level ?? null,
    location: r.geometry?.location
      ? { lat: r.geometry.location.lat, lng: r.geometry.location.lng }
      : null,
    vicinity: r.vicinity ?? null,
  }));
}

export async function placeDetails(placeId: string): Promise<PlaceDetail | null> {
  const key = apiKey();
  if (!key) return null;

  const fields =
    "name,rating,user_ratings_total,price_level,geometry,vicinity,website,url,editorial_summary";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${key}`;
  const json = await safeFetchJson(url);
  const r = json?.result;
  if (!r) return null;

  return {
    placeId,
    name: r.name,
    rating: r.rating ?? null,
    userRatingsTotal: r.user_ratings_total ?? null,
    priceLevel: r.price_level ?? null,
    location: r.geometry?.location
      ? { lat: r.geometry.location.lat, lng: r.geometry.location.lng }
      : null,
    vicinity: r.vicinity ?? null,
    website: r.website ?? null,
    mapsUrl: r.url ?? placeMapsUrl(placeId),
    editorialSummary: r.editorial_summary?.overview ?? null,
  };
}

export function distanceMiles(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return earthRadiusMiles * c;
}

export function placeMapsUrl(placeId: string): string {
  return `https://www.google.com/maps/place/?q=place_id:${placeId}`;
}
