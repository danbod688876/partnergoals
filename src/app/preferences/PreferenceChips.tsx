"use client";

import { useEffect, useState } from "react";
import { deletePreferenceById, quickAddPreference } from "./actions";

type Strength = "like" | "love" | "dislike";
type Item = { id: number; value: string; strength: Strength };

const STRENGTH_STYLES: Record<Strength, string> = {
  love: "bg-clay-100 text-clay-700",
  like: "bg-sage-100 text-sage-700",
  dislike: "bg-ink-100 text-ink-600",
};

export function PreferenceChips({
  category,
  items,
}: {
  category:
    | "band"
    | "color"
    | "flower"
    | "jewelry_style"
    | "food"
    | "hobby"
    | "movie"
    | "other";
  items: Item[];
}) {
  const [input, setInput] = useState("");
  const [localItems, setLocalItems] = useState(items);

  useEffect(() => setLocalItems(items), [items]);

  function add() {
    const value = input.trim();
    if (!value) return;
    setInput("");
    const tempId = -Date.now();
    setLocalItems((prev) => [...prev, { id: tempId, value, strength: "like" }]);
    void quickAddPreference(category, value);
  }

  function remove(id: number) {
    setLocalItems((prev) => prev.filter((i) => i.id !== id));
    if (id > 0) void deletePreferenceById(id);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {localItems.map((item) => (
        <span
          key={item.id}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${STRENGTH_STYLES[item.strength]}`}
        >
          {item.value}
          <button
            onClick={() => remove(item.id)}
            className="leading-none opacity-60 hover:opacity-100"
            aria-label={`Remove ${item.value}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        placeholder="Type and press Enter…"
        className="rounded-full border border-dashed border-ink-200 px-3 py-1 text-sm text-ink-700 placeholder:text-ink-400 focus:border-clay-300 focus:outline-none"
      />
    </div>
  );
}
