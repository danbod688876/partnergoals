import { runDailyKeyDateCheck } from "@/lib/notifications";
import { runRestaurantOpeningScan, runRestaurantSurfaceCheck } from "@/lib/restaurants";
import { runProfileGapCheck } from "@/lib/profile-gaps";
import { runCadenceNudgeCheck } from "@/lib/cadence-nudge";

// The one place that knows about every scan type, so both the daily cron
// and an on-demand trigger (e.g. right after onboarding finishes) run the
// exact same checks.
export async function runFullScan() {
  const [keyDates, restaurantSurface, restaurantOpenings, profileGap, cadenceNudge] =
    await Promise.all([
      runDailyKeyDateCheck(),
      runRestaurantSurfaceCheck(),
      runRestaurantOpeningScan(),
      runProfileGapCheck(),
      runCadenceNudgeCheck(),
    ]);

  return { keyDates, restaurantSurface, restaurantOpenings, profileGap, cadenceNudge };
}
