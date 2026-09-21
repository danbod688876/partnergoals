import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLog, notification, partner, plannedActivity, preference } from "@/db/schema";
import { formsFor } from "@/lib/pronouns";

function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(a.getTime() - b.getTime());
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

async function lastActivityTogether(): Promise<Date | null> {
  const [lastLog] = await db
    .select({ date: activityLog.date })
    .from(activityLog)
    .orderBy(desc(activityLog.date))
    .limit(1);

  const doneActivities = await db
    .select({ targetDate: plannedActivity.targetDate, createdAt: plannedActivity.createdAt })
    .from(plannedActivity)
    .where(eq(plannedActivity.status, "done"));

  const dates: Date[] = [];
  if (lastLog?.date) dates.push(new Date(lastLog.date + "T00:00:00"));
  for (const row of doneActivities) {
    dates.push(row.targetDate ? new Date(row.targetDate + "T00:00:00") : row.createdAt);
  }

  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

async function hasSomethingScheduledSoon(thresholdDays: number): Promise<boolean> {
  const upcoming = await db
    .select({ targetDate: plannedActivity.targetDate })
    .from(plannedActivity)
    .where(and(eq(plannedActivity.status, "upcoming"), sql`${plannedActivity.targetDate} is not null`));

  const today = new Date();
  return upcoming.some((row) => {
    if (!row.targetDate) return false;
    const d = new Date(row.targetDate + "T00:00:00");
    const days = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= thresholdDays;
  });
}

async function suggestionPreferences(limit = 2) {
  const rows = await db
    .select()
    .from(preference)
    .where(and(ne(preference.strength, "dislike"), sql`${preference.category} in ('hobby','food')`))
    .orderBy(desc(preference.createdAt));

  const order: Record<string, number> = { love: 0, like: 1 };
  return rows
    .sort((a, b) => (order[a.strength] ?? 2) - (order[b.strength] ?? 2))
    .slice(0, limit);
}

export async function runCadenceNudgeCheck(): Promise<{ ran: boolean; created: boolean }> {
  const [row] = await db.select().from(partner).limit(1);
  if (!row) return { ran: false, created: false };

  const threshold = row.cadenceThresholdDays;

  // Only one open cadence nudge at a time, re-suggested at most once per
  // threshold window rather than piling up.
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - threshold);

  const [recent] = await db
    .select({ id: notification.id })
    .from(notification)
    .where(and(eq(notification.type, "cadence_nudge"), gte(notification.createdAt, cutoff)))
    .limit(1);

  if (recent) return { ran: true, created: false };

  const [lastTogether, scheduledSoon] = await Promise.all([
    lastActivityTogether(),
    hasSomethingScheduledSoon(threshold),
  ]);

  if (scheduledSoon) return { ran: true, created: false };
  if (lastTogether && daysBetween(new Date(), lastTogether) < threshold) {
    return { ran: true, created: false };
  }

  const prefs = await suggestionPreferences();
  const { object } = formsFor(row.pronouns);

  const message =
    prefs.length > 0
      ? `It's been a bit — ${object} mentioned loving ${prefs.map((p) => p.value).join(" and ")}. Worth planning something around that?`
      : `It's been a bit since you've done something together — worth planning something soon?`;

  await db.insert(notification).values({
    type: "cadence_nudge",
    message,
    link: "/upcoming",
    dismissed: false,
  });

  return { ran: true, created: true };
}
