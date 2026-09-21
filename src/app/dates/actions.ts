"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { keyDate, recurrenceEnum } from "@/db/schema";

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

  if (id) {
    await db.update(keyDate).set(values).where(eq(keyDate.id, Number(id)));
  } else {
    await db.insert(keyDate).values(values);
  }

  revalidatePath("/dates");
}

export async function deleteKeyDate(formData: FormData) {
  const id = str(formData, "id");
  if (!id) return;
  await db.delete(keyDate).where(eq(keyDate.id, Number(id)));
  revalidatePath("/dates");
}
