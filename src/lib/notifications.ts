import { and, count, desc, eq, gte, lt, or, isNull, ilike, ne } from "drizzle-orm";
import { db } from "@/db";
import { giftLog, keyDate, notification, preference } from "@/db/schema";
import { daysUntil, formatDate, nextOccurrence } from "@/lib/dates";

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "her",
  "his",
  "their",
  "our",
  "my",
  "day",
  "date",
  "party",
  "trip",
]);

function keywordsFor(label: string): string[] {
  return Array.from(
    new Set(
      label
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length > 2 && !STOPWORDS.has(word))
    )
  );
}

async function matchingGifts(label: string, limit = 3) {
  const keywords = keywordsFor(label);

  if (keywords.length > 0) {
    const matched = await db
      .select()
      .from(giftLog)
      .where(
        or(...keywords.map((word) => ilike(giftLog.occasion, `%${word}%`)))
      )
      .orderBy(desc(giftLog.dateGiven))
      .limit(limit);

    if (matched.length > 0) return matched;
  }

  // No occasion match — fall back to the most recent gifts as a loose proxy
  // for "nearby" context rather than surfacing nothing.
  return db.select().from(giftLog).orderBy(desc(giftLog.dateGiven)).limit(limit);
}

async function topPreferences(limit = 3) {
  const rows = await db
    .select()
    .from(preference)
    .where(ne(preference.strength, "dislike"))
    .orderBy(desc(preference.createdAt));

  // Sort "love" ahead of "like" explicitly rather than relying on a string
  // sort, which wouldn't put them in a meaningful order.
  const order: Record<string, number> = { love: 0, like: 1 };
  return rows
    .sort((a, b) => (order[a.strength] ?? 2) - (order[b.strength] ?? 2))
    .slice(0, limit);
}

function daysPhrase(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
}

async function buildMessage(
  row: typeof keyDate.$inferSelect,
  days: number,
  occurrence: Date
): Promise<string> {
  if (row.sensitive) {
    const count = days === 1 ? "1 day" : `${days} days`;
    return `In ${count}: ${row.label} — ${formatDate(occurrence)}`;
  }

  const [gifts, prefs] = await Promise.all([matchingGifts(row.label), topPreferences()]);

  let message = `${row.label} is ${daysPhrase(days)}.`;

  if (gifts.length > 0) {
    message += ` Last time: ${gifts.map((g) => g.item).join(", ")}.`;
  }

  if (prefs.length > 0) {
    message += ` Likes: ${prefs.map((p) => p.value).join(", ")}.`;
  }

  return message;
}

export async function runDailyKeyDateCheck(): Promise<{
  scanned: number;
  created: number;
}> {
  const rows = await db.select().from(keyDate);
  let created = 0;

  for (const row of rows) {
    const occurrence = nextOccurrence(row.date, row.recurrence);
    const days = daysUntil(occurrence);

    if (days < 0 || days > row.leadTimeDays) continue;

    const windowStart = new Date(occurrence);
    windowStart.setDate(windowStart.getDate() - row.leadTimeDays);

    const [existing] = await db
      .select({ id: notification.id })
      .from(notification)
      .where(
        and(
          eq(notification.keyDateId, row.id),
          eq(notification.type, "key_date_reminder"),
          eq(notification.dismissed, false),
          gte(notification.createdAt, windowStart)
        )
      )
      .limit(1);

    if (existing) continue;

    const message = await buildMessage(row, days, occurrence);

    await db.insert(notification).values({
      type: "key_date_reminder",
      keyDateId: row.id,
      message,
      link: `/dates?edit=${row.id}`,
      dismissed: false,
    });

    created++;
  }

  return { scanned: rows.length, created };
}

export async function getOpenNotificationCount(): Promise<number> {
  const now = new Date();
  const [row] = await db
    .select({ value: count() })
    .from(notification)
    .where(
      and(
        eq(notification.dismissed, false),
        or(isNull(notification.snoozedUntil), lt(notification.snoozedUntil, now))
      )
    );

  return row?.value ?? 0;
}
