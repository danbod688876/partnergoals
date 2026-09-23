"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Card, EmptyState, inputClass, labelClass, primaryButtonClass, secondaryButtonClass, ghostLinkClass } from "@/components/ui";
import type { PlanItemCategory, ProposedItem } from "@/lib/planning-session";
import { confirmKeyDate, updateConfirmedKeyDate } from "@/app/dates/actions";
import {
  confirmItineraryItem,
  confirmNewTripWithItineraryItem,
  confirmPlannedActivity,
  updateConfirmedItineraryItem,
  updateConfirmedPlannedActivity,
} from "@/app/upcoming/actions";
import { syncPlanItem, deletePlanItem } from "./actions";

export type PlanItem = ProposedItem & {
  status: "proposed" | "confirmed";
  dbId: number;
  confirmedRecordType?: "key_date" | "planned_activity" | "trip_itinerary_item";
  confirmedRecordId?: number;
};

const ACTIVITY_LABELS: Record<string, string> = {
  date_night: "Date night",
  trip: "Trip",
  anniversary_birthday: "Anniversary / Birthday",
};

const CATEGORY_SECTIONS: Array<{ key: PlanItemCategory; label: string }> = [
  { key: "other", label: "Plans" },
  { key: "stay", label: "Stay" },
  { key: "eat_drink", label: "Eat & Drink" },
  { key: "explore", label: "Explore" },
];

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

  function discard(item: PlanItem) {
    setItems((prev) => prev.filter((it) => it.clientId !== item.clientId));
    void deletePlanItem(item.dbId);
  }

  function markConfirmed(clientId: string, recordType: PlanItem["confirmedRecordType"], recordId: number) {
    setItems((prev) =>
      prev.map((it) =>
        it.clientId === clientId
          ? { ...it, status: "confirmed" as const, confirmedRecordType: recordType, confirmedRecordId: recordId }
          : it
      )
    );
  }

  async function confirm(item: PlanItem) {
    setBusyId(item.clientId);
    try {
      let recordType: PlanItem["confirmedRecordType"];
      let recordId: number;

      if (item.kind === "key_date") {
        const row = await confirmKeyDate({
          label: item.label,
          date: item.date,
          recurrence: item.recurrence,
          sensitive: item.sensitive,
        });
        recordType = "key_date";
        recordId = row.id;
      } else if (item.kind === "planned_activity") {
        const row = await confirmPlannedActivity({
          activityType: item.activityType,
          targetDate: item.targetDate,
          notes: item.notes,
        });
        recordType = "planned_activity";
        recordId = row.id;
      } else {
        const effectiveTripId = item.tripId ?? confirmedTripId;
        if (effectiveTripId == null) {
          const result = await confirmNewTripWithItineraryItem({
            day: item.day,
            time: item.time,
            activity: item.activity,
            notes: item.notes,
          });
          setConfirmedTripId(result.tripId);
          recordType = "trip_itinerary_item";
          recordId = result.itemId;
        } else {
          const row = await confirmItineraryItem({
            tripId: effectiveTripId,
            day: item.day,
            time: item.time,
            activity: item.activity,
            notes: item.notes,
          });
          recordType = "trip_itinerary_item";
          recordId = row.id;
        }
      }

      markConfirmed(item.clientId, recordType, recordId);
      await syncPlanItem(item.dbId, {
        status: "confirmed",
        confirmedRecordType: recordType,
        confirmedRecordId: recordId,
      });
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

  // Edit save for an item already confirmed: updates the real record it
  // points at (not just the card), so changing your mind after the fact
  // actually takes effect.
  async function saveConfirmedEdit(item: PlanItem) {
    if (item.kind === "key_date" && item.confirmedRecordId) {
      await updateConfirmedKeyDate(item.confirmedRecordId, {
        label: item.label,
        date: item.date,
        recurrence: item.recurrence,
        sensitive: item.sensitive,
      });
    } else if (item.kind === "planned_activity" && item.confirmedRecordId) {
      await updateConfirmedPlannedActivity(item.confirmedRecordId, {
        targetDate: item.targetDate,
        notes: item.notes,
      });
    } else if (item.kind === "itinerary_item" && item.confirmedRecordId) {
      await updateConfirmedItineraryItem(item.confirmedRecordId, {
        day: item.day,
        time: item.time,
        activity: item.activity,
        notes: item.notes,
      });
    }
    await syncPlanItem(item.dbId, { payloadJson: JSON.stringify(item) });
  }

  if (items.length === 0) {
    return <EmptyState>Nothing proposed yet — keep chatting and ideas will show up here.</EmptyState>;
  }

  const pendingCount = items.filter((i) => i.status === "proposed").length;
  const byCategory = new Map<PlanItemCategory, PlanItem[]>();
  for (const item of items) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }

  return (
    <div>
      {pendingCount > 1 && (
        <button onClick={confirmAll} className={`${primaryButtonClass} mb-4 w-full py-2.5`}>
          Add all ({pendingCount})
        </button>
      )}

      <div className="space-y-6">
        {CATEGORY_SECTIONS.filter((s) => byCategory.has(s.key)).map((section) => (
          <div key={section.key}>
            {section.key !== "other" && (
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
                {section.label}
              </h3>
            )}
            <div className="space-y-3">
              {byCategory.get(section.key)!.map((item) => (
                <Card
                  key={item.clientId}
                  className={`py-4 ${item.status === "confirmed" ? "bg-cream-50/60" : ""}`}
                >
                  {item.status === "confirmed" && (
                    <span className="mb-2 inline-block rounded-full bg-sage-100 px-2 py-0.5 text-xs font-medium text-sage-700">
                      Added
                    </span>
                  )}

                  {editingId === item.clientId ? (
                    <EditForm
                      item={item}
                      onSave={async (patch) => {
                        update(item.clientId, patch);
                        const updated = { ...item, ...patch } as PlanItem;
                        setEditingId(null);
                        if (updated.status === "confirmed") {
                          await saveConfirmedEdit(updated);
                        } else {
                          await syncPlanItem(updated.dbId, { payloadJson: JSON.stringify(updated) });
                        }
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <ItemView item={item} />
                  )}

                  {editingId !== item.clientId && (
                    <div className="mt-3 flex items-center gap-4 border-t border-ink-100 pt-3">
                      {item.status === "proposed" && (
                        <button
                          onClick={() => confirm(item)}
                          disabled={busyId === item.clientId}
                          className="text-sm font-medium text-sage-600 hover:text-sage-700"
                        >
                          {busyId === item.clientId ? "Adding…" : "Confirm"}
                        </button>
                      )}
                      <button onClick={() => setEditingId(item.clientId)} className={ghostLinkClass}>
                        Edit
                      </button>
                      {item.status === "proposed" && (
                        <button
                          onClick={() => discard(item)}
                          className="text-sm text-ink-400 hover:text-clay-600"
                        >
                          Discard
                        </button>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
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

  const restaurant = item.restaurantInfo;

  return (
    <div>
      <span className="font-medium text-ink-800">
        {restaurant && <span className="mr-1.5">{restaurant.emoji}</span>}
        Day {item.day}
        {item.time ? ` · ${item.time}` : ""}
      </span>
      <p className="mt-1 text-sm text-ink-600">{item.activity}</p>
      {item.notes && <p className="mt-1 text-sm text-ink-400">{item.notes}</p>}

      {restaurant && (
        <div className="mt-3 space-y-1.5 rounded-lg bg-cream-100/50 p-3 text-sm">
          {restaurant.blurb && <p className="text-ink-600">{restaurant.blurb}</p>}
          <p className="text-ink-400">
            {[
              restaurant.rating != null ? `${restaurant.rating}★` : null,
              restaurant.userRatingsTotal != null ? `${restaurant.userRatingsTotal} reviews` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {restaurant.link && (
            <a
              href={restaurant.link}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-clay-600 hover:text-clay-700 hover:underline"
            >
              View / reserve ↗
            </a>
          )}
        </div>
      )}
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
