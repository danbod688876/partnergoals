import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { activityLog } from "@/db/schema";
import {
  Card,
  EmptyState,
  PageHeader,
  ghostLinkClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteActivity, saveActivity } from "./actions";

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const items = await db.select().from(activityLog).orderBy(desc(activityLog.date));
  const editing = edit ? items.find((i) => String(i.id) === edit) : undefined;

  return (
    <div>
      <PageHeader
        title="Activities"
        subtitle="Things you've done together — dates, trips, evenings worth remembering."
      />

      <Card className="mb-8">
        <h2 className="mb-4 font-serif text-lg text-ink-800">
          {editing ? "Edit activity" : "Log an activity"}
        </h2>
        <form action={saveActivity} className="space-y-4" key={editing?.id ?? "new"}>
          {editing && <input type="hidden" name="id" value={editing.id} />}

          <div>
            <label className={labelClass} htmlFor="activity">
              What did you do?
            </label>
            <input
              id="activity"
              name="activity"
              defaultValue={editing?.activity ?? ""}
              required
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="date">
                Date
              </label>
              <input
                id="date"
                name="date"
                type="date"
                defaultValue={editing?.date ?? ""}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="location">
                Location
              </label>
              <input
                id="location"
                name="location"
                defaultValue={editing?.location ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={editing?.notes ?? ""}
              className={inputClass}
            />
          </div>

          <div className="flex gap-3">
            <button type="submit" className={primaryButtonClass}>
              {editing ? "Save changes" : "Add to log"}
            </button>
            {editing && (
              <Link href="/activities" className={secondaryButtonClass}>
                Cancel
              </Link>
            )}
          </div>
        </form>
      </Card>

      {items.length === 0 ? (
        <EmptyState>Nothing logged yet — add the first thing you did together.</EmptyState>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id} className="flex items-start justify-between gap-4 py-4">
              <div>
                <span className="font-medium text-ink-800">{item.activity}</span>
                <p className="mt-1 text-sm text-ink-400">
                  {new Date(item.date + "T00:00:00").toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {item.location && ` · ${item.location}`}
                </p>
                {item.notes && <p className="mt-1 text-sm text-ink-600">{item.notes}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Link href={`/activities?edit=${item.id}`} className={ghostLinkClass}>
                  Edit
                </Link>
                <form action={deleteActivity}>
                  <input type="hidden" name="id" value={item.id} />
                  <DeleteButton />
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
