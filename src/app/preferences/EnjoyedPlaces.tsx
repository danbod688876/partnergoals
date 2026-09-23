"use client";

import { useState } from "react";
import { inputClass, secondaryButtonClass } from "@/components/ui";
import { addEnjoyedPlace, deleteEnjoyedPlace } from "./actions";

type EnjoyedType = "hotel" | "restaurant" | "cafe" | "other";
type Item = { id: number; name: string; type: EnjoyedType; city: string | null };

const TYPE_LABELS: Record<EnjoyedType, string> = {
  hotel: "Hotel",
  restaurant: "Restaurant",
  cafe: "Café",
  other: "Other",
};

export function EnjoyedPlaces({ items }: { items: Item[] }) {
  const [local, setLocal] = useState(items);
  const [name, setName] = useState("");
  const [type, setType] = useState<EnjoyedType>("hotel");
  const [city, setCity] = useState("");

  function add() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const trimmedCity = city.trim() || null;
    const tempId = -Date.now();
    setLocal((prev) => [...prev, { id: tempId, name: trimmedName, type, city: trimmedCity }]);
    setName("");
    setCity("");
    void addEnjoyedPlace({ name: trimmedName, type, city: trimmedCity, notes: null });
  }

  function remove(id: number) {
    setLocal((prev) => prev.filter((i) => i.id !== id));
    if (id > 0) void deleteEnjoyedPlace(id);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Place name"
          className={`${inputClass} max-w-[11rem]`}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as EnjoyedType)}
          className={`${inputClass} w-auto`}
        >
          <option value="hotel">Hotel</option>
          <option value="restaurant">Restaurant</option>
          <option value="cafe">Café</option>
          <option value="other">Other</option>
        </select>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="City (optional)"
          className={`${inputClass} max-w-[9rem]`}
        />
        <button onClick={add} className={secondaryButtonClass}>
          Add
        </button>
      </div>

      {local.length === 0 ? (
        <p className="text-sm text-ink-400">
          Nothing yet — add a hotel or restaurant you&rsquo;ve enjoyed and the planner will remember it.
        </p>
      ) : (
        <div className="space-y-2">
          {local.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2"
            >
              <div>
                <span className="font-medium text-ink-800">{item.name}</span>
                <span className="ml-2 text-xs text-ink-400">
                  {TYPE_LABELS[item.type]}
                  {item.city ? ` · ${item.city}` : ""}
                </span>
              </div>
              <button onClick={() => remove(item.id)} className="text-sm text-ink-400 hover:text-clay-600">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
