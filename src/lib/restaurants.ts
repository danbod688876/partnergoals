import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { favoriteRestaurant, jobRun, notification, partner, placesSnapshot, preference } from "@/db/schema";
import { geocode, nearbySearch, placeMapsUrl, type LatLng } from "@/lib/google-places";
import { getRestaurantBackups } from "@/lib/restaurant-backups";

const SURFACE_CADENCE_DAYS = 7;
const OPENING_SCAN_CADENCE_DAYS = 27; // "monthly", self-healing across missed runs

async function getPartnerLocation(): Promise<{ location: LatLng; city: string | null; neighborhood: string | null } | null> {
  const [row] = await db.select().from(partner).limit(1);
  if (!row?.city) return null;

  const address = [row.neighborhood, row.city].filter(Boolean).join(", ");
  const location = await geocode(address);
  if (!location) return null;

  return { location, city: row.city, neighborhood: row.neighborhood };
}

async function buildSimilarMessage(
  favorite: typeof favoriteRestaurant.$inferSelect
): Promise<{ message: string; link: string } | null> {
  // Same cached (24h TTL) backups lookup the restaurant detail page uses —
  // surfacing a favorite ahead of a key date/trip is the other place the
  // spec calls for these, so it shouldn't hit Places uncached here either.
  const picks = await getRestaurantBackups({
    neighborhood: favorite.neighborhood,
    cuisine: favorite.cuisine,
    excludeName: favorite.name,
  });

  if (picks.length === 0) return null;

  const top = picks.slice(0, 3);
  const parts = top.map((p) => {
    const bits = [
      p.rating != null ? `${p.rating}★` : null,
      p.userRatingsTotal != null ? `${p.userRatingsTotal} reviews` : null,
      p.distanceMiles != null ? `${p.distanceMiles}mi` : null,
    ].filter(Boolean);
    return `${p.name} (${bits.join(", ")})`;
  });

  return {
    message: `Backup ideas near ${favorite.name}: ${parts.join(", ")}.`,
    link: top[0].mapsUrl,
  };
}

export async function runRestaurantSurfaceCheck(): Promise<{ scanned: number; created: number }> {
  const favorites = await db.select().from(favoriteRestaurant);
  if (favorites.length === 0) return { scanned: 0, created: 0 };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - SURFACE_CADENCE_DAYS);

  const partnerLocation = await getPartnerLocation();
  let created = 0;

  for (const favorite of favorites) {
    const [recent] = await db
      .select({ id: notification.id })
      .from(notification)
      .where(
        and(
          eq(notification.favoriteRestaurantId, favorite.id),
          eq(notification.type, "restaurant_surface"),
          gte(notification.createdAt, cutoff)
        )
      )
      .limit(1);

    if (recent) continue;

    await db.insert(notification).values({
      type: "restaurant_surface",
      favoriteRestaurantId: favorite.id,
      message: `Check in on ${favorite.name}${favorite.neighborhood ? ` in ${favorite.neighborhood}` : ""} — worth a look for an upcoming table.`,
      link: `/restaurants/${favorite.id}`,
      dismissed: false,
    });
    created++;

    if (partnerLocation) {
      const similar = await buildSimilarMessage(favorite);
      if (similar) {
        await db.insert(notification).values({
          type: "restaurant_similar",
          favoriteRestaurantId: favorite.id,
          message: similar.message,
          link: similar.link,
          dismissed: false,
        });
        created++;
      }
    }
  }

  return { scanned: favorites.length, created };
}

async function shouldRunJob(name: string, cadenceDays: number): Promise<boolean> {
  const [row] = await db.select().from(jobRun).where(eq(jobRun.name, name)).limit(1);
  if (!row) return true;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - cadenceDays);
  return row.ranAt <= cutoff;
}

async function markJobRun(name: string): Promise<void> {
  await db
    .insert(jobRun)
    .values({ name, ranAt: new Date() })
    .onConflictDoUpdate({ target: jobRun.name, set: { ranAt: new Date() } });
}

export async function runRestaurantOpeningScan(): Promise<{ ran: boolean; scanned: number; created: number }> {
  if (!(await shouldRunJob("restaurant_opening_scan", OPENING_SCAN_CADENCE_DAYS))) {
    return { ran: false, scanned: 0, created: 0 };
  }

  const partnerLocation = await getPartnerLocation();
  if (!partnerLocation) {
    // Nothing to scan without a location, but still mark as run so we don't
    // retry every single day while the profile is incomplete.
    await markJobRun("restaurant_opening_scan");
    return { ran: true, scanned: 0, created: 0 };
  }

  const [favoriteCuisines, foodPreferences] = await Promise.all([
    db
      .select({ cuisine: favoriteRestaurant.cuisine })
      .from(favoriteRestaurant)
      .where(sql`${favoriteRestaurant.cuisine} is not null`),
    db.select({ value: preference.value }).from(preference).where(eq(preference.category, "food")),
  ]);

  const cuisines = Array.from(
    new Set(
      [...favoriteCuisines.map((c) => c.cuisine), ...foodPreferences.map((p) => p.value)].filter(
        (c): c is string => !!c
      )
    )
  );

  if (cuisines.length === 0) {
    await markJobRun("restaurant_opening_scan");
    return { ran: true, scanned: 0, created: 0 };
  }

  let scanned = 0;
  let created = 0;
  const seenThisRun = new Set<string>();

  for (const cuisine of cuisines) {
    const results = await nearbySearch({ location: partnerLocation.location, keyword: cuisine });
    scanned += results.length;

    for (const place of results) {
      if (seenThisRun.has(place.placeId)) continue;
      seenThisRun.add(place.placeId);

      const [existing] = await db
        .select({ id: placesSnapshot.id })
        .from(placesSnapshot)
        .where(eq(placesSnapshot.placeId, place.placeId))
        .limit(1);

      if (existing) {
        await db
          .update(placesSnapshot)
          .set({ lastSeen: new Date() })
          .where(eq(placesSnapshot.placeId, place.placeId));
        continue;
      }

      await db.insert(placesSnapshot).values({
        placeId: place.placeId,
        name: place.name,
        cuisine,
        city: partnerLocation.city,
        neighborhood: partnerLocation.neighborhood,
      });

      await db.insert(notification).values({
        type: "restaurant_opening",
        message: `New nearby: ${place.name} (${cuisine})${place.vicinity ? ` — ${place.vicinity}` : ""}.`,
        link: placeMapsUrl(place.placeId),
        dismissed: false,
      });
      created++;
    }
  }

  await markJobRun("restaurant_opening_scan");
  return { ran: true, scanned, created };
}
