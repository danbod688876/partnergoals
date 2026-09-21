import Link from "next/link";
import { OnboardingShell } from "@/components/OnboardingShell";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui";

export default function OnboardingEntryPage() {
  return (
    <OnboardingShell>
      <div className="text-center">
        <h1 className="font-serif text-3xl leading-snug text-ink-800">
          You care about them.
          <br />
          Let&rsquo;s make sure it shows.
        </h1>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/onboarding/basics?path=paste"
            className={`${primaryButtonClass} px-5 py-3 text-center text-base`}
          >
            I&rsquo;ve already got notes on them
          </Link>
          <Link
            href="/onboarding/basics?path=questions"
            className={`${secondaryButtonClass} px-5 py-3 text-center text-base`}
          >
            Starting fresh
          </Link>
        </div>
      </div>
    </OnboardingShell>
  );
}
