import { OnboardingShell } from "@/components/OnboardingShell";
import { Card, inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { saveBasics } from "../actions";

export default async function OnboardingBasicsPage({
  searchParams,
}: {
  searchParams: Promise<{ path?: string }>;
}) {
  const { path } = await searchParams;

  return (
    <OnboardingShell>
      <h1 className="mb-1 text-center font-serif text-2xl text-ink-800">Who are we getting to know?</h1>
      <p className="mb-6 text-center text-sm text-ink-400">Just the basics for now.</p>

      <Card>
        <form action={saveBasics} className="space-y-5">
          <input type="hidden" name="path" value={path === "paste" ? "paste" : "questions"} />

          <div>
            <label className={labelClass} htmlFor="name">
              Their name
            </label>
            <input id="name" name="name" required autoFocus className={inputClass} />
          </div>

          <div>
            <label className={labelClass} htmlFor="pronouns">
              Pronouns
            </label>
            <select id="pronouns" name="pronouns" defaultValue="they_them" className={inputClass}>
              <option value="she_her">She / her</option>
              <option value="he_him">He / him</option>
              <option value="they_them">They / them</option>
            </select>
          </div>

          <button type="submit" className={`${primaryButtonClass} w-full py-2.5`}>
            Continue
          </button>
        </form>
      </Card>
    </OnboardingShell>
  );
}
