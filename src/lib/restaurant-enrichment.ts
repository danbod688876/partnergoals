import { db } from "@/db";
import { partner } from "@/db/schema";
import { geocode, nearbySearch, placeDetails, type LatLng } from "@/lib/google-places";

export type RestaurantEnrichment = {
  rating: number | null;
  userRatingsTotal: number | null;
  blurb: string | null;
  link: string | null;
  emoji: string;
};

const CUISINE_EMOJI: Array<[RegExp, string]> = [
  [/pizza/i, "🍕"],
  [/sushi|japanese/i, "🍣"],
  [/taco|mexican/i, "🌮"],
  [/burger/i, "🍔"],
  [/pasta|italian/i, "🍝"],
  [/ramen|noodle/i, "🍜"],
  [/coffee|cafe|café/i, "☕"],
  [/wine|bar\b/i, "🍷"],
  [/beer|pub|brewery/i, "🍺"],
  [/bbq|barbecue/i, "🍖"],
  [/seafood|fish/i, "🦐"],
  [/dessert|bakery|patisserie/i, "🍰"],
  [/vegan|salad|healthy/i, "🥗"],
  [/steak/i, "🥩"],
  [/thai/i, "🍛"],
  [/indian|curry/i, "🍛"],
  [/chinese|dim sum/i, "🥟"],
];

function emojiFor(text: string): string {
  for (const [pattern, emoji] of CUISINE_EMOJI) {
    if (pattern.test(text)) return emoji;
  }
  return "🍽️";
}

// Resolves where to search — an explicit destination (e.g. a trip city)
// takes priority over the partner's own city/neighborhood, since a proposed
// stop is often somewhere the user doesn't live.
export async function resolveSearchOrigin(destination?: string | null): Promise<LatLng | null> {
  if (destination) {
    const location = await geocode(destination);
    if (location) return location;
  }

  const [partnerRow] = await db.select().from(partner).limit(1);
  const address = [partnerRow?.neighborhood, partnerRow?.city].filter(Boolean).join(", ");
  return geocode(address);
}

// Looks up a named restaurant via Places and returns rating/blurb/link/emoji
// to attach to a proposed itinerary stop — used when the Planning Session
// proposes a specific restaurant, not the general suggest_restaurant lookup.
export async function enrichRestaurant(
  name: string,
  cuisineHint?: string | null,
  destination?: string | null
): Promise<RestaurantEnrichment | null> {
  const location = await resolveSearchOrigin(destination);
  if (!location) return null;

  const results = await nearbySearch({ location, keyword: name });
  const match = results.find((r) => r.name.toLowerCase().includes(name.toLowerCase())) ?? results[0];
  if (!match) return null;

  const detail = await placeDetails(match.placeId);
  if (!detail) return null;

  return {
    rating: detail.rating,
    userRatingsTotal: detail.userRatingsTotal,
    blurb: detail.editorialSummary,
    link: detail.website ?? detail.mapsUrl,
    emoji: emojiFor(`${name} ${cuisineHint ?? ""}`),
  };
}
