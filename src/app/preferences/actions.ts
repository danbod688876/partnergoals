"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { preference, preferenceCategoryEnum, preferenceStrengthEnum } from "@/db/schema";

type Category = (typeof preferenceCategoryEnum.enumValues)[number];
type Strength = (typeof preferenceStrengthEnum.enumValues)[number];

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

export async function savePreference(formData: FormData) {
  const id = str(formData, "id");
  const category = str(formData, "category") as Category | null;
  const value = str(formData, "value");
  const notes = str(formData, "notes");
  const strength = (str(formData, "strength") as Strength | null) ?? "like";

  if (!category || !value) return;

  if (id) {
    await db
      .update(preference)
      .set({ category, value, notes, strength })
      .where(eq(preference.id, Number(id)));
  } else {
    await db.insert(preference).values({ category, value, notes, strength });
  }

  revalidatePath("/preferences");
}

export async function deletePreference(formData: FormData) {
  const id = str(formData, "id");
  if (!id) return;
  await db.delete(preference).where(eq(preference.id, Number(id)));
  revalidatePath("/preferences");
}
