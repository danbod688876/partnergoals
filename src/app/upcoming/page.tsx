import { eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { keyDate, plannedActivity, trip } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { formatDate, nextOccurrence } from "@/lib/dates";
import { UpcomingList, type UpcomingItem } from "./UpcomingList";

export default async function UpcomingPage() {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const [keyDates, activities, trips] = await Promise.all([
    db.select().from(keyDate),
    db.select().from(plannedActivity).where(eq(plannedActivity.status, "upcoming")),
    db.select().from(trip).where(gte(trip.startDate, todayStr)),
  ]);

  const linkedTripIds = new Set(
    activities.filter((a) => a.linkedTripId != null).map((a) => a.linkedTripId)
  );
  const tripById = new Map(trips.map((t) => [t.id, t]));

  const items: UpcomingItem[] = [];

  for (const row of keyDates) {
    const occurrence = nextOccurrence(row.date, row.recurrence);
    items.push({
      key: `key_date-${row.id}`,
      kind: "key_date",
      label: row.label,
      meta: row.recurrence === "annual" ? "every year" : undefined,
      dateLabel: formatDate(occurrence),
      sortTime: occurrence.getTime(),
      href: `/dates?edit=${row.id}`,
    });
  }

  for (const row of activities) {
    let label: string;
    let meta: string | undefined;
    let sortTime: number;
    let dateLabel: string | undefined;

    if (row.type === "date_night") {
      label = "Date night";
    } else if (row.type === "trip") {
      const linkedTrip = row.linkedTripId != null ? tripById.get(row.linkedTripId) : undefined;
      label = linkedTrip?.destination ? `Trip: ${linkedTrip.destination}` : "A trip away";
    } else {
      label = "Anniversary / Birthday";
    }

    if (row.targetDate) {
      const d = new Date(row.targetDate + "T00:00:00");
      dateLabel = formatDate(d);
      sortTime = d.getTime();
    } else {
      // No date yet — sort after every dated item, oldest-created first.
      sortTime = Number.MAX_SAFE_INTEGER - row.createdAt.getTime();
      meta = "no date yet";
    }

    items.push({
      key: `planned_activity-${row.id}`,
      kind: "planned_activity",
      label,
      meta,
      dateLabel,
      sortTime,
      href: "/upcoming",
    });
  }

  // Standalone trips with a future date that aren't already represented by
  // one of the PlannedActivity rows above (avoids listing the same trip twice).
  for (const row of trips) {
    if (linkedTripIds.has(row.id)) continue;
    const d = row.startDate ? new Date(row.startDate + "T00:00:00") : null;
    items.push({
      key: `trip-${row.id}`,
      kind: "trip",
      label: row.destination ? `Trip: ${row.destination}` : "A trip away",
      dateLabel: d ? formatDate(d) : undefined,
      sortTime: d ? d.getTime() : Number.MAX_SAFE_INTEGER,
      href: "/upcoming",
    });
  }

  items.sort((a, b) => a.sortTime - b.sortTime);

  return (
    <div>
      <PageHeader
        title="Upcoming"
        subtitle="What's ahead, soonest first — no calendar to dig through."
      />
      <UpcomingList items={items} />
    </div>
  );
}
