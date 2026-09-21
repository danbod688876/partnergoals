"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { keyDate, recurrenceEnum } from "@/db/schema";
import { checkSingleKeyDate } from "@/lib/notifications";

type Recurrence = (typeof recurrenceEnum.enumValues)[number];

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

export async function saveKeyDate(formData: FormData) {
  const id = str(formData, "id");
  const label = str(formData, "label");
  const date = str(formData, "date");
  const recurrence = (str(formData, "recurrence") as Recurrence | null) ?? "annual";
  const sensitive = formData.get("sensitive") === "on";
  const leadTimeDays = Number(str(formData, "leadTimeDays") ?? "14");

  if (!label || !date) return;

  const values = { label, date, recurrence, sensitive, leadTimeDays };

  let row: typeof keyDate.$inferSelect;
  if (id) {
    [row] = await db.update(keyDate).set(values).where(eq(keyDate.id, Number(id))).returning();
  } else {
    [row] = await db.insert(keyDate).values(values).returning();
  }

  // Immediate check (item 7a): if this date is already inside its lead-time
  // window, don't make it wait for the next daily cron run.
  await checkSingleKeyDate(row);

  revalidatePath("/dates");
  revalidatePath("/notifications");
}

// Birthday/Anniversary one-tap quick-add: just a date, everything else
// defaults (label = the option name, annual recurrence, 14+7 day reminders).
export async function quickAddKeyDate(formData: FormData) {
  const label = str(formData, "label");
  const date = str(formData, "date");
  if (!label || !date) return;

  const [row] = await db
    .insert(keyDate)
    .values({
      label,
      date,
      recurrence: "annual",
      sensitive: false,
      leadTimeDays: 14,
      secondaryLeadTimeDays: 7,
    })
    .returning();

  await checkSingleKeyDate(row);

  revalidatePath("/dates");
  revalidatePath("/notifications");
}

// Confirm action for a Planning Session's proposed key date — called
// directly from the "Your plan" panel, not via <form action>.
export async function confirmKeyDate(item: {
  label: string;
  date: string;
  recurrence: "annual" | "one_time";
  sensitive: boolean;
}): Promise<{ id: number }> {
  const [row] = await db
    .insert(keyDate)
    .values({
      label: item.label,
      date: item.date,
      recurrence: item.recurrence,
      sensitive: item.sensitive,
      leadTimeDays: 14,
      secondaryLeadTimeDays: 7,
    })
    .returning();

  await checkSingleKeyDate(row);

  revalidatePath("/dates");
  revalidatePath("/notifications");
  return { id: row.id };
}

export async function deleteKeyDate(formData: FormData) {
  const id = str(formData, "id");
  if (!id) return;
  await db.delete(keyDate).where(eq(keyDate.id, Number(id)));
  revalidatePath("/dates");
}
