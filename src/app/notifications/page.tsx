import Link from "next/link";
import { and, desc, eq, gt, lt, isNull, or, asc } from "drizzle-orm";
import { db } from "@/db";
import { notification, partner } from "@/db/schema";
import { Card, EmptyState, PageHeader, ghostLinkClass, inputClass, primaryButtonClass } from "@/components/ui";
import { ScanTrigger } from "./ScanTrigger";
import {
  dismissNotification,
  snoozeNotification,
  unsnoozeNotification,
  updateCadenceThreshold,
} from "./actions";

const TYPE_LABELS: Record<string, string> = {
  key_date_reminder: "Key date",
  restaurant_surface: "Restaurant",
  restaurant_similar: "Backup idea",
  restaurant_opening: "New opening",
  profile_gap: "Quick ask",
  cadence_nudge: "Time together",
};

const TYPE_STYLES: Record<string, string> = {
  key_date_reminder: "bg-clay-100 text-clay-700",
  restaurant_surface: "bg-sage-100 text-sage-700",
  restaurant_similar: "bg-sage-100 text-sage-700",
  restaurant_opening: "bg-ink-100 text-ink-600",
  profile_gap: "bg-clay-100 text-clay-700",
  cadence_nudge: "bg-sage-100 text-sage-700",
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ scan?: string }>;
}) {
  const { scan } = await searchParams;
  const now = new Date();

  const [open, snoozed, [partnerRow]] = await Promise.all([
    db
      .select()
      .from(notification)
      .where(
        and(
          eq(notification.dismissed, false),
          or(isNull(notification.snoozedUntil), lt(notification.snoozedUntil, now))
        )
      )
      .orderBy(desc(notification.createdAt)),
    db
      .select()
      .from(notification)
      .where(and(eq(notification.dismissed, false), gt(notification.snoozedUntil, now)))
      .orderBy(asc(notification.snoozedUntil)),
    db.select({ cadenceThresholdDays: partner.cadenceThresholdDays }).from(partner).limit(1),
  ]);

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Nudges worth acting on, surfaced when they're actually relevant."
      />

      {scan === "1" && <ScanTrigger />}

      {open.length === 0 ? (
        <EmptyState>Nothing open right now — you&rsquo;re caught up.</EmptyState>
      ) : (
        <div className="space-y-2">
          {open.map((n) => (
            <Card key={n.id} className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <span
                    className={`mb-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[n.type] ?? "bg-ink-100 text-ink-600"}`}
                  >
                    {TYPE_LABELS[n.type] ?? n.type}
                  </span>
                  <p className="text-ink-800">{n.message}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-ink-400">
                    <span>{timeAgo(new Date(n.createdAt))}</span>
                    {n.link && (
                      <Link href={n.link} className={ghostLinkClass}>
                        View
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-4 border-t border-ink-100 pt-3">
                <form action={dismissNotification}>
                  <input type="hidden" name="id" value={n.id} />
                  <button
                    type="submit"
                    className="text-sm font-medium text-sage-600 hover:text-sage-700"
                  >
                    Mark done
                  </button>
                </form>

                <form action={snoozeNotification} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={n.id} />
                  <select
                    name="days"
                    defaultValue="3"
                    className="rounded-lg border border-ink-100 px-2 py-1 text-sm text-ink-600"
                  >
                    <option value="1">1 day</option>
                    <option value="3">3 days</option>
                    <option value="7">1 week</option>
                  </select>
                  <button type="submit" className="text-sm text-ink-400 hover:text-ink-700">
                    Snooze
                  </button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}

      {snoozed.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
            Snoozed
          </h3>
          <div className="space-y-2">
            {snoozed.map((n) => (
              <div
                key={n.id}
                className="flex items-center justify-between gap-4 rounded-xl2 border border-ink-100 bg-cream-100/50 px-5 py-3"
              >
                <div>
                  <p className="text-sm text-ink-600">{n.message}</p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    Back {n.snoozedUntil && new Date(n.snoozedUntil).toLocaleDateString()}
                  </p>
                </div>
                <form action={unsnoozeNotification}>
                  <input type="hidden" name="id" value={n.id} />
                  <button type="submit" className={ghostLinkClass}>
                    Unsnooze
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 border-t border-ink-100 pt-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
          Settings
        </h3>
        <form action={updateCadenceThreshold} className="flex items-center gap-3">
          <label htmlFor="cadenceThresholdDays" className="text-sm text-ink-600">
            Nudge me if nothing&rsquo;s planned together for
          </label>
          <input
            id="cadenceThresholdDays"
            name="cadenceThresholdDays"
            type="number"
            min={1}
            defaultValue={partnerRow?.cadenceThresholdDays ?? 21}
            className={`${inputClass} w-20`}
          />
          <span className="text-sm text-ink-600">days</span>
          <button type="submit" className={primaryButtonClass}>
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
