import { PlanningSession } from "./PlanningSession";

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ occasion?: string; date?: string; plan?: string }>;
}) {
  const { occasion, date, plan } = await searchParams;
  const planId = plan ? Number(plan) : undefined;

  return (
    <div className="mx-auto -mt-4 max-w-5xl">
      <PlanningSession occasion={occasion} date={date} planId={planId} />
    </div>
  );
}
