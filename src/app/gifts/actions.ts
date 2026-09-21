"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { giftLog } from "@/db/schema";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

async function resolvePhotoUrl(formData: FormData, existing: string | null): Promise<string | null> {
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error(
        "Photo upload requires a Vercel Blob store connected (BLOB_READ_WRITE_TOKEN)."
      );
    }
    const blob = await put(`gifts/${Date.now()}-${file.name}`, file, {
      access: "public",
    });
    return blob.url;
  }

  const pastedUrl = str(formData, "photoUrl");
  if (pastedUrl) return pastedUrl;

  return existing;
}

export async function saveGift(formData: FormData) {
  const id = str(formData, "id");
  const item = str(formData, "item");
  const dateGiven = str(formData, "dateGiven");
  const occasion = str(formData, "occasion");
  const storeBrand = str(formData, "storeBrand");
  const priceStr = str(formData, "price");
  const notes = str(formData, "notes");
  const existingPhoto = str(formData, "existingPhoto");

  if (!item || !dateGiven) return;

  const photoUrl = await resolvePhotoUrl(formData, existingPhoto);

  const values = {
    item,
    dateGiven,
    occasion,
    storeBrand,
    price: priceStr,
    photoUrl,
    notes,
  };

  if (id) {
    await db.update(giftLog).set(values).where(eq(giftLog.id, Number(id)));
  } else {
    await db.insert(giftLog).values(values);
  }

  revalidatePath("/gifts");
}

export async function deleteGift(formData: FormData) {
  const id = str(formData, "id");
  if (!id) return;
  await db.delete(giftLog).where(eq(giftLog.id, Number(id)));
  revalidatePath("/gifts");
}
