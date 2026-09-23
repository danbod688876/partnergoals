import { redirect } from "next/navigation";
import { hasCompletedOnboarding } from "@/lib/onboarding";

export default async function RootPage() {
  const onboarded = await hasCompletedOnboarding();
  redirect(onboarded ? "/planning" : "/onboarding");
}
