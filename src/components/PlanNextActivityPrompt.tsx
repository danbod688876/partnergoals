"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, inputClass, labelClass, primaryButtonClass, secondaryButtonClass, ghostLinkClass } from "@/components/ui";
import { quickAddKeyDate } from "@/app/dates/actions";
import { createDateNightActivity, createTripActivity } from "@/app/upcoming/actions";
import { daysUntil, nextOccurrence } from "@/lib/dates";

type Mode = "options" | "anniversary" | "trip";

const URGENCY_WINDOW_DAYS = 14;

export function PlanNextActivityPrompt({
  title = "What's the next activity you'd like to plan?",
  onComplete,
}: {
  title?: string;
  onComplete?: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("options");
  const [busy, setBusy] = useState(false);

  if (mode === "anniversary") {
    return (
      <Card>
        <h2 className="mb-4 font-serif text-lg text-ink-800">When is it?</h2>
        <form
          action={async (formData) => {
            const date = String(formData.get("date") ?? "");
            if (!date) return;

            // Urgency branch: if it's coming up soon, a quick date-only save
            // isn't enough — jump straight into a Planning Session instead,
            // pre-seeded with this occasion so there's a concrete plan fast.
            const days = daysUntil(nextOccurrence(date, "annual"));
            if (days >= 0 && days <= URGENCY_WINDOW_DAYS) {
              router.push(`/planning?occasion=${encodeURIComponent("Anniversary/Birthday")}&date=${date}`);
              return;
            }

            setBusy(true);
            formData.set("label", "Anniversary/Birthday");
            await quickAddKeyDate(formData);
            setBusy(false);
            onComplete?.();
          }}
          className="flex items-end gap-3"
        >
          <div className="flex-1">
            <label className={labelClass} htmlFor="pnp-date">
              Date
            </label>
            <input id="pnp-date" type="date" name="date" required autoFocus className={inputClass} />
          </div>
          <button type="submit" disabled={busy} className={primaryButtonClass}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={() => setMode("options")} className={ghostLinkClass}>
            Back
          </button>
        </form>
      </Card>
    );
  }

  if (mode === "trip") {
    return (
      <Card>
        <h2 className="mb-4 font-serif text-lg text-ink-800">A trip away</h2>
        <form
          action={async (formData) => {
            setBusy(true);
            await createTripActivity(formData);
            setBusy(false);
            onComplete?.();
          }}
          className="space-y-4"
        >
          <div>
            <label className={labelClass} htmlFor="pnp-destination">
              Destination (optional — figure it out later if you&rsquo;d rather)
            </label>
            <input
              id="pnp-destination"
              name="destination"
              placeholder="e.g. Portland, or leave blank"
              autoFocus
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="pnp-start">
                Start date (optional)
              </label>
              <input id="pnp-start" type="date" name="startDate" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="pnp-end">
                End date (optional)
              </label>
              <input id="pnp-end" type="date" name="endDate" className={inputClass} />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className={primaryButtonClass}>
              {busy ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setMode("options")} className={secondaryButtonClass}>
              Back
            </button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-4 font-serif text-lg text-ink-800">{title}</h2>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setMode("anniversary")}
          className={`${secondaryButtonClass} text-left`}
        >
          Anniversary / Birthday
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await createDateNightActivity();
            setBusy(false);
            onComplete?.();
          }}
          className={`${secondaryButtonClass} text-left`}
        >
          Date night
        </button>
        <button
          type="button"
          onClick={() => setMode("trip")}
          className={`${secondaryButtonClass} text-left`}
        >
          Trip away
        </button>
        <button
          type="button"
          onClick={() => router.push("/planning")}
          className={`${secondaryButtonClass} text-left`}
        >
          Talk it through
        </button>
      </div>
    </Card>
  );
}
