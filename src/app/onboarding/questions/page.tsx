import { db } from "@/db";
import { partner } from "@/db/schema";
import { OnboardingShell } from "@/components/OnboardingShell";
import { QuestionsFlow } from "./QuestionsFlow";

export default async function OnboardingQuestionsPage() {
  const [row] = await db.select().from(partner).limit(1);

  return (
    <OnboardingShell wide>
      <QuestionsFlow pronouns={row?.pronouns ?? "they_them"} />
    </OnboardingShell>
  );
}
