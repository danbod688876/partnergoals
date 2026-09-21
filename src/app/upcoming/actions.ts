"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { plannedActivity, trip } from "@/db/schema";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

export async function createDateNightActivity() {
  await db.insert(plannedActivity).values({
    type: "date_night",
    status: "upcoming",
  });

  revalidatePath("/upcoming");
  revalidatePath("/notifications");
}

export async function createTripActivity(formData: FormData) {
  const destination = str(formData, "destination");
  const startDate = str(formData, "startDate");
  const endDate = str(formData, "endDate");

  const [tripRow] = await db
    .insert(trip)
    .values({ destination, startDate, endDate })
    .returning();

  await db.insert(plannedActivity).values({
    type: "trip",
    status: "upcoming",
    targetDate: startDate,
    linkedTripId: tripRow.id,
  });

  revalidatePath("/upcoming");
  revalidatePath("/notifications");
}
