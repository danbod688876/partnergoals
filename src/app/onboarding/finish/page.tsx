import Link from "next/link";
import { OnboardingShell } from "@/components/OnboardingShell";
import { primaryButtonClass } from "@/components/ui";

export default function OnboardingFinishPage() {
  return (
    <OnboardingShell>
      <div className="text-center">
        <h1 className="font-serif text-2xl leading-snug text-ink-800">
          That&rsquo;s a great start — we&rsquo;ll help you remember the rest.
        </h1>
        <Link href="/notifications?scan=1" className={`${primaryButtonClass} mt-8 inline-block px-6 py-3`}>
          Take me in
        </Link>
      </div>
    </OnboardingShell>
  );
}
