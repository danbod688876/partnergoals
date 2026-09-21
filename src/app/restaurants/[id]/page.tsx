import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { favoriteRestaurant } from "@/db/schema";
import { Card, ghostLinkClass } from "@/components/ui";
import { BookingWidget } from "@/components/BookingWidget";

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
    </div>
  );
}
