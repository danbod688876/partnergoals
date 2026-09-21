import { NextResponse } from "next/server";
import { runFullScan } from "@/lib/scan-engine";

// On-demand full scan (e.g. right after onboarding finishes, so a new
// profile doesn't start with an empty Notifications feed). No CRON_SECRET
// here — this route sits behind the app's normal cookie auth middleware
// like every other page, unlike /api/cron/daily which Vercel Cron calls
// without a browser session.
export async function POST() {
  const result = await runFullScan();
  return NextResponse.json(result);
}
