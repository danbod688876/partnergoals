"use client";

import { useState } from "react";
import { Card, inputClass, primaryButtonClass, ghostLinkClass } from "@/components/ui";
import { quickAddKeyDate } from "@/app/dates/actions";

const OPTIONS = ["Birthday", "Anniversary"] as const;

export function QuickAddKeyDate() {
  const [open, setOpen] = useState<(typeof OPTIONS)[number] | null>(null);

  if (open) {
    return (
      <Card className="mb-4">
        <form
          action={async (formData) => {
            await quickAddKeyDate(formData);
            setOpen(null);
          }}
          className="flex items-end gap-3"
        >
          <input type="hidden" name="label" value={open} />
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{open} date</label>
            <input type="date" name="date" required autoFocus className={inputClass} />
          </div>
          <button type="submit" className={primaryButtonClass}>
            Add
          </button>
          <button type="button" onClick={() => setOpen(null)} className={ghostLinkClass}>
            Cancel
          </button>
        </form>
      </Card>
    );
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-sm text-ink-400">Quick add:</span>
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setOpen(option)}
          className="rounded-full border border-ink-100 bg-white px-3 py-1.5 text-sm text-ink-700 transition-colors hover:bg-ink-50"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
