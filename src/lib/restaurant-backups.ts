import { eq } from "drizzle-orm";
import { db } from "@/db";
import { partner, placesBackupCache } from "@/db/schema";
import { distanceMiles, geocode, nearbySearch, placeDetails, placeMapsUrl, type LatLng } from "@/lib/google-places";

const CACHE_TTL_HOURS = 24;
const MAX_RESULTS = 5;

export type RestaurantBackup = {
  name: string;
  rating: number | null;
  userRatingsTotal: number | null;
  distanceMiles: number | null;
  priceLevel: number | null;
  mapsUrl: string;
};

function cacheKeyFor(neighborhood: string | null, cuisine: string | null): string {
  return `${(neighborhood ?? "any").trim().toLowerCase()}|${(cuisine ?? "any").trim().toLowerCase()}`;
}

async function getPartnerOrigin(): Promise<{ location: LatLng; city: string } | null> {
  const [row] = await db.select().from(partner).limit(1);
  if (!row?.city) return null;

  const location = await geocode([row.neighborhood, row.city].filter(Boolean).join(", "));
  if (!location) return null;

  return { location, city: row.city };
}

async function fetchFreshBackups(params: {
  neighborhood: string | null;
  cuisine: string | null;
  excludeName?: string;
}): Promise<RestaurantBackup[]> {
  const origin = await getPartnerOrigin();
  if (!origin) return [];

  // Search near the restaurant's own neighborhood when we have one to
  // geocode; otherwise fall back to the partner's general area.
  const searchOrigin = params.neighborhood
    ? (await geocode(`${params.neighborhood}, ${origin.city}`)) ?? origin.location
    : origin.location;

  const results = await nearbySearch({
    location: searchOrigin,
    keyword: params.cuisine ?? undefined,
  });

  const candidates = results
    .filter((r) => !params.excludeName || r.name.toLowerCase() !== params.excludeName.toLowerCase())
    .filter((r) => r.rating != null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.userRatingsTotal ?? 0) - (a.userRatingsTotal ?? 0))
    .slice(0, MAX_RESULTS);

  const detailed = await Promise.all(candidates.map((c) => placeDetails(c.placeId)));

  return detailed
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .map((d) => ({
      name: d.name,
      rating: d.rating,
      userRatingsTotal: d.userRatingsTotal,
      distanceMiles: d.location ? Math.round(distanceMiles(searchOrigin, d.location) * 10) / 10 : null,
      priceLevel: d.priceLevel,
      mapsUrl: placeMapsUrl(d.placeId),
    }));
}

// Cached (24h TTL, per neighborhood+cuisine) lookup of similarly-rated,
// nearby restaurants — used both by the restaurant detail page and (via
// suggest_restaurant) the Planning Session's fallback when nothing
// favorited fits the ask. Avoids hitting the Places API on every view of
// the same combo.
export async function getRestaurantBackups(params: {
  neighborhood: string | null;
  cuisine: string | null;
  excludeName?: string;
}): Promise<RestaurantBackup[]> {
  const key = cacheKeyFor(params.neighborhood, params.cuisine);

  const [cached] = await db
    .select()
    .from(placesBackupCache)
    .where(eq(placesBackupCache.cacheKey, key))
    .limit(1);

  if (cached) {
    const ageHours = (Date.now() - cached.createdAt.getTime()) / (1000 * 60 * 60);
    if (ageHours < CACHE_TTL_HOURS) {
      return JSON.parse(cached.resultsJson) as RestaurantBackup[];
    }
  }

  const fresh = await fetchFreshBackups(params);

  // Only cache a real result — an empty list from a transient API hiccup
  // (e.g. missing API key, rate limit) shouldn't get stuck cached for 24h.
  if (fresh.length > 0) {
    await db
      .insert(placesBackupCache)
      .values({ cacheKey: key, resultsJson: JSON.stringify(fresh) })
      .onConflictDoUpdate({
        target: placesBackupCache.cacheKey,
        set: { resultsJson: JSON.stringify(fresh), createdAt: new Date() },
      });
  }

  return fresh;
}
