"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { keyDate, partner, preference } from "@/db/schema";
import type { PronounSet } from "@/lib/pronouns";
import { extractProfileFromText, type ExtractResult } from "@/lib/claude-extract";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

async function getOrCreatePartnerId(): Promise<number> {
  const [row] = await db.select({ id: partner.id }).from(partner).limit(1);
  if (row) return row.id;
  const [created] = await db.insert(partner).values({ name: "" }).returning({ id: partner.id });
  return created.id;
}

export async function saveBasics(formData: FormData) {
  const name = str(formData, "name") ?? "Untitled";
  const pronouns = (str(formData, "pronouns") as PronounSet | null) ?? "they_them";
  const path = str(formData, "path") ?? "questions";

  const [existing] = await db.select({ id: partner.id }).from(partner).limit(1);

  if (existing) {
    await db.update(partner).set({ name, pronouns }).where(eq(partner.id, existing.id));
  } else {
    await db.insert(partner).values({ name, pronouns });
  }

  redirect(path === "paste" ? "/onboarding/paste" : "/onboarding/questions");
}

export async function addQuickPickPreference(formData: FormData) {
  const category = str(formData, "category");
  const value = str(formData, "value");
  if (!category || !value) return { ok: false as const };

  const [row] = await db
    .insert(preference)
    .values({
      category: category as (typeof preference.$inferInsert)["category"],
      value,
      strength: "love",
    })
    .returning({ id: preference.id });

  return { ok: true as const, id: row.id, value };
}

export async function removePreference(id: number) {
  await db.delete(preference).where(eq(preference.id, id));
}

type ExtractedData = {
  name?: string | null;
  pronouns?: PronounSet | null;
  birthday?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  clothingSize?: string | null;
  shoeSize?: string | null;
  ringSize?: string | null;
  dietaryNotes?: string | null;
  preferences?: { category: string; value: string; strength?: string; notes?: string | null }[];
  keyDates?: {
    label: string;
    date: string;
    recurrence?: string;
    sensitive?: boolean;
    leadTimeDays?: number;
  }[];
};

export async function saveExtractedData(data: ExtractedData) {
  const partnerId = await getOrCreatePartnerId();

  const profileUpdates: Partial<typeof partner.$inferInsert> = {};
  if (data.name) profileUpdates.name = data.name;
  if (data.pronouns) profileUpdates.pronouns = data.pronouns;
  if (data.birthday) profileUpdates.birthday = data.birthday;
  if (data.city) profileUpdates.city = data.city;
  if (data.neighborhood) profileUpdates.neighborhood = data.neighborhood;
  if (data.clothingSize) profileUpdates.clothingSize = data.clothingSize;
  if (data.shoeSize) profileUpdates.shoeSize = data.shoeSize;
  if (data.ringSize) profileUpdates.ringSize = data.ringSize;
  if (data.dietaryNotes) profileUpdates.dietaryNotes = data.dietaryNotes;

  if (Object.keys(profileUpdates).length > 0) {
    await db.update(partner).set(profileUpdates).where(eq(partner.id, partnerId));
  }

  const validCategories = new Set([
    "band",
    "color",
    "flower",
    "jewelry_style",
    "food",
    "hobby",
    "movie",
    "other",
  ]);

  const validStrengths = new Set(["like", "love", "dislike"]);
  const validRecurrences = new Set(["annual", "one_time"]);

  for (const pref of data.preferences ?? []) {
    if (!pref.value?.trim()) continue;
    const category = validCategories.has(pref.category) ? pref.category : "other";
    const strength = validStrengths.has(pref.strength ?? "") ? pref.strength : "like";
    await db.insert(preference).values({
      category: category as (typeof preference.$inferInsert)["category"],
      value: pref.value.trim(),
      notes: pref.notes ?? null,
      strength: strength as (typeof preference.$inferInsert)["strength"],
    });
  }

  for (const kd of data.keyDates ?? []) {
    if (!kd.label?.trim() || !kd.date) continue;
    const recurrence = validRecurrences.has(kd.recurrence ?? "") ? kd.recurrence : "annual";
    await db.insert(keyDate).values({
      label: kd.label.trim(),
      date: kd.date,
      recurrence: recurrence as (typeof keyDate.$inferInsert)["recurrence"],
      sensitive: kd.sensitive ?? false,
      leadTimeDays: kd.leadTimeDays ?? 14,
    });
  }

  redirect("/onboarding/finish");
}

export async function finishQuestionsFlow() {
  redirect("/onboarding/finish");
}

export async function extractFromPaste(
  _prevState: ExtractResult | undefined,
  formData: FormData
): Promise<ExtractResult> {
  const text = String(formData.get("notes") ?? "");
  return extractProfileFromText(text);
}
