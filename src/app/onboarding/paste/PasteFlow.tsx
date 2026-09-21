"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Card, inputClass, labelClass, primaryButtonClass, ghostLinkClass } from "@/components/ui";
import type { ExtractedProfile } from "@/lib/claude-extract";
import type { PronounSet } from "@/lib/pronouns";
import { extractFromPaste, saveExtractedData } from "../actions";

const CATEGORY_LABELS: Record<string, string> = {
  band: "Band",
  color: "Color",
  flower: "Flower",
  jewelry_style: "Jewelry style",
  food: "Food",
  hobby: "Hobby",
  movie: "Movie",
  other: "Other",
};

type ReviewState = ExtractedProfile;

export function PasteFlow({
  currentName,
  currentPronouns,
}: {
  currentName: string;
  currentPronouns: PronounSet;
}) {
  const [extractState, formAction, pending] = useActionState(extractFromPaste, undefined);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [saving, setSaving] = useState(false);

  if (extractState?.status === "ok" && !review) {
    setReview({
      name: extractState.data.name || currentName,
      pronouns: extractState.data.pronouns || currentPronouns,
      birthday: extractState.data.birthday ?? "",
      city: extractState.data.city ?? "",
      neighborhood: extractState.data.neighborhood ?? "",
      clothingSize: extractState.data.clothingSize ?? "",
      shoeSize: extractState.data.shoeSize ?? "",
      ringSize: extractState.data.ringSize ?? "",
      dietaryNotes: extractState.data.dietaryNotes ?? "",
      preferences: extractState.data.preferences,
      keyDates: extractState.data.keyDates,
    });
  }

  if (!review) {
    return (
      <form action={formAction}>
        <h1 className="mb-2 text-center font-serif text-2xl text-ink-800">Paste what you&rsquo;ve got</h1>
        <p className="mb-6 text-center text-sm text-ink-400">
          Paste anything you&rsquo;ve already got — a note, a list, a scribble. We&rsquo;ll sort it out.
        </p>

        <Card>
          <textarea
            name="notes"
            required
            rows={10}
            placeholder="e.g. Her birthday is March 12th. She loves peonies and Thai food, wears a size 8 shoe..."
            className={inputClass}
          />
          {extractState?.status === "error" && (
            <p className="mt-2 text-sm text-clay-600">{extractState.message}</p>
          )}
          <div className="mt-4 flex items-center gap-4">
            <button type="submit" disabled={pending} className={`${primaryButtonClass} flex-1 py-2.5`}>
              {pending ? "Sorting it out…" : "Sort it out"}
            </button>
            <Link href="/onboarding/questions" className={ghostLinkClass}>
              Skip for now
            </Link>
          </div>
        </Card>
      </form>
    );
  }

  async function save() {
    if (!review) return;
    setSaving(true);
    await saveExtractedData(review);
  }

  function update<K extends keyof ReviewState>(key: K, value: ReviewState[K]) {
    setReview((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function removePreference(index: number) {
    setReview((prev) =>
      prev ? { ...prev, preferences: prev.preferences.filter((_, i) => i !== index) } : prev
    );
  }

  function removeKeyDate(index: number) {
    setReview((prev) => (prev ? { ...prev, keyDates: prev.keyDates.filter((_, i) => i !== index) } : prev));
  }

  return (
    <div>
      <h1 className="mb-2 text-center font-serif text-2xl text-ink-800">Here&rsquo;s what we found</h1>
      <p className="mb-6 text-center text-sm text-ink-400">
        Quick check before we save it — fix anything that&rsquo;s off, or drop what doesn&rsquo;t belong.
      </p>

      <Card className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Name</label>
            <input
              className={inputClass}
              value={review.name ?? ""}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Pronouns</label>
            <select
              className={inputClass}
              value={review.pronouns ?? "they_them"}
              onChange={(e) => update("pronouns", e.target.value as PronounSet)}
            >
              <option value="she_her">She / her</option>
              <option value="he_him">He / him</option>
              <option value="they_them">They / them</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Birthday</label>
            <input
              type="date"
              className={inputClass}
              value={review.birthday ?? ""}
              onChange={(e) => update("birthday", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input
              className={inputClass}
              value={review.city ?? ""}
              onChange={(e) => update("city", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Clothing size</label>
            <input
              className={inputClass}
              value={review.clothingSize ?? ""}
              onChange={(e) => update("clothingSize", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Shoe size</label>
            <input
              className={inputClass}
              value={review.shoeSize ?? ""}
              onChange={(e) => update("shoeSize", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Ring size</label>
            <input
              className={inputClass}
              value={review.ringSize ?? ""}
              onChange={(e) => update("ringSize", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Dietary notes</label>
          <input
            className={inputClass}
            value={review.dietaryNotes ?? ""}
            onChange={(e) => update("dietaryNotes", e.target.value)}
          />
        </div>

        {review.preferences.length > 0 && (
          <div>
            <label className={labelClass}>Preferences</label>
            <div className="space-y-1.5">
              {review.preferences.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm"
                >
                  <span>
                    <span className="text-ink-400">{CATEGORY_LABELS[p.category] ?? p.category}:</span>{" "}
                    <span className="text-ink-800">{p.value}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removePreference(i)}
                    className="text-xs text-ink-400 hover:text-clay-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {review.keyDates.length > 0 && (
          <div>
            <label className={labelClass}>Key dates</label>
            <div className="space-y-1.5">
              {review.keyDates.map((kd, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm"
                >
                  <span className="text-ink-800">
                    {kd.label} — {kd.date}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeKeyDate(i)}
                    className="text-xs text-ink-400 hover:text-clay-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 pt-1">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className={`${primaryButtonClass} flex-1 py-2.5`}
          >
            {saving ? "Saving…" : "Looks good — save it"}
          </button>
          <Link href="/onboarding/plan" className={ghostLinkClass}>
            Skip for now
          </Link>
        </div>
      </Card>
    </div>
  );
}
