import { PlanningSession } from "./PlanningSession";

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ occasion?: string; date?: string }>;
}) {
  const { occasion, date } = await searchParams;

  return (
    <div className="mx-auto -mt-4 max-w-5xl">
      <PlanningSession occasion={occasion} date={date} />
    </div>
  );
}
