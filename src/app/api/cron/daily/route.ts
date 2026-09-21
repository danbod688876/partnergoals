import { NextRequest, NextResponse } from "next/server";
import { runDailyKeyDateCheck } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await runDailyKeyDateCheck();
  return NextResponse.json(result);
}
