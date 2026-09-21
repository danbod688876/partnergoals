import Link from "next/link";
import { db } from "@/db";
import { favoriteRestaurant, restaurantPlatformEnum } from "@/db/schema";
import {
  Card,
  EmptyState,
  PageHeader,
  ghostLinkClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteRestaurant, saveRestaurant } from "./actions";

const PLATFORM_LABELS: Record<string, string> = {
  opentable: "OpenTable",
  resy: "Resy",
  other: "Other",
};

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const items = await db.select().from(favoriteRestaurant).orderBy(favoriteRestaurant.name);
  const editing = edit ? items.find((i) => String(i.id) === edit) : undefined;

  return (
    <div>
      <PageHeader
        title="Restaurants"
        subtitle="Favorites worth going back to — and a booking link one tap away."
      />

      <Card className="mb-8">
        <h2 className="mb-4 font-serif text-lg text-ink-800">
          {editing ? "Edit restaurant" : "Add a favorite"}
        </h2>
        <form action={saveRestaurant} className="space-y-4" key={editing?.id ?? "new"}>
          {editing && <input type="hidden" name="id" value={editing.id} />}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="name">
                Name
              </label>
              <input
                id="name"
                name="name"
                defaultValue={editing?.name ?? ""}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="cuisine">
                Cuisine
              </label>
              <input
                id="cuisine"
                name="cuisine"
                placeholder="Italian, ramen, tasting menu…"
                defaultValue={editing?.cuisine ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="neighborhood">
                Neighborhood
              </label>
              <input
                id="neighborhood"
                name="neighborhood"
                defaultValue={editing?.neighborhood ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="lastVisited">
                Last visited
              </label>
              <input
                id="lastVisited"
                name="lastVisited"
                type="date"
                defaultValue={editing?.lastVisited ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="platform">
                Booking platform
              </label>
              <select
                id="platform"
                name="platform"
                defaultValue={editing?.platform ?? "other"}
                className={inputClass}
              >
                {restaurantPlatformEnum.enumValues.map((p) => (
                  <option key={p} value={p}>
                    {PLATFORM_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="platformVenueId">
                Venue ID or URL
              </label>
              <input
                id="platformVenueId"
                name="platformVenueId"
                placeholder="Paste the ID/slug, or the full page URL"
                defaultValue={editing?.platformVenueId ?? ""}
                className={inputClass}
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-ink-400">
            Find this restaurant&rsquo;s own OpenTable or Resy page and paste its ID/slug from the
            URL — or just paste the whole page URL, which always works and is safest for Resy.
          </p>

          <div>
            <label className={labelClass} htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={editing?.notes ?? ""}
              className={inputClass}
            />
          </div>

          <div className="flex gap-3">
            <button type="submit" className={primaryButtonClass}>
              {editing ? "Save changes" : "Add restaurant"}
            </button>
            {editing && (
              <Link href="/restaurants" className={secondaryButtonClass}>
                Cancel
              </Link>
            )}
          </div>
        </form>
      </Card>

      {items.length === 0 ? (
        <EmptyState>No favorites yet — add the first place worth going back to.</EmptyState>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <Card key={r.id} className="flex items-start justify-between gap-4 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <Link href={`/restaurants/${r.id}`} className="font-medium text-ink-800 hover:underline">
                    {r.name}
                  </Link>
                  {r.platform !== "other" && (
                    <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600">
                      {PLATFORM_LABELS[r.platform]}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-400">
                  {[r.cuisine, r.neighborhood].filter(Boolean).join(" · ")}
                </p>
                {r.notes && <p className="mt-1 text-sm text-ink-600">{r.notes}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Link href={`/restaurants?edit=${r.id}`} className={ghostLinkClass}>
                  Edit
                </Link>
                <form action={deleteRestaurant}>
                  <input type="hidden" name="id" value={r.id} />
                  <DeleteButton />
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
