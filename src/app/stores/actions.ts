"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { storeBrand, storeCategoryEnum } from "@/db/schema";

type Category = (typeof storeCategoryEnum.enumValues)[number];

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

export async function saveStore(formData: FormData) {
  const id = str(formData, "id");
  const name = str(formData, "name");
  const category = (str(formData, "category") as Category | null) ?? "other";
  const url = str(formData, "url");
  const allowlisted = formData.get("allowlisted") === "on";

  if (!name) return;

  const values = { name, category, url, allowlisted };

  if (id) {
    await db.update(storeBrand).set(values).where(eq(storeBrand.id, Number(id)));
  } else {
    await db.insert(storeBrand).values(values);
  }

  revalidatePath("/stores");
}

export async function deleteStore(formData: FormData) {
  const id = str(formData, "id");
  if (!id) return;
  await db.delete(storeBrand).where(eq(storeBrand.id, Number(id)));
  revalidatePath("/stores");
}
