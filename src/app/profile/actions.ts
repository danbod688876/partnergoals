"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { partner } from "@/db/schema";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

export async function saveProfile(formData: FormData) {
  const id = formData.get("id");

  const values = {
    name: str(formData, "name") ?? "Untitled",
    birthday: str(formData, "birthday"),
    city: str(formData, "city"),
    neighborhood: str(formData, "neighborhood"),
    clothingSize: str(formData, "clothingSize"),
    shoeSize: str(formData, "shoeSize"),
    ringSize: str(formData, "ringSize"),
    dietaryNotes: str(formData, "dietaryNotes"),
    updatedAt: new Date(),
  };

  if (id && typeof id === "string") {
    await db.update(partner).set(values).where(eq(partner.id, Number(id)));
  } else {
    await db.insert(partner).values(values);
  }

  revalidatePath("/profile");
}
