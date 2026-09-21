"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { OnboardingShell } from "@/components/OnboardingShell";
import { PlanNextActivityPrompt } from "@/components/PlanNextActivityPrompt";
import { ghostLinkClass } from "@/components/ui";

export default function OnboardingPlanPage() {
  const router = useRouter();

  return (
    <OnboardingShell wide>
      <PlanNextActivityPrompt onComplete={() => router.push("/onboarding/finish")} />
      <div className="mt-4 text-center">
        <Link href="/onboarding/finish" className={ghostLinkClass}>
          Skip for now
        </Link>
      </div>
    </OnboardingShell>
  );
}
