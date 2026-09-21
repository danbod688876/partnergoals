import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { keyDate, notification, partner } from "@/db/schema";
import { formsFor } from "@/lib/pronouns";

const GAP_CADENCE_DAYS = 7;

type Gap = {
  check: (row: typeof partner.$inferSelect, hasKeyDates: boolean) => boolean;
  ask: (possessive: string, subject: string, object: string) => string;
  link: string;
};

const GAPS: Gap[] = [
  {
    check: (row) => !row.birthday,
    ask: (possessive) => `What's ${possessive} birthday?`,
    link: "/profile",
  },
  {
    check: (_row, hasKeyDates) => !hasKeyDates,
    ask: (_possessive, _subject, object) =>
      `Got any dates worth remembering for ${object} — birthday, anniversary, anything like that?`,
    link: "/dates",
  },
  {
    check: (row) => !row.city,
    ask: (_possessive, subject) => `What city does ${subject} live in?`,
    link: "/profile",
  },
  {
    check: (row) => !row.dietaryNotes,
    ask: (_possessive, _subject, object) => `Any dietary notes worth keeping in mind for ${object}?`,
    link: "/profile",
  },
  {
    check: (row) => !row.clothingSize,
    ask: (possessive) => `What's ${possessive} clothing size?`,
    link: "/profile",
  },
  {
    check: (row) => !row.shoeSize,
    ask: (possessive) => `What's ${possessive} shoe size?`,
    link: "/profile",
  },
  {
    check: (row) => !row.neighborhood,
    ask: (_possessive, subject) => `Which neighborhood does ${subject} live in?`,
    link: "/profile",
  },
  {
    check: (row) => !row.ringSize,
    ask: (possessive) => `Do you know ${possessive} ring size?`,
    link: "/profile",
  },
];

export async function runProfileGapCheck(): Promise<{ ran: boolean; created: boolean }> {
  const [row] = await db.select().from(partner).limit(1);
  if (!row) return { ran: false, created: false };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - GAP_CADENCE_DAYS);

  const [recent] = await db
    .select({ id: notification.id })
    .from(notification)
    .where(and(eq(notification.type, "profile_gap"), gte(notification.createdAt, cutoff)))
    .limit(1);

  if (recent) return { ran: true, created: false };

  const [anyKeyDate] = await db.select({ id: keyDate.id }).from(keyDate).limit(1);
  const hasKeyDates = !!anyKeyDate;

  const gap = GAPS.find((g) => g.check(row, hasKeyDates));
  if (!gap) return { ran: true, created: false };

  const { subject, object, possessive } = formsFor(row.pronouns);

  await db.insert(notification).values({
    type: "profile_gap",
    message: `Got a sec? One more thing that'll help — ${gap.ask(possessive, subject, object)}`,
    link: gap.link,
    dismissed: false,
  });

  return { ran: true, created: true };
}
