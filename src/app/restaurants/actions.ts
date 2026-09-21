"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { favoriteRestaurant, restaurantPlatformEnum } from "@/db/schema";

type Platform = (typeof restaurantPlatformEnum.enumValues)[number];

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

export async function saveRestaurant(formData: FormData) {
  const id = str(formData, "id");
  const name = str(formData, "name");
  const cuisine = str(formData, "cuisine");
  const neighborhood = str(formData, "neighborhood");
  const platform = (str(formData, "platform") as Platform | null) ?? "other";
  const platformVenueId = str(formData, "platformVenueId");
  const lastVisited = str(formData, "lastVisited");
  const notes = str(formData, "notes");

  if (!name) return;

  const values = { name, cuisine, neighborhood, platform, platformVenueId, lastVisited, notes };

  if (id) {
    await db.update(favoriteRestaurant).set(values).where(eq(favoriteRestaurant.id, Number(id)));
  } else {
    await db.insert(favoriteRestaurant).values(values);
  }

  revalidatePath("/restaurants");
}

export async function deleteRestaurant(formData: FormData) {
  const id = str(formData, "id");
  if (!id) return;
  await db.delete(favoriteRestaurant).where(eq(favoriteRestaurant.id, Number(id)));
  revalidatePath("/restaurants");
}
