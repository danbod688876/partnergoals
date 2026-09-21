"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Card, EmptyState, inputClass, labelClass, primaryButtonClass, secondaryButtonClass, ghostLinkClass } from "@/components/ui";
import type { ProposedItem } from "@/lib/planning-session";
import { confirmKeyDate } from "@/app/dates/actions";
import {
  confirmItineraryItem,
  confirmNewTripWithItineraryItem,
  confirmPlannedActivity,
} from "@/app/upcoming/actions";

export type PlanItem = ProposedItem & { status: "proposed" | "confirmed" };

const ACTIVITY_LABELS: Record<string, string> = {
  date_night: "Date night",
  trip: "Trip",
  anniversary_birthday: "Anniversary / Birthday",
};

function formatDateLabel(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function PlanPanel({
  items,
  setItems,
}: {
  items: PlanItem[];
  setItems: Dispatch<SetStateAction<PlanItem[]>>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmedTripId, setConfirmedTripId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function update(clientId: string, patch: Partial<ProposedItem>) {
    setItems((prev) =>
      prev.map((it) => (it.clientId === clientId ? ({ ...it, ...patch } as PlanItem) : it))
    );
  }

  function discard(clientId: string) {
    setItems((prev) => prev.filter((it) => it.clientId !== clientId));
  }

  function markConfirmed(clientId: string) {
    setItems((prev) =>
      prev.map((it) => (it.clientId === clientId ? { ...it, status: "confirmed" as const } : it))
    );
  }

  async function confirm(item: PlanItem) {
    setBusyId(item.clientId);
    try {
      if (item.kind === "key_date") {
        await confirmKeyDate({
          label: item.label,
          date: item.date,
          recurrence: item.recurrence,
          sensitive: item.sensitive,
        });
      } else if (item.kind === "planned_activity") {
        await confirmPlannedActivity({
          activityType: item.activityType,
          targetDate: item.targetDate,
          notes: item.notes,
        });
      } else if (item.kind === "itinerary_item") {
        const effectiveTripId = item.tripId ?? confirmedTripId;
        if (effectiveTripId == null) {
          const result = await confirmNewTripWithItineraryItem({
            day: item.day,
            time: item.time,
            activity: item.activity,
            notes: item.notes,
          });
          setConfirmedTripId(result.tripId);
        } else {
          await confirmItineraryItem({
            tripId: effectiveTripId,
            day: item.day,
            time: item.time,
            activity: item.activity,
            notes: item.notes,
          });
        }
      }
      markConfirmed(item.clientId);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmAll() {
    for (const item of items) {
      if (item.status === "proposed") {
        await confirm(item);
      }
    }
  }

  const pendingCount = items.filter((i) => i.status === "proposed").length;

  if (items.length === 0) {
    return <EmptyState>Nothing proposed yet — keep chatting and ideas will show up here.</EmptyState>;
  }

  return (
    <div>
      {pendingCount > 1 && (
        <button onClick={confirmAll} className={`${primaryButtonClass} mb-4 w-full py-2.5`}>
          Add all ({pendingCount})
        </button>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <Card
            key={item.clientId}
            className={`py-4 ${item.status === "confirmed" ? "opacity-70" : ""}`}
          >
            {item.status === "confirmed" && (
              <span className="mb-2 inline-block rounded-full bg-sage-100 px-2 py-0.5 text-xs font-medium text-sage-700">
                Added
              </span>
            )}

            {editingId === item.clientId ? (
              <EditForm
                item={item}
                onSave={(patch) => {
                  update(item.clientId, patch);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <ItemView item={item} />
            )}

            {item.status === "proposed" && editingId !== item.clientId && (
              <div className="mt-3 flex items-center gap-4 border-t border-ink-100 pt-3">
                <button
                  onClick={() => confirm(item)}
                  disabled={busyId === item.clientId}
                  className="text-sm font-medium text-sage-600 hover:text-sage-700"
                >
                  {busyId === item.clientId ? "Adding…" : "Confirm"}
                </button>
                <button onClick={() => setEditingId(item.clientId)} className={ghostLinkClass}>
                  Edit
                </button>
                <button
                  onClick={() => discard(item.clientId)}
                  className="text-sm text-ink-400 hover:text-clay-600"
                >
                  Discard
                </button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function ItemView({ item }: { item: PlanItem }) {
  if (item.kind === "key_date") {
    return (
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-ink-800">{item.label}</span>
          {item.sensitive && (
            <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600">
              Sensitive
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-400">
          {formatDateLabel(item.date)} {item.recurrence === "annual" && "· every year"}
        </p>
      </div>
    );
  }

  if (item.kind === "planned_activity") {
    return (
      <div>
        <span className="font-medium text-ink-800">{ACTIVITY_LABELS[item.activityType]}</span>
        <p className="mt-1 text-sm text-ink-400">
          {item.targetDate ? formatDateLabel(item.targetDate) : "No date yet"}
        </p>
        {item.notes && <p className="mt-1 text-sm text-ink-600">{item.notes}</p>}
      </div>
    );
  }

  return (
    <div>
      <span className="font-medium text-ink-800">
        Day {item.day}
        {item.time ? ` · ${item.time}` : ""}
      </span>
      <p className="mt-1 text-sm text-ink-600">{item.activity}</p>
      {item.notes && <p className="mt-1 text-sm text-ink-400">{item.notes}</p>}
    </div>
  );
}

function EditForm({
  item,
  onSave,
  onCancel,
}: {
  item: PlanItem;
  onSave: (patch: Partial<ProposedItem>) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<PlanItem>(item);

  if (draft.kind === "key_date") {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelClass}>Label</label>
          <input
            className={inputClass}
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Date</label>
          <input
            type="date"
            className={inputClass}
            value={draft.date}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
          />
        </div>
        <EditActions onSave={() => onSave(draft)} onCancel={onCancel} />
      </div>
    );
  }

  if (draft.kind === "planned_activity") {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelClass}>Date (optional)</label>
          <input
            type="date"
            className={inputClass}
            value={draft.targetDate ?? ""}
            onChange={(e) => setDraft({ ...draft, targetDate: e.target.value || null })}
          />
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <input
            className={inputClass}
            value={draft.notes ?? ""}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value || null })}
          />
        </div>
        <EditActions onSave={() => onSave(draft)} onCancel={onCancel} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Day</label>
          <input
            type="number"
            min={1}
            className={inputClass}
            value={draft.day}
            onChange={(e) => setDraft({ ...draft, day: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className={labelClass}>Time (optional)</label>
          <input
            className={inputClass}
            value={draft.time ?? ""}
            onChange={(e) => setDraft({ ...draft, time: e.target.value || null })}
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>Activity</label>
        <input
          className={inputClass}
          value={draft.activity}
          onChange={(e) => setDraft({ ...draft, activity: e.target.value })}
        />
      </div>
      <EditActions onSave={() => onSave(draft)} onCancel={onCancel} />
    </div>
  );
}

function EditActions({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex gap-3">
      <button onClick={onSave} className={secondaryButtonClass}>
        Save
      </button>
      <button onClick={onCancel} className={ghostLinkClass}>
        Cancel
      </button>
    </div>
  );
}
