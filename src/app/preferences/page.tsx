import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { preference, preferenceCategoryEnum, preferenceStrengthEnum } from "@/db/schema";
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
import { deletePreference, savePreference } from "./actions";

const CATEGORY_LABELS: Record<string, string> = {
  band: "Bands & Music",
  color: "Colors",
  flower: "Flowers",
  jewelry_style: "Jewelry Style",
  food: "Food",
  hobby: "Hobbies",
  movie: "Movies",
  other: "Other",
};

const STRENGTH_STYLES: Record<string, string> = {
  love: "bg-clay-100 text-clay-700",
  like: "bg-sage-100 text-sage-700",
  dislike: "bg-ink-100 text-ink-600",
};

export default async function PreferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const items = await db.select().from(preference).orderBy(desc(preference.createdAt));
  const editing = edit ? items.find((i) => String(i.id) === edit) : undefined;

  const grouped = new Map<string, typeof items>();
  for (const item of items) {
    const list = grouped.get(item.category) ?? [];
    list.push(item);
    grouped.set(item.category, list);
  }

  return (
    <div>
      <PageHeader
        title="Preferences"
        subtitle="Little things worth remembering, sorted so they're easy to find."
      />

      <Card className="mb-8">
        <h2 className="mb-4 font-serif text-lg text-ink-800">
          {editing ? "Edit preference" : "Add a preference"}
        </h2>
        <form action={savePreference} className="space-y-4" key={editing?.id ?? "new"}>
          {editing && <input type="hidden" name="id" value={editing.id} />}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="category">
                Category
              </label>
              <select
                id="category"
                name="category"
                defaultValue={editing?.category ?? "other"}
                className={inputClass}
              >
                {preferenceCategoryEnum.enumValues.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="strength">
                Strength
              </label>
              <select
                id="strength"
                name="strength"
                defaultValue={editing?.strength ?? "like"}
                className={inputClass}
              >
                {preferenceStrengthEnum.enumValues.map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="value">
              What is it?
            </label>
            <input
              id="value"
              name="value"
              placeholder="e.g. Peonies, Thai food, indie folk"
              defaultValue={editing?.value ?? ""}
              required
              className={inputClass}
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
              {editing ? "Save changes" : "Add preference"}
            </button>
            {editing && (
              <Link href="/preferences" className={secondaryButtonClass}>
                Cancel
              </Link>
            )}
          </div>
        </form>
      </Card>

      {items.length === 0 ? (
        <EmptyState>No preferences yet — add the first one above.</EmptyState>
      ) : (
        <div className="space-y-8">
          {preferenceCategoryEnum.enumValues
            .filter((c) => grouped.has(c))
            .map((category) => (
              <div key={category}>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
                  {CATEGORY_LABELS[category]}
                </h3>
                <div className="space-y-2">
                  {grouped.get(category)!.map((item) => (
                    <Card key={item.id} className="flex items-start justify-between gap-4 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-ink-800">{item.value}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STRENGTH_STYLES[item.strength]}`}
                          >
                            {item.strength}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="mt-1 text-sm text-ink-400">{item.notes}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <Link href={`/preferences?edit=${item.id}`} className={ghostLinkClass}>
                          Edit
                        </Link>
                        <form action={deletePreference}>
                          <input type="hidden" name="id" value={item.id} />
                          <DeleteButton />
                        </form>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
