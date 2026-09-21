import { db } from "@/db";
import { partner } from "@/db/schema";

export async function hasCompletedOnboarding(): Promise<boolean> {
  const [row] = await db.select({ id: partner.id }).from(partner).limit(1);
  return !!row;
}
