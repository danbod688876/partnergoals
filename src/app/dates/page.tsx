import Link from "next/link";
import { db } from "@/db";
import { keyDate, recurrenceEnum } from "@/db/schema";
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
import { QuickAddKeyDate } from "@/components/QuickAddKeyDate";
import { daysUntil, formatDate, nextOccurrence } from "@/lib/dates";
import { deleteKeyDate, saveKeyDate } from "./actions";

export default async function DatesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const rows = await db.select().from(keyDate);
  const editing = edit ? rows.find((r) => String(r.id) === edit) : undefined;

  const withNext = rows
    .map((row) => {
      const next = nextOccurrence(row.date, row.recurrence);
      return { row, next, days: daysUntil(next) };
    })
    .sort((a, b) => a.next.getTime() - b.next.getTime());

  return (
    <div>
      <PageHeader
        title="Key Dates"
        subtitle="Anniversaries, birthdays, and the days that matter — never caught off guard."
      />

      {!editing && <QuickAddKeyDate />}

      <Card className="mb-8">
        <h2 className="mb-4 font-serif text-lg text-ink-800">
          {editing ? "Edit date" : "Add a date"}
        </h2>
        <form action={saveKeyDate} className="space-y-4" key={editing?.id ?? "new"}>
          {editing && <input type="hidden" name="id" value={editing.id} />}

          <div>
            <label className={labelClass} htmlFor="label">
              Label
            </label>
            <input
              id="label"
              name="label"
              placeholder="e.g. Her birthday, Anniversary"
              defaultValue={editing?.label ?? ""}
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
              <label className={labelClass} htmlFor="recurrence">
                Recurrence
              </label>
              <select
                id="recurrence"
                name="recurrence"
                defaultValue={editing?.recurrence ?? "annual"}
                className={inputClass}
              >
                {recurrenceEnum.enumValues.map((r) => (
                  <option key={r} value={r}>
                    {r === "annual" ? "Every year" : "One time"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <label className={labelClass} htmlFor="leadTimeDays">
                Plan ahead (days)
              </label>
              <input
                id="leadTimeDays"
                name="leadTimeDays"
                type="number"
                min={0}
                defaultValue={editing?.leadTimeDays ?? 14}
                className={inputClass}
              />
            </div>
            <label className="mb-2 flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                name="sensitive"
                defaultChecked={editing?.sensitive ?? false}
                className="h-4 w-4 rounded border-ink-100"
              />
              Sensitive date (keep it low-key)
            </label>
          </div>

          <div className="flex gap-3">
            <button type="submit" className={primaryButtonClass}>
              {editing ? "Save changes" : "Add date"}
            </button>
            {editing && (
              <Link href="/dates" className={secondaryButtonClass}>
                Cancel
              </Link>
            )}
          </div>
        </form>
      </Card>

      {withNext.length === 0 ? (
        <EmptyState>No dates on the calendar yet — add the first one that matters.</EmptyState>
      ) : (
        <div className="space-y-2">
          {withNext.map(({ row, next, days }) =>
            row.sensitive ? (
              <div
                key={row.id}
                className="flex items-center justify-between gap-4 rounded-xl2 border border-ink-100 bg-cream-100/50 px-5 py-4"
              >
                <div>
                  <span className="text-ink-600">{row.label}</span>
                  <span className="ml-2 text-sm text-ink-400">{formatDate(next)}</span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Link href={`/dates?edit=${row.id}`} className={ghostLinkClass}>
                    Edit
                  </Link>
                  <form action={deleteKeyDate}>
                    <input type="hidden" name="id" value={row.id} />
                    <DeleteButton />
                  </form>
                </div>
              </div>
            ) : (
              <Card key={row.id} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink-800">{row.label}</span>
                    {days <= row.leadTimeDays && days >= 0 && (
                      <span className="rounded-full bg-clay-100 px-2 py-0.5 text-xs font-medium text-clay-700">
                        {days === 0 ? "Today" : `${days}d away — start planning`}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink-400">
                    {formatDate(next)}
                    {row.recurrence === "annual" && " · every year"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Link href={`/dates?edit=${row.id}`} className={ghostLinkClass}>
                    Edit
                  </Link>
                  <form action={deleteKeyDate}>
                    <input type="hidden" name="id" value={row.id} />
                    <DeleteButton />
                  </form>
                </div>
              </Card>
            )
          )}
        </div>
      )}
    </div>
  );
}
