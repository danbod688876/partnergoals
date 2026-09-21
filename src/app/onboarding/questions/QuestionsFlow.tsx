"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, inputClass, primaryButtonClass, ghostLinkClass } from "@/components/ui";
import { QUICK_PICK_CATEGORIES, placeholderFor, questionFor } from "@/lib/onboarding-copy";
import type { PronounSet } from "@/lib/pronouns";
import { addQuickPickPreference, removePreference } from "../actions";

type Added = { id: number; value: string };

export function QuestionsFlow({ pronouns }: { pronouns: PronounSet }) {
  const router = useRouter();
  const [step, setStep] = useState(-1); // -1 = intro screen
  const [added, setAdded] = useState<Added[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const category = step >= 0 ? QUICK_PICK_CATEGORIES[step] : null;
  const isLast = step === QUICK_PICK_CATEGORIES.length - 1;

  function goNext() {
    setAdded([]);
    setDraft("");
    if (isLast) {
      router.push("/onboarding/finish");
    } else {
      setStep((s) => s + 1);
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
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            setBusy(true);
            const fd = new FormData();
            fd.set("category", category);
            fd.set("value", draft.trim());
            const result = await addQuickPickPreference(fd);
            setBusy(false);
            if (result.ok) {
              setAdded((prev) => [...prev, { id: result.id, value: result.value }]);
              setDraft("");
            }
          }}
          className="flex gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholderFor(category)}
            autoFocus
            className={inputClass}
          />
          <button type="submit" disabled={busy || !draft.trim()} className={primaryButtonClass}>
            Add
          </button>
        </form>

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
