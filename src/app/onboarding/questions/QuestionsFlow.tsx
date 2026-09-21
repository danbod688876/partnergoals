"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, inputClass, primaryButtonClass, ghostLinkClass } from "@/components/ui";
import { COLOR_CHIPS, QUICK_PICK_CATEGORIES, placeholderFor, questionFor } from "@/lib/onboarding-copy";
import type { PronounSet } from "@/lib/pronouns";
import { addQuickPickPreference, removePreference } from "../actions";

type Added = { id: number; value: string };

export function QuestionsFlow({ pronouns }: { pronouns: PronounSet }) {
  const router = useRouter();
  const [step, setStep] = useState(-1); // -1 = intro screen
  const [added, setAdded] = useState<Added[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const category = step >= 0 ? QUICK_PICK_CATEGORIES[step] : null;
  const isLast = step === QUICK_PICK_CATEGORIES.length - 1;

  function goNext() {
    setAdded([]);
    setDraft("");
    setSelectedChip(null);
    if (isLast) {
      router.push("/onboarding/plan");
    } else {
      setStep((s) => s + 1);
    }
  }

  async function addValue(value: string, { fromChip = false } = {}) {
    if (!category || !value.trim() || busy) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("category", category);
    fd.set("value", value.trim());
    const result = await addQuickPickPreference(fd);
    setBusy(false);
    if (result.ok) {
      setAdded((prev) => [...prev, { id: result.id, value: result.value }]);
      if (fromChip) setSelectedChip(value.trim());
      setDraft("");
      inputRef.current?.focus();
    }
  }

  if (step === -1) {
    return (
      <div className="text-center">
        <h1 className="font-serif text-2xl leading-snug text-ink-800">
          A couple of minutes, a few easy questions — then you&rsquo;re set.
        </h1>
        <button onClick={() => setStep(0)} className={`${primaryButtonClass} mt-8 px-6 py-3`}>
          Let&rsquo;s go
        </button>
      </div>
    );
  }

  if (!category) return null;

  return (
    <div>
      <p className="mb-1 text-center text-xs font-medium uppercase tracking-wide text-ink-400">
        {step + 1} of {QUICK_PICK_CATEGORIES.length}
      </p>
      <h1 className="mb-6 text-center font-serif text-2xl text-ink-800">
        {questionFor(category, pronouns)}
      </h1>

      <Card>
        {category === "color" && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {COLOR_CHIPS.map((color) => (
                <button
                  key={color}
                  type="button"
                  disabled={busy}
                  onClick={() => addValue(color, { fromChip: true })}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    selectedChip === color
                      ? "border-clay-500 bg-clay-100 text-clay-800"
                      : "border-ink-100 bg-white text-ink-600 hover:bg-ink-50"
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
            {selectedChip && (
              <p className="mt-2 text-sm text-ink-400">Selected: {selectedChip}</p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addValue(draft);
              }
            }}
            placeholder={category === "color" ? "Other color…" : placeholderFor(category)}
            autoFocus
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => addValue(draft)}
            disabled={busy || !draft.trim()}
            className={primaryButtonClass}
          >
            Add
          </button>
        </div>

        {added.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {added.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-clay-100 px-3 py-1 text-sm text-clay-800"
              >
                {item.value}
                <button
                  type="button"
                  onClick={async () => {
                    await removePreference(item.id);
                    setAdded((prev) => prev.filter((a) => a.id !== item.id));
                    if (selectedChip === item.value) setSelectedChip(null);
                  }}
                  className="text-clay-500 hover:text-clay-700"
                  aria-label={`Remove ${item.value}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center gap-4 border-t border-ink-100 pt-4">
          <button onClick={goNext} className={`${primaryButtonClass} flex-1 py-2.5`}>
            {isLast ? "Finish up" : "Continue"}
          </button>
          <button onClick={goNext} className={ghostLinkClass}>
            Skip for now
          </button>
        </div>
      </Card>
    </div>
  );
}
