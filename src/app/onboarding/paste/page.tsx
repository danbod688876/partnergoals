import { db } from "@/db";
import { partner } from "@/db/schema";
import { OnboardingShell } from "@/components/OnboardingShell";
import { PasteFlow } from "./PasteFlow";

export default async function OnboardingPastePage() {
  const [row] = await db.select().from(partner).limit(1);

  return (
    <OnboardingShell wide>
      <PasteFlow currentName={row?.name ?? ""} currentPronouns={row?.pronouns ?? "they_them"} />
    </OnboardingShell>
  );
}
