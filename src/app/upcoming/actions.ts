"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { plannedActivity, trip, tripItineraryItem } from "@/db/schema";

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

// --- Planning Session confirm actions ---
// Called directly from the "Your plan" panel (not via <form action>) once
// the user taps Confirm on a proposed item — nothing from the chat itself
// ever writes to the database.

export async function confirmPlannedActivity(item: {
  activityType: "date_night" | "trip" | "anniversary_birthday";
  targetDate: string | null;
  notes: string | null;
}): Promise<{ id: number }> {
  const [row] = await db
    .insert(plannedActivity)
    .values({
      type: item.activityType,
      targetDate: item.targetDate,
      notes: item.notes,
      status: "upcoming",
    })
    .returning({ id: plannedActivity.id });

  revalidatePath("/upcoming");
  revalidatePath("/notifications");
  return row;
}

// First itinerary item of a new trip — creates the Trip, then the item.
export async function confirmNewTripWithItineraryItem(item: {
  day: number;
  time: string | null;
  activity: string;
  notes: string | null;
}): Promise<{ tripId: number; itemId: number }> {
  const [tripRow] = await db.insert(trip).values({}).returning({ id: trip.id });

  await db.insert(plannedActivity).values({
    type: "trip",
    status: "upcoming",
    linkedTripId: tripRow.id,
  });

  const [itemRow] = await db
    .insert(tripItineraryItem)
    .values({
      tripId: tripRow.id,
      day: item.day,
      time: item.time,
      activity: item.activity,
      notes: item.notes,
    })
    .returning({ id: tripItineraryItem.id });

  revalidatePath("/upcoming");
  revalidatePath("/notifications");
  return { tripId: tripRow.id, itemId: itemRow.id };
}

// Later itinerary items in the same session, once a trip id is known
// (either newly created above, or an existing one the model referenced).
export async function confirmItineraryItem(item: {
  tripId: number;
  day: number;
  time: string | null;
  activity: string;
  notes: string | null;
}): Promise<{ id: number }> {
  const [row] = await db
    .insert(tripItineraryItem)
    .values({
      tripId: item.tripId,
      day: item.day,
      time: item.time,
      activity: item.activity,
      notes: item.notes,
    })
    .returning({ id: tripItineraryItem.id });

  revalidatePath("/upcoming");
  return row;
}
