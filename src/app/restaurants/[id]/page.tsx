import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { favoriteRestaurant } from "@/db/schema";
import { Card, ghostLinkClass } from "@/components/ui";
import { BookingWidget } from "@/components/BookingWidget";
import { getRestaurantBackups } from "@/lib/restaurant-backups";

const PLATFORM_LABELS: Record<string, string> = {
  opentable: "OpenTable",
  resy: "Resy",
  other: "Other",
};

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [restaurant] = await db
    .select()
    .from(favoriteRestaurant)
    .where(eq(favoriteRestaurant.id, Number(id)))
    .limit(1);

  if (!restaurant) notFound();

  const backups = await getRestaurantBackups({
    neighborhood: restaurant.neighborhood,
    cuisine: restaurant.cuisine,
    excludeName: restaurant.name,
  });

  return (
    <div>
      <Link href="/restaurants" className={ghostLinkClass}>
        ← Restaurants
      </Link>

      <div className="mt-3 mb-6">
        <h1 className="font-serif text-2xl text-ink-800">{restaurant.name}</h1>
        <p className="mt-1 text-sm text-ink-400">
          {[restaurant.cuisine, restaurant.neighborhood].filter(Boolean).join(" · ")}
          {restaurant.platform !== "other" && ` · ${PLATFORM_LABELS[restaurant.platform]}`}
        </p>
      </div>

      <Card className="mb-6">
        <h2 className="mb-4 font-serif text-lg text-ink-800">Reserve</h2>
        <BookingWidget
          platform={restaurant.platform}
          venueId={restaurant.platformVenueId}
          name={restaurant.name}
        />
      </Card>

      {(restaurant.notes || restaurant.lastVisited) && (
        <Card>
          {restaurant.lastVisited && (
            <p className="text-sm text-ink-400">
              Last visited{" "}
              {new Date(restaurant.lastVisited + "T00:00:00").toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
          {restaurant.notes && <p className="mt-1 text-sm text-ink-600">{restaurant.notes}</p>}
        </Card>
      )}

      {backups.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-serif text-lg text-ink-800">
            If {restaurant.name} doesn&rsquo;t work out
          </h2>
          <p className="mb-3 text-sm text-ink-400">
            A few nearby spots with a similar feel, worth keeping in your back pocket.
          </p>
          <div className="space-y-2">
            {backups.map((b) => (
              <a
                key={b.mapsUrl}
                href={b.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <Card className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-cream-100/40">
                  <div>
                    <span className="font-medium text-ink-800">{b.name}</span>
                    <p className="mt-0.5 text-sm text-ink-400">
                      {[
                        b.rating != null ? `${b.rating}★` : null,
                        b.userRatingsTotal != null ? `${b.userRatingsTotal} reviews` : null,
                        b.distanceMiles != null ? `${b.distanceMiles}mi away` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-clay-600">View ↗</span>
                </Card>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
