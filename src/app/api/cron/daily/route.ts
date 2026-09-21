import { NextRequest, NextResponse } from "next/server";
import { runDailyKeyDateCheck } from "@/lib/notifications";
import { runRestaurantOpeningScan, runRestaurantSurfaceCheck } from "@/lib/restaurants";
import { runProfileGapCheck } from "@/lib/profile-gaps";

export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const [keyDates, restaurantSurface, restaurantOpenings, profileGap] = await Promise.all([
    runDailyKeyDateCheck(),
    runRestaurantSurfaceCheck(),
    runRestaurantOpeningScan(),
    runProfileGapCheck(),
  ]);

  return NextResponse.json({ keyDates, restaurantSurface, restaurantOpenings, profileGap });
}
