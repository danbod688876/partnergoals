import Link from "next/link";
import { and, desc, eq, gt, lt, isNull, or, asc } from "drizzle-orm";
import { db } from "@/db";
import { notification } from "@/db/schema";
import { Card, EmptyState, PageHeader, ghostLinkClass } from "@/components/ui";
import { dismissNotification, snoozeNotification, unsnoozeNotification } from "./actions";

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

export default async function NotificationsPage() {
  const now = new Date();

  const [open, snoozed] = await Promise.all([
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
  ]);

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Nudges worth acting on, surfaced when they're actually relevant."
      />

      {open.length === 0 ? (
        <EmptyState>Nothing open right now — you&rsquo;re caught up.</EmptyState>
      ) : (
        <div className="space-y-2">
          {open.map((n) => (
            <Card key={n.id} className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
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
    </div>
  );
}
