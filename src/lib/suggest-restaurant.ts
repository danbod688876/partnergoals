import { and, or, ilike } from "drizzle-orm";
import { db } from "@/db";
import { favoriteRestaurant } from "@/db/schema";
import { getRestaurantBackups } from "@/lib/restaurant-backups";

export type RestaurantSuggestion = {
  source: "favorite" | "places";
  name: string;
  cuisine: string | null;
  neighborhood: string | null;
  detailUrl: string | null; // internal /restaurants/[id] link, favorites only
  externalUrl: string | null; // Google Maps link, Places results only
};

// Used by the Planning Session's suggest_restaurant tool. Searches
// FavoriteRestaurant first — grounded, never invents a restaurant. Falls
// back to the same cached (24h TTL) Google Places backups lookup the
// restaurant detail page uses when nothing favorited fits the ask, per
// Phase 6's "favorites first, Places as fallback" wiring.
export async function suggestRestaurant(params: {
  cuisine?: string;
  neighborhood?: string;
  city?: string;
}): Promise<RestaurantSuggestion[]> {
  const { cuisine, neighborhood, city } = params;

  const conditions = [];
  if (cuisine) conditions.push(ilike(favoriteRestaurant.cuisine, `%${cuisine}%`));
  if (neighborhood) conditions.push(ilike(favoriteRestaurant.neighborhood, `%${neighborhood}%`));

  const rows = await db
    .select()
    .from(favoriteRestaurant)
    .where(conditions.length > 0 ? and(or(...conditions)) : undefined);

  if (rows.length > 0) {
    return rows.map((r) => ({
      source: "favorite" as const,
      name: r.name,
      cuisine: r.cuisine,
      neighborhood: r.neighborhood,
      detailUrl: `/restaurants/${r.id}`,
      externalUrl: null,
    }));
  }

  const backups = await getRestaurantBackups({
    neighborhood: neighborhood ?? null,
    cuisine: cuisine ?? null,
    city: city ?? null,
  });

  return backups.map((b) => ({
    source: "places" as const,
    name: b.name,
    cuisine: cuisine ?? null,
    neighborhood: neighborhood ?? null,
    detailUrl: null,
    externalUrl: b.mapsUrl,
  }));
}
