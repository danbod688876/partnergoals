import { and, eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { enjoyedPlace, partner } from "@/db/schema";
import { geocode, nearbySearch, placeDetails } from "@/lib/google-places";

export type HotelSuggestion = {
  source: "enjoyed" | "places";
  name: string;
  city: string | null;
  rating: number | null;
  userRatingsTotal: number | null;
  notes: string | null;
  mapsUrl: string | null;
};

const MAX_RESULTS = 5;

// Used by the Planning Session's search_hotels tool. Checks places the user
// has actually enjoyed staying at first — grounded, and lets the agent make
// "similar to the place you stayed at" callbacks — before falling back to a
// cold Google Places lodging search near the trip's city.
export async function suggestHotels(params: {
  city?: string;
  neighborhood?: string;
}): Promise<HotelSuggestion[]> {
  const { city, neighborhood } = params;

  const conditions = [eq(enjoyedPlace.type, "hotel" as const)];
  if (city) conditions.push(ilike(enjoyedPlace.city, `%${city}%`));
  const enjoyed = await db.select().from(enjoyedPlace).where(and(...conditions));

  if (enjoyed.length > 0) {
    return enjoyed.map((e) => ({
      source: "enjoyed" as const,
      name: e.name,
      city: e.city,
      rating: null,
      userRatingsTotal: null,
      notes: e.notes,
      mapsUrl: null,
    }));
  }

  const [partnerRow] = await db.select().from(partner).limit(1);
  const searchCity = city ?? partnerRow?.city ?? null;
  const searchNeighborhood = neighborhood ?? partnerRow?.neighborhood ?? null;
  if (!searchCity) return [];

  const location = await geocode([searchNeighborhood, searchCity].filter(Boolean).join(", "));
  if (!location) return [];

  const results = await nearbySearch({ location, type: "lodging" });
  const top = results
    .filter((r) => r.rating != null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.userRatingsTotal ?? 0) - (a.userRatingsTotal ?? 0))
    .slice(0, MAX_RESULTS);

  const detailed = await Promise.all(top.map((t) => placeDetails(t.placeId)));

  return detailed
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .map((d) => ({
      source: "places" as const,
      name: d.name,
      city: searchCity,
      rating: d.rating,
      userRatingsTotal: d.userRatingsTotal,
      notes: d.editorialSummary,
      mapsUrl: d.mapsUrl,
    }));
}
