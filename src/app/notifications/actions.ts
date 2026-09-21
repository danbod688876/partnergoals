"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notification } from "@/db/schema";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

export async function dismissNotification(formData: FormData) {
  const id = str(formData, "id");
  if (!id) return;
  await db.update(notification).set({ dismissed: true }).where(eq(notification.id, Number(id)));
  revalidatePath("/notifications");
}

export async function snoozeNotification(formData: FormData) {
  const id = str(formData, "id");
  const days = Number(str(formData, "days") ?? "3");
  if (!id) return;

  const snoozedUntil = new Date();
  snoozedUntil.setDate(snoozedUntil.getDate() + days);

  await db
    .update(notification)
    .set({ snoozedUntil })
    .where(eq(notification.id, Number(id)));
  revalidatePath("/notifications");
}

export async function unsnoozeNotification(formData: FormData) {
  const id = str(formData, "id");
  if (!id) return;
  await db
    .update(notification)
    .set({ snoozedUntil: null })
    .where(eq(notification.id, Number(id)));
  revalidatePath("/notifications");
}
