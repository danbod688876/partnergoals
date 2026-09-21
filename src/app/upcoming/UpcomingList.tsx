"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, ghostLinkClass, secondaryButtonClass } from "@/components/ui";
import { PlanNextActivityPrompt } from "@/components/PlanNextActivityPrompt";

export type UpcomingItem = {
  key: string;
  kind: "key_date" | "planned_activity" | "trip";
  label: string;
  meta?: string;
  dateLabel?: string;
  sortTime: number;
  href: string;
};

const KIND_LABELS: Record<UpcomingItem["kind"], string> = {
  key_date: "Key date",
  planned_activity: "Planned",
  trip: "Trip",
};

export function UpcomingList({ items }: { items: UpcomingItem[] }) {
  const router = useRouter();
  const [promptOpen, setPromptOpen] = useState(false);

  function handleComplete() {
    setPromptOpen(false);
    router.refresh();
  }

  if (items.length === 0) {
    return <PlanNextActivityPrompt onComplete={handleComplete} />;
  }

  return (
    <div>
      {promptOpen ? (
        <div className="mb-6">
          <PlanNextActivityPrompt onComplete={handleComplete} />
          <button
            onClick={() => setPromptOpen(false)}
            className={`${ghostLinkClass} mt-3 block`}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setPromptOpen(true)}
          className={`${secondaryButtonClass} mb-4 w-full text-left`}
        >
          + Plan something else
        </button>
      )}

      <div className="space-y-2">
        {items.map((item) => {
          const body = (
            <Card
              className={`flex items-center justify-between gap-4 py-4 ${
                item.kind === "key_date" ? "transition-colors hover:bg-cream-100/40" : ""
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink-800">{item.label}</span>
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600">
                    {KIND_LABELS[item.kind]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-400">
                  {item.dateLabel ?? item.meta ?? " "}
                  {item.dateLabel && item.meta ? ` · ${item.meta}` : ""}
                </p>
              </div>
            </Card>
          );

          return item.kind === "key_date" ? (
            <Link key={item.key} href={item.href} className="block">
              {body}
            </Link>
          ) : (
            <div key={item.key}>{body}</div>
          );
        })}
      </div>
    </div>
  );
}
