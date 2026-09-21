import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { giftLog } from "@/db/schema";
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
import { deleteGift, saveGift } from "./actions";

export default async function GiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const items = await db.select().from(giftLog).orderBy(desc(giftLog.dateGiven));
  const editing = edit ? items.find((i) => String(i.id) === edit) : undefined;

  return (
    <div>
      <PageHeader
        title="Gift Log"
        subtitle="What you've given, and when — so nothing repeats by accident."
      />

      <Card className="mb-8">
        <h2 className="mb-4 font-serif text-lg text-ink-800">
          {editing ? "Edit gift" : "Log a gift"}
        </h2>
        <form
          action={saveGift}
          className="space-y-4"
          key={editing?.id ?? "new"}
        >
          {editing && <input type="hidden" name="id" value={editing.id} />}
          {editing?.photoUrl && (
            <input type="hidden" name="existingPhoto" value={editing.photoUrl} />
          )}

          <div>
            <label className={labelClass} htmlFor="item">
              What did you give?
            </label>
            <input
              id="item"
              name="item"
              defaultValue={editing?.item ?? ""}
              required
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="dateGiven">
                Date given
              </label>
              <input
                id="dateGiven"
                name="dateGiven"
                type="date"
                defaultValue={editing?.dateGiven ?? ""}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="occasion">
                Occasion
              </label>
              <input
                id="occasion"
                name="occasion"
                placeholder="Birthday, just because…"
                defaultValue={editing?.occasion ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="storeBrand">
                Store / brand
              </label>
              <input
                id="storeBrand"
                name="storeBrand"
                defaultValue={editing?.storeBrand ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="price">
                Price
              </label>
              <input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={editing?.price ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="photo">
              Photo
            </label>
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/*"
              className={`${inputClass} py-1.5`}
            />
            {editing?.photoUrl && (
              <p className="mt-1 text-xs text-ink-400">
                Current photo will be kept unless you upload a new one.
              </p>
            )}
            <input
              name="photoUrl"
              placeholder="…or paste a photo URL instead"
              defaultValue=""
              className={`${inputClass} mt-2`}
            />
          </div>

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
              {editing ? "Save changes" : "Add to log"}
            </button>
            {editing && (
              <Link href="/gifts" className={secondaryButtonClass}>
                Cancel
              </Link>
            )}
          </div>
        </form>
      </Card>

      {items.length === 0 ? (
        <EmptyState>No gifts logged yet — add the first one above.</EmptyState>
      ) : (
        <div className="space-y-3">
          {items.map((gift) => (
            <Card key={gift.id} className="flex gap-4 py-4">
              {gift.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={gift.photoUrl}
                  alt={gift.item}
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="font-medium text-ink-800">{gift.item}</span>
                    {gift.occasion && (
                      <span className="ml-2 text-sm text-ink-400">{gift.occasion}</span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Link href={`/gifts?edit=${gift.id}`} className={ghostLinkClass}>
                      Edit
                    </Link>
                    <form action={deleteGift}>
                      <input type="hidden" name="id" value={gift.id} />
                      <DeleteButton />
                    </form>
                  </div>
                </div>
                <p className="mt-1 text-sm text-ink-400">
                  {new Date(gift.dateGiven + "T00:00:00").toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {gift.storeBrand && ` · ${gift.storeBrand}`}
                  {gift.price && ` · $${gift.price}`}
                </p>
                {gift.notes && <p className="mt-1 text-sm text-ink-600">{gift.notes}</p>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
