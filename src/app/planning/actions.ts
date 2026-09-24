"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { plan, planItem, planMessage } from "@/db/schema";

export type DraftPlanSummary = { id: number; name: string; updatedAt: string };

export async function createDraftPlan(): Promise<{ id: number; name: string }> {
  const [row] = await db.insert(plan).values({}).returning();
  return { id: row.id, name: row.name };
}

export async function listDraftPlans(): Promise<DraftPlanSummary[]> {
  const rows = await db.select().from(plan).orderBy(desc(plan.updatedAt));
  return rows.map((r) => ({ id: r.id, name: r.name, updatedAt: r.updatedAt.toISOString() }));
}

export type LoadedPlan = {
  plan: { id: number; name: string };
  messages: Array<{ id: string; role: "user" | "assistant"; content: string; hidden: boolean }>;
  items: Array<{ dbId: number; status: "proposed" | "confirmed"; payload: unknown }>;
};

export async function loadPlan(planId: number): Promise<LoadedPlan | null> {
  const [planRow] = await db.select().from(plan).where(eq(plan.id, planId)).limit(1);
  if (!planRow) return null;

  const [messages, items] = await Promise.all([
    db.select().from(planMessage).where(eq(planMessage.planId, planId)).orderBy(planMessage.createdAt),
    db.select().from(planItem).where(eq(planItem.planId, planId)).orderBy(planItem.createdAt),
  ]);

  return {
    plan: { id: planRow.id, name: planRow.name },
    messages: messages.map((m) => ({
      id: `msg-db-${m.id}`,
      role: m.role,
      content: m.content,
      hidden: m.hidden,
    })),
    items: items.map((i) => ({
      dbId: i.id,
      status: i.status,
      payload: JSON.parse(i.payloadJson),
    })),
  };
}

// Keeps a plan_item row's persisted state (payload / status / which real
// record it maps to) in sync with actions taken in the "Your plan" panel —
// confirm, edit, or a post-confirm edit — so a resumed session sees the
// current state rather than what was first proposed.
export async function syncPlanItem(
  dbId: number,
  patch: {
    payloadJson?: string;
    status?: "proposed" | "confirmed";
    confirmedRecordType?: string;
    confirmedRecordId?: number;
  }
): Promise<void> {
  await db.update(planItem).set(patch).where(eq(planItem.id, dbId));
}

export async function deletePlanItem(dbId: number): Promise<void> {
  await db.delete(planItem).where(eq(planItem.id, dbId));
}

export async function touchPlan(planId: number): Promise<void> {
  await db.update(plan).set({ updatedAt: new Date() }).where(eq(plan.id, planId));
  revalidatePath("/planning");
}

export async function renamePlan(planId: number, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  await db.update(plan).set({ name: trimmed, updatedAt: new Date() }).where(eq(plan.id, planId));
  revalidatePath("/planning");
}
