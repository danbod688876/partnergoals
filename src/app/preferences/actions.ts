"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { enjoyedPlace, enjoyedPlaceTypeEnum, preference, preferenceCategoryEnum, preferenceStrengthEnum } from "@/db/schema";

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

// Fast bulk-entry path: type a value, hit Enter, it's saved immediately at
// the default "like" strength — full strength/notes control still lives in
// the detailed form above for when it's worth the extra step.
export async function quickAddPreference(category: Category, value: string): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) return;
  await db.insert(preference).values({ category, value: trimmed, strength: "like" });
  revalidatePath("/preferences");
}

export async function deletePreferenceById(id: number): Promise<void> {
  await db.delete(preference).where(eq(preference.id, id));
  revalidatePath("/preferences");
}

// --- Enjoyed places (hotels/restaurants/cafes actually liked) ---
// Feeds the Planning Session's hotel/restaurant suggestions — distinct from
// favorite_restaurant, which is about reservations, not "places we loved".

type EnjoyedType = (typeof enjoyedPlaceTypeEnum.enumValues)[number];

export async function addEnjoyedPlace(params: {
  name: string;
  type: EnjoyedType;
  city: string | null;
  notes: string | null;
}): Promise<void> {
  const name = params.name.trim();
  if (!name) return;
  await db.insert(enjoyedPlace).values({ name, type: params.type, city: params.city, notes: params.notes });
  revalidatePath("/preferences");
}

export async function deleteEnjoyedPlace(id: number): Promise<void> {
  await db.delete(enjoyedPlace).where(eq(enjoyedPlace.id, id));
  revalidatePath("/preferences");
}
