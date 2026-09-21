"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLog } from "@/db/schema";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

export async function saveActivity(formData: FormData) {
  const id = str(formData, "id");
  const activity = str(formData, "activity");
  const date = str(formData, "date");
  const location = str(formData, "location");
  const notes = str(formData, "notes");

  if (!activity || !date) return;

  const values = { activity, date, location, notes };

  if (id) {
    await db.update(activityLog).set(values).where(eq(activityLog.id, Number(id)));
  } else {
    await db.insert(activityLog).values(values);
  }

  revalidatePath("/activities");
}

export async function deleteActivity(formData: FormData) {
  const id = str(formData, "id");
  if (!id) return;
  await db.delete(activityLog).where(eq(activityLog.id, Number(id)));
  revalidatePath("/activities");
}
