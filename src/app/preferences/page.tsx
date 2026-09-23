import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { enjoyedPlace, partner, preference, preferenceCategoryEnum, preferenceStrengthEnum } from "@/db/schema";
import {
  Card,
  PageHeader,
  ghostLinkClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { formsFor, verb } from "@/lib/pronouns";
import { deletePreference, savePreference } from "./actions";
import { PreferenceChips } from "./PreferenceChips";
import { EnjoyedPlaces } from "./EnjoyedPlaces";

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

const HUB_LINKS = [
  { href: "/profile", label: "Profile", description: "Sizes, birthday, dietary notes" },
  { href: "/dates", label: "Key Dates", description: "Birthdays, anniversaries, reminders" },
  { href: "/gifts", label: "Gift Log", description: "What you've given before" },
  { href: "/activities", label: "Activities", description: "A log of things you've done together" },
  { href: "/restaurants", label: "Restaurants", description: "Favorites with reservation links" },
  { href: "/stores", label: "Stores", description: "Trusted brands and shops" },
];

export default async function PreferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const [items, enjoyedItems, [partnerRow]] = await Promise.all([
    db.select().from(preference).orderBy(desc(preference.createdAt)),
    db.select().from(enjoyedPlace).orderBy(desc(enjoyedPlace.createdAt)),
    db.select({ pronouns: partner.pronouns }).from(partner).limit(1),
  ]);
  const editing = edit ? items.find((i) => String(i.id) === edit) : undefined;
  const { subject } = formsFor(partnerRow?.pronouns);
  const loves = verb(partnerRow?.pronouns, "love");

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
        subtitle={`Little things worth remembering about what ${subject} ${loves}, plus everything else you track.`}
      />

      <Card className="mb-8">
        <h2 className="mb-1 font-serif text-lg text-ink-800">Quick add</h2>
        <p className="mb-4 text-sm text-ink-400">
          Type something and hit Enter to save it right away — click the × on a chip to remove it.
        </p>
        <div className="space-y-5">
          {preferenceCategoryEnum.enumValues.map((category) => (
            <div key={category}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                {CATEGORY_LABELS[category]}
              </h3>
              <PreferenceChips category={category} items={grouped.get(category) ?? []} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-8">
        <h2 className="mb-4 font-serif text-lg text-ink-800">Places you&rsquo;ve enjoyed</h2>
        <EnjoyedPlaces items={enjoyedItems} />
      </Card>

      <details className="mb-8">
        <summary className={`${ghostLinkClass} cursor-pointer`}>
          Add with more detail (strength, notes)
        </summary>
        <Card className="mt-3">
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

          {editing && (
            <form action={deletePreference} className="mt-4">
              <input type="hidden" name="id" value={editing.id} />
              <DeleteButton />
            </form>
          )}
        </Card>
      </details>

      <div>
        <h2 className="mb-3 font-serif text-lg text-ink-800">More</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {HUB_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="py-4 transition-colors hover:bg-cream-100/40">
                <span className="font-medium text-ink-800">{link.label}</span>
                <p className="mt-0.5 text-sm text-ink-400">{link.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
